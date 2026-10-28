import type {
  ReviewNote,
  ReviewRequest,
  Booking,
  BrokerEntity,
  Department,
  FollowUp,
  Lead,
  LeadStatus,
  NotBoughtRecord,
  Visit,
  User,
} from "../types/crm";
import { addToDate, buildPostSaleSchedule } from "../lib/postSale";
import { today, departmentNames } from "../lib/presentation";
import type { NotBoughtReasonId } from "../lib/notBought";
import {
  initialUsers,
  initialLeads,
  initialVisits,
  initialFollowUps,
  initialBookings,
  initialTimelineEvents,
  initialPurchaseInvoices,
  initialBrokers,
} from "./initialData";

const base = {
  active: true,
  createdAt: "2025-01-01T08:00:00Z",
  phone: "01000000000",
} as const;

// One demo account per permission profile, so the director can use "View As"
// to see the system through every role.
export const demoStaffExtras: User[] = [
  {
    ...base,
    id: "usr-demo-manager",
    name: "ماجد شلبي (صاحب البيزنس)",
    email: "manager@demo.shalaby",
    role: "general_manager",
  },
  {
    ...base,
    id: "usr-demo-regional",
    name: "هشام عادل (مدير المبيعات العام)",
    email: "regional@demo.shalaby",
    role: "regional_manager",
    supervisedBranchIds: ["br-cairo", "br-giza"],
  },
  {
    ...base,
    id: "usr-demo-sup-sales",
    name: "نادين سامي (مشرف مختص · مبيعات)",
    email: "sup.sales@demo.shalaby",
    role: "supervisor",
    specialty: "sales",
    branchId: "br-cairo",
    supervisedBranchIds: ["br-cairo", "br-alex"],
  },
  {
    ...base,
    id: "usr-demo-sup-accounts",
    name: "طارق منير (مشرف مختص · حسابات)",
    email: "sup.accounts@demo.shalaby",
    role: "supervisor",
    specialty: "accounts",
    branchId: "br-cairo",
    supervisedBranchIds: ["br-cairo", "br-giza"],
  },
  {
    ...base,
    id: "usr-demo-sup-ops",
    name: "إيهاب رشدي (مشرف مختص · تشغيل الفروع)",
    email: "sup.ops@demo.shalaby",
    role: "supervisor",
    specialty: "operations",
    branchId: "br-giza",
    supervisedBranchIds: ["br-giza", "br-alex"],
  },
];

const agent = (
  id: string,
  name: string,
  branchId: string,
  branchName: string,
): User => ({
  ...base,
  id,
  name,
  email: `${id}@demo.shalaby`,
  role: "sales_agent",
  branchId,
  branchName,
});

export const demoAgents: User[] = [
  agent("usr-demo-agent-alex-2", "هدى سامي (مبيعات الإسكندرية)", "br-alex", "فرع الإسكندرية - معرض الدهانات"),
  agent("usr-demo-agent-giza-1", "أيمن رأفت (مبيعات الجيزة)", "br-giza", "فرع الجيزة"),
  agent("usr-demo-agent-giza-2", "سلمى وائل (مبيعات الجيزة)", "br-giza", "فرع الجيزة"),
];

// The business model: an owner, a general sales manager, and one sales manager per branch who sells for it.
// Every customer, visit and follow-up in the sample data belongs to the sales manager of its branch.
const modelRoles: User["role"][] = ["general_manager", "regional_manager", "branch_manager"];
export const demoUsers: User[] = [...initialUsers.filter((u) => u.role !== "admin"), ...demoStaffExtras, ...demoAgents].filter((u) =>
  modelRoles.includes(u.role),
);
/**
 * Every employee any version of the sample data ever created (managers, and the old salespeople, supervisors and
 * team leaders too). Older versions saved them without the sample flag, so removal recognises them by id.
 * The sample developer is left out: a real developer account may share its id.
 */
export const allSampleUsers: User[] = [...initialUsers.filter((u) => u.role !== "admin"), ...demoStaffExtras, ...demoAgents];
const managerOf: Record<string, User> = Object.fromEntries(demoUsers.filter((u) => u.role === "branch_manager").map((u) => [u.branchId!, u]));
// Old salespeople and supervisors in the sample set map to their branch's sales manager.
const toManager: Record<string, User> = Object.fromEntries(
  [...initialUsers, ...demoStaffExtras, ...demoAgents]
    .filter((u) => !modelRoles.includes(u.role) && u.role !== "admin" && u.branchId && managerOf[u.branchId])
    .map((u) => [u.id, managerOf[u.branchId!]]),
);
const ID_NAME: [string, string][] = [
  ["assignedAgentId", "assignedAgentName"],
  ["receivedByAgentId", "receivedByAgentName"],
  ["agentId", "agentName"],
  ["followUpAgentId", ""],
  ["authorId", "authorName"],
  ["leadOwnerId", ""],
];
function modelled<T extends object>(item: T): T {
  const out = { ...item } as Record<string, unknown>;
  for (const [idKey, nameKey] of ID_NAME) {
    const m = toManager[out[idKey] as string];
    if (!m) continue;
    out[idKey] = m.id;
    if (nameKey) out[nameKey] = m.name;
  }
  return out as T;
}
// ---------------------------------------------------------------------------
// Scenario customers: every row is a different story so each screen has
// something to show (big buyers, garden-only, partial buys, delivered work with
// ratings, lost customers with reasons, broker-led business, overdue follow-ups).
// ---------------------------------------------------------------------------
type Amounts = Partial<Record<Department, number>>;
interface Purchase {
  ago: number; // days ago
  amounts: Amounts;
  deliveredAgo?: number;
  cancelled?: boolean;
  rate?: { stars: number; comment?: string; referral?: string };
}
interface Row {
  name: string;
  branch: "br-cairo" | "br-alex" | "br-giza";
  agent: string;
  dept: Department;
  status?: LeadStatus;
  broker?: string;
  source?: Lead["source"];
  story: string;
  purchases?: Purchase[];
  notBought?: { reasons: NotBoughtReasonId[]; other?: string; note?: string; ago: number };
  followUpIn?: number; // days from today (negative = overdue)
  ratings?: { location: number; treatment: number; price: number };
}

const branchName: Record<string, string> = {
  "br-cairo": "فرع القاهرة - المقر الرئيسي",
  "br-alex": "فرع الإسكندرية - معرض الدهانات",
  "br-giza": "فرع الجيزة",
};
const A = {
  c1: "usr-agent-cairo-1",
  c2: "usr-agent-cairo-2",
  a1: "usr-agent-alex-1",
  a2: "usr-demo-agent-alex-2",
  g1: "usr-demo-agent-giza-1",
  g2: "usr-demo-agent-giza-2",
};
const B = {
  office: "brk-demo-1",
  contractor: "brk-demo-2",
  designer: "brk-demo-3",
  painter: "brk-demo-4",
  agency: "brk-demo-5",
};

export const demoExtraBrokers: BrokerEntity[] = [
  { id: B.office, name: "م. هشام للاستشارات الهندسية", type: "engineering_company", phone: "01011110001", active: true, notes: "مكتب هندسي، أغلب مشاريعه فلل وكمبوندات", totalReferrals: 0, totalVolume: 0 },
  { id: B.contractor, name: "مقاولات النصر", type: "contractor", phone: "01011110002", active: true, notes: "مقاول تشطيبات، بياخد من الإنشائي والدهانات", totalReferrals: 0, totalVolume: 0 },
  { id: B.designer, name: "م. دينا فؤاد (مصممة ديكور)", type: "individual", phone: "01011110003", active: true, notes: "بتجيب عملاء ديكور راقي", totalReferrals: 0, totalVolume: 0 },
  { id: B.painter, name: "المعلم أبو يوسف (نقاش)", type: "individual", phone: "01011110004", active: true, notes: "بيجيب عملاء كتير بس بمبالغ صغيرة", totalReferrals: 0, totalVolume: 0 },
  { id: B.agency, name: "الواحة للتسويق العقاري", type: "company", phone: "01011110005", active: true, notes: "جابت عملاء كتير، التحويل لشراء ضعيف", totalReferrals: 0, totalVolume: 0 },
];

const k = 1000;
const rows: Row[] = [
  // --- كبار المشترين
  { name: "المهندس طارق السويدي", branch: "br-cairo", agent: A.c1, dept: "garden", broker: B.office, status: "booked", story: "كبير جدًا: مليون جنيه موزعة على بستان وديكور وخدمات، وتم التسليم وراضي جدًا",
    purchases: [{ ago: 70, amounts: { garden: 500 * k, decor: 250 * k, general: 250 * k }, deliveredAgo: 40, rate: { stars: 5, comment: "شغل ممتاز والتسليم في ميعاده", referral: "أخوه عنده فيلا في التجمع ومحتاج بستان" } }],
    ratings: { location: 5, treatment: 5, price: 4 } },
  { name: "شركة العمران للمقاولات", branch: "br-cairo", agent: A.c2, dept: "construction", broker: B.contractor, status: "booked", story: "شركة مقاولات: إنشائي بالأساس، وبتشتري على دفعات",
    purchases: [{ ago: 120, amounts: { construction: 600 * k, general: 50 * k }, deliveredAgo: 90, rate: { stars: 4, comment: "جودة كويسة" } }, { ago: 30, amounts: { construction: 450 * k } }],
    ratings: { location: 4, treatment: 5, price: 3 } },
  { name: "الحاج منصور عبد الغني", branch: "br-giza", agent: A.g1, dept: "garden", broker: B.office, status: "booked", story: "لاند سكيب لمزرعة: كله بستان تقريبًا",
    purchases: [{ ago: 55, amounts: { garden: 780 * k, general: 20 * k }, deliveredAgo: 20 }] },
  { name: "كمبوند الياسمين (إدارة المشروع)", branch: "br-giza", agent: A.g2, dept: "decor", broker: B.designer, status: "booked", story: "مشروع ديكور وبستان لكمبوند صغير، تسليم جزئي",
    purchases: [{ ago: 45, amounts: { decor: 380 * k, garden: 220 * k } }] },
  // --- متوسطين
  { name: "د. منى الشافعي", branch: "br-cairo", agent: A.c1, dept: "decor", broker: B.designer, status: "booked", story: "ديكور فقط، تم التسليم وتقييم 5",
    purchases: [{ ago: 80, amounts: { decor: 140 * k }, deliveredAgo: 60, rate: { stars: 5, comment: "ذوق رائع", referral: "صديقتها منى محتاجة ديكور عيادة" } }], ratings: { location: 5, treatment: 5, price: 5 } },
  { name: "أحمد فتحي", branch: "br-alex", agent: A.a1, dept: "decor", status: "booked", story: "اشترى غرفة واحدة بس وساب باقي الشقة (فرصة بيع مفتوحة)",
    purchases: [{ ago: 25, amounts: { decor: 45 * k } }], notBought: { reasons: ["price", "postponed"], note: "هيكمل باقي الشقة بعد ما يستلم مرتبه", ago: 24 }, followUpIn: 5 },
  { name: "شيماء عبد الحميد", branch: "br-alex", agent: A.a2, dept: "garden", broker: B.painter, status: "booked", story: "بستان صغير لفيلا، تقييم متوسط على السعر",
    purchases: [{ ago: 65, amounts: { garden: 95 * k }, deliveredAgo: 45, rate: { stars: 3, comment: "الشغل حلو بس السعر عالي شوية" } }], ratings: { location: 4, treatment: 4, price: 2 } },
  { name: "عمرو الدسوقي", branch: "br-cairo", agent: A.c2, dept: "construction", broker: B.contractor, status: "booked", story: "تأسيس وتشطيب شقة، سحب إنشائي وبعدين ديكور",
    purchases: [{ ago: 100, amounts: { construction: 210 * k }, deliveredAgo: 70, rate: { stars: 4 } }, { ago: 35, amounts: { decor: 85 * k } }] },
  { name: "وليد صبحي", branch: "br-giza", agent: A.g1, dept: "general", status: "booked", story: "خدمات أخرى فقط (صيانة وتركيبات)",
    purchases: [{ ago: 40, amounts: { general: 60 * k }, deliveredAgo: 30, rate: { stars: 2, comment: "اتأخروا في التسليم", referral: "" } }], ratings: { location: 3, treatment: 2, price: 3 } },
  { name: "نهى جمال", branch: "br-cairo", agent: A.c1, dept: "decor", broker: B.office, status: "booked", story: "عميلة متكررة: اشترت 3 مرات خلال السنة",
    purchases: [{ ago: 200, amounts: { decor: 30 * k } }, { ago: 120, amounts: { decor: 55 * k, garden: 15 * k } }, { ago: 20, amounts: { decor: 70 * k } }] },
  // --- وسيط ضعيف التحويل (جاب ناس كتير واشتروا قليل)
  { name: "إبراهيم الغنيمي", branch: "br-alex", agent: A.a1, dept: "decor", broker: B.agency, status: "booked", story: "من الوسيط الضعيف: اشترى مبلغ صغير",
    purchases: [{ ago: 50, amounts: { decor: 18 * k } }] },
  { name: "سمر حسني", branch: "br-giza", agent: A.g2, dept: "decor", broker: B.agency, status: "interested", story: "جاية من وسيط، لسه بتقارن", notBought: { reasons: ["comparing"], ago: 6 }, followUpIn: 1 },
  { name: "ياسر قنديل", branch: "br-cairo", agent: A.c2, dept: "garden", broker: B.agency, status: "not_interested", story: "جاي من وسيط، اشترى من منافس", notBought: { reasons: ["competitor"], note: "قال لقى سعر أقل بنفس المواصفات", ago: 14 } },
  { name: "هبة الله مجدي", branch: "br-alex", agent: A.a2, dept: "decor", broker: B.agency, status: "contacted", story: "جاية من وسيط ومجرد استفسار", notBought: { reasons: ["just_asking"], ago: 9 } },
  { name: "مصطفى رزق", branch: "br-giza", agent: A.g1, dept: "construction", broker: B.agency, status: "new", story: "جاي من وسيط، لسه ما اتواصلش معاه", followUpIn: -3 },
  // --- نقاش بيجيب كتير بمبالغ صغيرة
  { name: "علاء الشناوي", branch: "br-cairo", agent: A.c1, dept: "decor", broker: B.painter, status: "booked", story: "من النقاش: عملية صغيرة", purchases: [{ ago: 18, amounts: { decor: 12 * k } }] },
  { name: "سيد حجازي", branch: "br-alex", agent: A.a1, dept: "decor", broker: B.painter, status: "booked", story: "من النقاش: عملية صغيرة", purchases: [{ ago: 33, amounts: { decor: 9 * k, general: 3 * k } }] },
  { name: "محمود زيدان", branch: "br-giza", agent: A.g2, dept: "decor", broker: B.painter, status: "booked", story: "من النقاش: عملية صغيرة", purchases: [{ ago: 12, amounts: { decor: 15 * k } }] },
  // --- زوار ما اشتروش: أسباب مختلفة
  { name: "رانيا عادل", branch: "br-cairo", agent: A.c2, dept: "decor", status: "needs_followup", story: "السعر عالي عندها", notBought: { reasons: ["price"], note: "عايزة خصم أو تقسيط من الحسابات", ago: 3 }, followUpIn: 2 },
  { name: "خالد بسيوني", branch: "br-cairo", agent: A.c1, dept: "garden", status: "needs_followup", story: "محتاج موافقة الشريك", notBought: { reasons: ["needs_approval"], ago: 4 }, followUpIn: 0 },
  { name: "مي سليمان", branch: "br-alex", agent: A.a2, dept: "decor", status: "uncontacted", story: "اللون مش متوفر", notBought: { reasons: ["unavailable"], note: "طلبت درجة لون معينة", ago: 7 }, followUpIn: -2 },
  { name: "حسام لطفي", branch: "br-giza", agent: A.g1, dept: "garden", status: "needs_followup", story: "السبب مجهول، متابعة مجدولة بسؤال للعميل", notBought: { reasons: ["unknown"], ago: 2 }, followUpIn: 0 },
  { name: "دعاء عصام", branch: "br-alex", agent: A.a1, dept: "decor", status: "contacted", story: "سبب آخر مكتوب بخط اليد", notBought: { reasons: ["other"], other: "مسافرة ومش هتبدأ قبل الصيف", ago: 11 } },
  { name: "باسم عوض", branch: "br-giza", agent: A.g2, dept: "construction", status: "not_interested", story: "الفرع بعيد عليه", notBought: { reasons: ["service", "comparing"], ago: 16 } },
  // --- متابعات وفرص
  { name: "ليلى فاروق", branch: "br-cairo", agent: A.c1, dept: "decor", status: "interested", story: "مهتمة جدًا، متابعة متأخرة 4 أيام", followUpIn: -4 },
  { name: "عبد الرحمن نصار", branch: "br-giza", agent: A.g2, dept: "garden", status: "prospect", story: "فرصة بيع كبيرة محتملة (بستان)", followUpIn: 1 },
  { name: "إيمان الصاوي", branch: "br-alex", agent: A.a2, dept: "decor", status: "new", story: "عميل جديد من فيسبوك، لسه ما اتتابعش", source: "facebook", followUpIn: -1 },
  { name: "كريم السيد", branch: "br-cairo", agent: A.c2, dept: "construction", status: "new", story: "عميل جديد من الزيارة المباشرة", source: "walk_in" },
  // --- حالات خاصة
  { name: "فادي ميخائيل", branch: "br-giza", agent: A.g1, dept: "decor", status: "contacted", story: "اتلغت عمليته (حجز ملغي)", purchases: [{ ago: 22, amounts: { decor: 120 * k }, cancelled: true }], notBought: { reasons: ["competitor"], ago: 21 } },
  { name: "سلوى محسن", branch: "br-cairo", agent: A.c1, dept: "garden", broker: B.office, status: "booked", story: "تسليم النهارده: كل متابعات بعد البيع لسه جاية",
    purchases: [{ ago: 40, amounts: { garden: 160 * k, decor: 40 * k }, deliveredAgo: 0 }] },
  { name: "وائل الجندي", branch: "br-alex", agent: A.a1, dept: "decor", broker: B.designer, status: "booked", story: "اتسلم من 8 أيام: متابعة الأسبوع مستحقة الآن",
    purchases: [{ ago: 30, amounts: { decor: 98 * k }, deliveredAgo: 8 }] },
  { name: "ندى الكيلاني", branch: "br-giza", agent: A.g2, dept: "garden", broker: B.contractor, status: "booked", story: "اتسلم من 200 يوم: متابعة الـ6 شهور جاية قريب",
    purchases: [{ ago: 230, amounts: { garden: 175 * k }, deliveredAgo: 175, rate: { stars: 5, comment: "الجنينة بقت تحفة", referral: "جارتها مهتمة بنفس الشغل" } }], ratings: { location: 5, treatment: 5, price: 4 } },
];

const iso = (daysAgo: number) => addToDate(today(), { days: -daysAgo });
const status = (date: string): FollowUp["status"] =>
  date < today() ? "overdue" : date === today() ? "due" : "upcoming";

const gen = {
  leads: [] as Lead[],
  visits: [] as Visit[],
  bookings: [] as Booking[],
  followUps: [] as FollowUp[],
  notBought: [] as NotBoughtRecord[],
};

rows.forEach((r, i) => {
  const id = `demo-lead-${i + 1}`;
  const phone = `0100${String(2000000 + i * 137).padStart(7, "0")}`;
  const firstSeen = Math.max(
    ...(r.purchases?.map((p) => p.ago) ?? [10]),
    r.notBought?.ago ?? 0,
    5,
  ) + 3;
  const manager = managerOf[r.branch];
  const agentName = manager.name;
  const lead: Lead = {
    id,
    name: r.name,
    phone,
    whatsappPhone: phone,
    isSameWhatsApp: true,
    source: r.source ?? (r.broker ? "referral" : "walk_in"),
    branchId: r.branch,
    branchName: branchName[r.branch],
    assignedAgentId: manager.id,
    assignedAgentName: agentName,
    createdAt: `${iso(firstSeen)}T10:00:00.000Z`,
    status: r.status ?? "new",
    classification: "B",
    department: r.dept,
    departmentName: undefined,
    notes: `[سيناريو] ${r.story}`,
    brokerId: r.broker,
    brokerName: r.broker ? [...demoExtraBrokers, ...initialBrokers].find((b) => b.id === r.broker)?.name : undefined,
    ...(r.ratings
      ? { locationRating: r.ratings.location, treatmentRating: r.ratings.treatment, priceRating: r.ratings.price }
      : {}),
  };

  gen.visits.push({
    id: `demo-visit-${i + 1}`,
    visitorName: r.name,
    phone,
    date: iso(firstSeen),
    time: "12:30",
    branchId: r.branch,
    branchName: branchName[r.branch],
    receivedByAgentId: manager.id,
    receivedByAgentName: agentName,
    source: lead.source,
    department: r.dept,
    reason: "استفسار وزيارة معرض",
    outcome: r.purchases?.length ? "تم الشراء" : "لسه",
    notes: "",
    hasPreviousRecord: true,
    linkedLeadId: id,
    requiresFollowUp: !r.purchases?.length,
  });

  r.purchases?.forEach((p, j) => {
    const total = Object.values(p.amounts).reduce((s, v) => s + (v || 0), 0);
    const primary = (Object.entries(p.amounts).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0][0]) as Department;
    const bid = `demo-booking-${i + 1}-${j + 1}`;
    // Buying means receiving: every purchase is delivered the day it is made.
    const delivered = p.cancelled ? undefined : iso(p.ago);
    gen.bookings.push({
      id: bid,
      leadId: id,
      leadName: r.name,
      leadPhone: phone,
      branchId: r.branch,
      branchName: branchName[r.branch],
      agentId: manager.id,
      agentName,
      department: primary,
      courseId: Object.keys(p.amounts).length > 1 ? "ps-multi" : `ps-${primary}`,
      courseName: Object.keys(p.amounts)
        .map((d) => departmentNames[d as Department])
        .join(" + "),
      bookingDate: iso(p.ago),
      amount: total,
      departmentAmounts: p.amounts,
      bookingStatus: p.cancelled ? "cancelled" : delivered ? "completed" : "confirmed",
      source: lead.source,
      notes: "",
      createdAt: `${iso(p.ago)}T12:00:00.000Z`,
      ...(delivered ? { deliveredAt: delivered } : {}),
    });
    if (delivered) {
      buildPostSaleSchedule(delivered).forEach((m, n) => {
        const done = !!p.rate && n === 0 && m.date <= today();
        const fid = `demo-flw-${i + 1}-${j + 1}-${m.milestone}`;
        gen.followUps.push({
          id: fid,
          leadId: id,
          leadName: r.name,
          leadPhone: phone,
          assignedAgentId: manager.id,
          assignedAgentName: agentName,
          branchId: r.branch,
          scheduledAt: m.date,
          reason: m.reason,
          type: "call",
          notes: "",
          status: done ? "completed" : status(m.date),
          category: "post_sale",
          bookingId: bid,
          milestone: m.milestone,
          ...(done
            ? {
                outcomeResult: "تم التواصل مع العميل",
                completedAt: `${m.date}T11:00:00.000Z`,
                satisfactionRating: p.rate!.stars,
                satisfactionComment: p.rate!.comment || undefined,
                referralNote: p.rate!.referral || undefined,
              }
            : {}),
        });
        if (done) {
          lead.customerRatingStars = p.rate!.stars;
          lead.customerRatingComment = p.rate!.comment;
          lead.hasSubmittedRating = true;
        }
      });
    }
  });

  if (r.notBought) {
    gen.notBought.push({
      id: `demo-nb-${i + 1}`,
      leadId: id,
      leadName: r.name,
      branchId: r.branch,
      agentId: manager.id,
      agentName,
      createdAt: `${iso(r.notBought.ago)}T14:00:00.000Z`,
      reasons: r.notBought.reasons,
      otherText: r.notBought.other,
      note: r.notBought.note,
    });
  }
  if (r.followUpIn !== undefined) {
    const date = addToDate(today(), { days: r.followUpIn });
    gen.followUps.push({
      id: `demo-flw-sales-${i + 1}`,
      leadId: id,
      leadName: r.name,
      leadPhone: phone,
      assignedAgentId: manager.id,
      assignedAgentName: agentName,
      branchId: r.branch,
      scheduledAt: date,
      reason: r.notBought?.reasons.includes("unknown")
        ? "اسأل العميل بلطف: إيه اللي خلاك ما كملتش الشراء؟ (السعر؟ منافس؟ مش وقته؟)"
        : r.purchases?.length
          ? "متابعة لاستكمال باقي الشغل"
          : "متابعة بعد الزيارة",
      type: "call",
      notes: "",
      status: status(date),
      category: "sales",
    });
    lead.nextFollowUpDate = date;
  }
  gen.leads.push(lead);
});

export const demoLeads: Lead[] = [...initialLeads.map(modelled), ...gen.leads];
export const demoVisits = [...initialVisits.map(modelled), ...gen.visits];
export const demoFollowUps = [...initialFollowUps.map(modelled), ...gen.followUps];
export const demoBookings = [...initialBookings.map(modelled), ...gen.bookings];
export const demoNotBought: NotBoughtRecord[] = gen.notBought;
export const demoTimeline = initialTimelineEvents.map(modelled);
export const demoInvoices = initialPurchaseInvoices.map(modelled);
export const demoBrokers = [...initialBrokers, ...demoExtraBrokers];

// A spread of review situations: answered with praise, a fresh complaint, a handled complaint, waiting, due for the 48h nudge, expired.
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const reviewFor = (i: number, over: Partial<ReviewRequest>): ReviewRequest => {
  const lead = demoLeads[i % demoLeads.length];
  return {
    id: `demoreview${String(i).padStart(2, "0")}${"x".repeat(14)}`,
    leadId: lead.id,
    leadName: lead.name,
    branchId: lead.branchId,
    branchName: lead.branchName,
    agentId: lead.assignedAgentId || "",
    agentName: lead.assignedAgentName,
    subjectKind: "general",
    subjectLabel: "تجربتك مع شلبي",
    sentAt: hoursAgo(30),
    status: "sent",
    ...over,
  };
};
export const demoReviews: ReviewRequest[] = [
  reviewFor(0, { status: "answered", answeredAt: hoursAgo(20), response: { rating: 5, treatment: 5, price: 4, quality: 5, wouldRecommend: true, comment: "تعامل محترم والشغل ممتاز، هرشحكم لأصحابي.", referral: { name: "أحمد (قريب العميل)", phone: "01155500123" } }, ai: { kind: "praise", category: "تعامل الموظف", severity: "low", summary: "العميل راضي جدًا وهيرشحنا." } }),
  reviewFor(1, { status: "answered", answeredAt: hoursAgo(3), isComplaint: true, response: { rating: 2, treatment: 2, price: 3, quality: 2, wouldRecommend: false, comment: "الفني اتأخر 3 أيام عن الميعاد ومحدش كلمني يعتذر." }, ai: { kind: "complaint", category: "تأخير", severity: "high", summary: "تأخر الفني 3 أيام من غير أي اعتذار." } }),
  reviewFor(2, { status: "answered", answeredAt: hoursAgo(90), response: { rating: 3, treatment: 4, price: 2, quality: 4, comment: "الأسعار أعلى من اللي توقعته." }, ai: { kind: "note", category: "السعر", severity: "low", summary: "العميل شايف الأسعار عالية." } }),
  reviewFor(3, { sentAt: hoursAgo(5) }),
  reviewFor(4, { sentAt: hoursAgo(60) }),
  reviewFor(5, { sentAt: hoursAgo(130), reminderSentAt: hoursAgo(70) }),
  reviewFor(6, { status: "answered", answeredAt: hoursAgo(50), response: { rating: 1, comment: "" } }),
];
export const demoReviewNotes: ReviewNote[] = [];
