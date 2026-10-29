import type { Booking, FollowUp, FollowUpPriority, FollowUpType, Lead, PurchaseLine, Quote, User } from "../types/crm";
import { defaultTerms, QUOTE_FOLLOWUP_DAYS } from "./quotes";
import { isSalesCapable } from "./permissions";
import { cleanLines, describeLine, grandTotal, productsLabel } from "./purchaseLines";
import { phoneKey } from "./referrals";

/**
 * What Shalaby may do for the user: register a customer and record a sale. The model only PREPARES an action;
 * nothing is saved until the person confirms it (a button, or a plain "تمام" typed in the chat). The confirmation is
 * recognised here, in code, so a model can never confirm on its own behalf.
 */
export type ActionKind = "customer" | "sale" | "quote" | "quote_status" | "followup" | "followup_done" | "followup_move" | "note" | "target" | "reassign";

export interface PendingAction {
  id: string;
  kind: ActionKind;
  /** The existing customer a sale is for. */
  leadId?: string;
  /** The customer to register (alone, or together with the sale). */
  newCustomer?: { name: string; phone: string; notes?: string };
  customerName: string;
  lines: PurchaseLine[];
  total: number;
  note?: string;
  /** YYYY-MM-DD */
  date: string;
  /** Short lines shown to the person before they confirm. */
  summary: string[];
  quote?: { addressedTo?: string; terms: string[]; send: boolean };
  quoteId?: string;
  quoteStatus?: "sent" | "lost" | "accepted";
  reason?: string;
  followUp?: { id?: string; date?: string; time?: string; reason?: string; type?: FollowUpType; priority?: FollowUpPriority; result?: string; nextDate?: string };
  target?: { userId: string; userName: string; month: string; amount: number };
  reassign?: { toUserId: string; toName: string };
}

/** What the planners may look at: only rows the signed-in person can already see. */
export interface PlanData {
  leads: Lead[];
  quotes: Quote[];
  followUps: FollowUp[];
  users: User[];
  today: string;
  me: { id: string; name: string };
}

type Args = Record<string, unknown>;
export type Plan = { ok: true; action: PendingAction } | { ok: false; result: Record<string, unknown> };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const validPhone = (p: string) => phoneKey(p).length >= 10;
const brief = (l: Lead) => ({ id: l.id, name: l.name, phone: l.phone });

export type Resolved = { kind: "found"; lead: Lead } | { kind: "ambiguous"; leads: Lead[] } | { kind: "none" };

/** The customer the user means: by id, then phone, then name (a part of it is enough). */
export function resolveCustomer(leads: Lead[], query: { id?: string; name?: string; phone?: string }): Resolved {
  if (query.id) {
    const byId = leads.find((l) => l.id === query.id);
    if (byId) return { kind: "found", lead: byId };
  }
  if (query.phone && validPhone(query.phone)) {
    const key = phoneKey(query.phone);
    const byPhone = leads.filter((l) => phoneKey(l.phone) === key || (l.whatsappPhone && phoneKey(l.whatsappPhone) === key));
    if (byPhone.length === 1) return { kind: "found", lead: byPhone[0] };
    if (byPhone.length > 1) return { kind: "ambiguous", leads: byPhone };
  }
  const name = query.name ? norm(query.name) : "";
  if (name) {
    const exact = leads.filter((l) => norm(l.name) === name);
    if (exact.length === 1) return { kind: "found", lead: exact[0] };
    const part = exact.length ? exact : leads.filter((l) => norm(l.name).includes(name));
    if (part.length === 1) return { kind: "found", lead: part[0] };
    if (part.length > 1) return { kind: "ambiguous", leads: part.slice(0, 8) };
  }
  return { kind: "none" };
}

/** Items the model sent, cleaned: a name and a value are required, and a count without a price is not enough. */
export function parseItems(raw: unknown): { lines: PurchaseLine[]; problem?: string } {
  if (!Array.isArray(raw) || !raw.length) return { lines: [], problem: "مفيش أصناف. اسأل المستخدم باع إيه وبكام." };
  const lines: PurchaseLine[] = [];
  for (const r of raw.slice(0, 30)) {
    const o = (r ?? {}) as Args;
    const name = str(o.name, 120);
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);
    const price = n(o.price);
    const qty = n(o.qty);
    const total = n(o.total);
    if (!name) return { lines: [], problem: "في صنف من غير اسم. اسأل المستخدم." };
    if (!price && !total) return { lines: [], problem: `سعر «${name}» مش واضح. اسأل المستخدم بكام.` };
    lines.push({ name, ...(price ? { price } : {}), ...(qty ? { qty } : {}), total: total ?? (price! * (qty ?? 1)) });
  }
  const kept = cleanLines(lines);
  return kept.length ? { lines: kept } : { lines: [], problem: "مفيش أصناف صالحة." };
}

let counter = 0;
const newId = () => `act-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function planCustomer(args: Args, leads: Lead[]): Plan {
  const name = str(args.name, 120);
  const phone = str(args.phone, 30);
  if (!name) return { ok: false, result: { status: "need_info", missing: "اسم العميل" } };
  if (!phone || !validPhone(phone)) return { ok: false, result: { status: "need_info", missing: "رقم موبايل العميل (10 أرقام على الأقل)" } };
  const same = resolveCustomer(leads, { phone });
  if (same.kind === "found") return { ok: false, result: { status: "already_exists", customer: brief(same.lead), hint: "العميل ده متسجل. اعرض بياناته واسأل لو عاوز يسجل له عملية بيع." } };
  if (same.kind === "ambiguous") return { ok: false, result: { status: "already_exists", customers: same.leads.map(brief) } };
  const notes = str(args.notes, 500);
  const action: PendingAction = {
    id: newId(),
    kind: "customer",
    newCustomer: { name, phone, ...(notes ? { notes } : {}) },
    customerName: name,
    lines: [],
    total: 0,
    date: "",
    summary: [`تسجيل عميل جديد: ${name}`, `الموبايل: ${phone}`, ...(notes ? [`ملاحظة: ${notes}`] : [])],
  };
  return { ok: true, action };
}

export function planSale(args: Args, leads: Lead[], today: string): Plan {
  const items = parseItems(args.items);
  if (items.problem) return { ok: false, result: { status: "need_info", missing: items.problem } };
  const date = isDate(args.date) ? args.date : today;
  if (date > today) return { ok: false, result: { status: "invalid", problem: "تاريخ البيع في المستقبل." } };
  const wanted = { id: str(args.customer_id), name: str(args.customer), phone: str(args.phone, 30) };
  const found = resolveCustomer(leads, wanted);
  const note = str(args.note, 300);
  const total = grandTotal(items.lines);
  const base = { id: newId(), kind: "sale" as const, lines: items.lines, total, ...(note ? { note } : {}), date };
  const lineSummary = items.lines.map(describeLine);
  const tail = [`الإجمالي: ${money(total)} ج.م`, ...(date !== today ? [`التاريخ: ${date}`] : []), ...(note ? [`ملاحظة: ${note}`] : [])];

  if (found.kind === "ambiguous") return { ok: false, result: { status: "ambiguous_customer", customers: found.leads.map(brief), hint: "اسأل المستخدم يحدد مين فيهم." } };
  if (found.kind === "found") {
    const lead = found.lead;
    return { ok: true, action: { ...base, leadId: lead.id, customerName: lead.name, summary: [`تسجيل عملية بيع للعميل ${lead.name} (${lead.phone})`, ...lineSummary, ...tail] } };
  }
  // Not registered: a phone number lets the same confirmation register the customer first.
  const name = wanted.name;
  if (!name) return { ok: false, result: { status: "need_info", missing: "اسم العميل" } };
  if (!wanted.phone || !validPhone(wanted.phone))
    return { ok: false, result: { status: "customer_not_found", customer: name, hint: "العميل مش متسجل. اسأل المستخدم عن رقم موبايله عشان يتسجل كعميل جديد مع عملية البيع." } };
  return {
    ok: true,
    action: { ...base, newCustomer: { name, phone: wanted.phone }, customerName: name, summary: [`تسجيل عميل جديد: ${name} (${wanted.phone})`, "وتسجيل عملية بيع له:", ...lineSummary, ...tail] },
  };
}

/** The booking a confirmed sale becomes, for a customer that exists. */
export function bookingFor(lead: Lead, a: Pick<PendingAction, "lines" | "total" | "note" | "date">, agentId: string): Omit<Booking, "id" | "createdAt"> {
  return {
    leadId: lead.id,
    leadName: lead.name,
    leadPhone: lead.phone,
    branchId: lead.branchId,
    agentId,
    department: "general",
    courseId: "ps-general",
    courseName: productsLabel(a.lines),
    lines: a.lines,
    bookingDate: a.date,
    amount: a.total,
    departmentAmounts: { general: a.total },
    bookingStatus: "confirmed",
    source: lead.source,
    notes: [a.note, "سُجّلت عن طريق شلبي"].filter(Boolean).join(" · "),
  };
}

const YES = new Set(["تمام", "سجل", "سجلها", "سجله", "اه", "ايوه", "ايوة", "اوك", "اوكي", "ok", "okay", "yes", "y", "موافق", "كمل", "نفذ", "اكيد", "ماشي", "تمم", "سجلهم"]);
const STRONG_NO = new Set(["لا", "لأ", "لاا", "الغي", "الغيها", "الغاء", "الغ", "بلاش", "cancel", "no", "n", "لغي", "ماتسجلش", "متسجلش", "وقف", "خلاص", "مش"]);
const NO = new Set([...STRONG_NO, "عايز", "عاوز", "اسجل", "اسجلها"]);
const words = (t: string) => norm(t).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

/** A short message that only says "yes, register it" (or "no"). Anything longer goes to the model as a normal message. */
export function confirmation(text: string): "yes" | "no" | null {
  const w = words(text);
  if (!w.length || w.length > 4) return null;
  if (w.every((x) => YES.has(x))) return "yes";
  if (w.every((x) => NO.has(x)) && w.some((x) => STRONG_NO.has(x))) return "no";
  return null;
}

// ---------- the other operations ----------
const empty = { lines: [] as PurchaseLine[], total: 0, date: "" };
const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const typeNames: Record<FollowUpType, string> = { call: "مكالمة", whatsapp: "واتساب", branch_visit: "زيارة فرع", email: "إيميل", meeting: "اجتماع" };
const priorityNames: Record<FollowUpPriority, string> = { high: "عالية", normal: "عادية", low: "منخفضة" };
const openFollowUp = (f: FollowUp) => f.status !== "completed" && f.status !== "cancelled";
const needInfo = (missing: string): Plan => ({ ok: false, result: { status: "need_info", missing } });
const customerFrom = (args: Args, leads: Lead[]) => resolveCustomer(leads, { id: str(args.customer_id), name: str(args.customer), phone: str(args.phone, 30) });
const askWhich = (found: Resolved): Plan | null =>
  found.kind === "ambiguous"
    ? { ok: false, result: { status: "ambiguous_customer", customers: found.leads.map(brief), hint: "اسأل المستخدم يحدد مين فيهم." } }
    : found.kind === "none"
      ? { ok: false, result: { status: "customer_not_found", hint: "العميل مش متسجل. لو عاوز تسجله استخدم prepare_customer الأول." } }
      : null;

export function planQuote(args: Args, d: PlanData): Plan {
  const items = parseItems(args.items);
  if (items.problem) return needInfo(items.problem);
  const found = customerFrom(args, d.leads);
  const stop = askWhich(found);
  if (stop) return stop;
  const lead = (found as Extract<Resolved, { kind: "found" }>).lead;
  const total = grandTotal(items.lines);
  const termsIn = Array.isArray(args.terms) ? args.terms.map((t) => str(t, 160)).filter((t): t is string => !!t).slice(0, 12) : [];
  const terms = termsIn.length ? termsIn : defaultTerms;
  const send = args.sent === true;
  const addressedTo = str(args.addressed_to, 120);
  return {
    ok: true,
    action: {
      id: newId(),
      kind: "quote",
      leadId: lead.id,
      customerName: lead.name,
      ...empty,
      lines: items.lines,
      total,
      quote: { ...(addressedTo ? { addressedTo } : {}), terms, send },
      summary: [`عرض سعر للعميل ${lead.name}`, ...items.lines.map(describeLine), `الإجمالي: ${money(total)} ج.م`, send ? `هيتعلّم إنه اتبعت وهتتجدول متابعة بعد ${QUOTE_FOLLOWUP_DAYS} أيام (لو مفيش متابعة مفتوحة).` : "هيتحفظ كمسودة (لسه ما اتبعتش)."],
    },
  };
}

const findQuote = (args: Args, quotes: Quote[]): { quote?: Quote; stop?: Plan } => {
  const id = str(args.quote_id);
  const number = str(args.quote);
  const customer = str(args.customer);
  let rows = quotes.filter((q) => q.status === "draft" || q.status === "sent");
  if (id) rows = rows.filter((q) => q.id === id);
  else if (number && /^Q-/i.test(number)) rows = rows.filter((q) => q.number.toLowerCase() === number.toLowerCase());
  else if (customer || number) rows = rows.filter((q) => norm(q.leadName).includes(norm(customer ?? number!)));
  else return { stop: needInfo("أنهي عرض سعر؟ (رقمه أو اسم العميل)") };
  if (!rows.length) return { stop: { ok: false, result: { status: "quote_not_found", hint: "مفيش عرض سعر مفتوح بالوصف ده. ممكن تستخدم list_quotes." } } };
  if (rows.length > 1) return { stop: { ok: false, result: { status: "ambiguous_quote", quotes: rows.slice(0, 8).map((q) => ({ id: q.id, number: q.number, customer: q.leadName, totalEGP: q.total, status: q.status })), hint: "اسأل المستخدم يحدد أنهي عرض." } } };
  return { quote: rows[0] };
};

export function planQuoteStatus(args: Args, d: PlanData): Plan {
  const status = args.status;
  if (status !== "sent" && status !== "lost" && status !== "accepted") return needInfo("الحالة الجديدة: اتبعت (sent) أو اتقبل (accepted) أو ما اتقبلش (lost)");
  const { quote, stop } = findQuote(args, d.quotes);
  if (stop) return stop;
  const q = quote!;
  if (status === "sent" && q.status === "sent") return { ok: false, result: { status: "invalid", problem: "العرض ده متعلّم إنه اتبعت قبل كده." } };
  const reason = str(args.reason, 200);
  const what = status === "sent" ? `هيتعلّم إنه اتبعت وهتتجدول متابعة بعد ${QUOTE_FOLLOWUP_DAYS} أيام (لو مفيش متابعة مفتوحة)` : status === "accepted" ? `العميل وافق: هيتسجّل بيع بنفس الأصناف والأسعار (${money(q.total)} ج.م)` : `العميل ما وافقش${reason ? `: ${reason}` : ""}`;
  return {
    ok: true,
    action: { id: newId(), kind: "quote_status", quoteId: q.id, quoteStatus: status, ...(reason ? { reason } : {}), customerName: q.leadName, ...empty, summary: [`عرض السعر ${q.number} للعميل ${q.leadName} (${money(q.total)} ج.م)`, what] },
  };
}

export function planFollowUp(args: Args, d: PlanData): Plan {
  const found = customerFrom(args, d.leads);
  const stop = askWhich(found);
  if (stop) return stop;
  const lead = (found as Extract<Resolved, { kind: "found" }>).lead;
  const date = args.date;
  if (!isDate(date)) return needInfo("ميعاد المتابعة (التاريخ)");
  if (date < d.today) return { ok: false, result: { status: "invalid", problem: "تاريخ المتابعة فات." } };
  const reason = str(args.reason, 200);
  if (!reason) return needInfo("سبب المتابعة");
  const time = isTime(args.time) ? args.time : undefined;
  const type = (Object.keys(typeNames) as FollowUpType[]).find((t) => t === args.type) ?? "call";
  const priority = (Object.keys(priorityNames) as FollowUpPriority[]).find((p) => p === args.priority) ?? "normal";
  return {
    ok: true,
    action: {
      id: newId(),
      kind: "followup",
      leadId: lead.id,
      customerName: lead.name,
      ...empty,
      followUp: { date, ...(time ? { time } : {}), reason, type, priority },
      summary: [`متابعة للعميل ${lead.name}`, `الموعد: ${date}${time ? ` الساعة ${time}` : ""} · ${typeNames[type]} · أولوية ${priorityNames[priority]}`, `السبب: ${reason}`],
    },
  };
}

const findFollowUp = (args: Args, d: PlanData, mineOnly: boolean): { followUp?: FollowUp; stop?: Plan } => {
  const id = str(args.follow_up_id);
  let rows = d.followUps.filter(openFollowUp).filter((f) => !mineOnly || f.assignedAgentId === d.me.id);
  if (id) rows = rows.filter((f) => f.id === id);
  else {
    const customer = str(args.customer);
    if (!customer) return { stop: needInfo("أنهي متابعة؟ (اسم العميل أو استخدم list_followups)") };
    rows = rows.filter((f) => norm(f.leadName).includes(norm(customer)));
  }
  if (!rows.length) return { stop: { ok: false, result: { status: "followup_not_found", hint: mineOnly ? "مفيش متابعة مفتوحة عليك بالوصف ده." : "مفيش متابعة مفتوحة بالوصف ده." } } };
  if (rows.length > 1) return { stop: { ok: false, result: { status: "ambiguous_followup", followUps: rows.slice(0, 8).map((f) => ({ id: f.id, customer: f.leadName, due: f.scheduledAt.slice(0, 10), reason: f.reason.slice(0, 80) })), hint: "اسأل المستخدم يحدد أنهي متابعة." } } };
  return { followUp: rows[0] };
};

export function planFollowUpDone(args: Args, d: PlanData): Plan {
  const { followUp: f, stop } = findFollowUp(args, d, true);
  if (stop) return stop;
  const result = str(args.result, 300);
  if (!result) return needInfo("إيه اللي حصل في المتابعة؟ (النتيجة)");
  const next = args.next_date;
  if (next !== undefined && next !== null && next !== "" && (!isDate(next) || next < d.today)) return { ok: false, result: { status: "invalid", problem: "ميعاد المتابعة الجاية مش صحيح." } };
  const nextDate = isDate(next) ? next : undefined;
  return {
    ok: true,
    action: {
      id: newId(),
      kind: "followup_done",
      leadId: f!.leadId,
      customerName: f!.leadName,
      ...empty,
      followUp: { id: f!.id, result, ...(nextDate ? { nextDate } : {}) },
      summary: [`إقفال متابعة العميل ${f!.leadName} (${f!.scheduledAt.slice(0, 10)}: ${f!.reason.slice(0, 60)})`, `النتيجة: ${result}`, nextDate ? `متابعة جاية: ${nextDate}` : "من غير متابعة جاية."],
    },
  };
}

export function planFollowUpMove(args: Args, d: PlanData, managerOk = false): Plan {
  const { followUp: f, stop } = findFollowUp(args, d, !managerOk);
  if (stop) return stop;
  const date = args.new_date;
  if (!isDate(date) || date < d.today) return needInfo("الميعاد الجديد (تاريخ مش فايت)");
  const time = isTime(args.time) ? args.time : undefined;
  const reason = str(args.reason, 200);
  if (!reason) return needInfo("سبب التأجيل");
  const to = time ? `${date}T${time}` : date;
  if (to === f!.scheduledAt) return { ok: false, result: { status: "invalid", problem: "الميعاد الجديد زي القديم." } };
  return {
    ok: true,
    action: {
      id: newId(),
      kind: "followup_move",
      leadId: f!.leadId,
      customerName: f!.leadName,
      ...empty,
      followUp: { id: f!.id, date, ...(time ? { time } : {}), reason },
      summary: [`تأجيل متابعة العميل ${f!.leadName}`, `من ${f!.scheduledAt.replace("T", " ")} إلى ${to.replace("T", " ")}`, `السبب: ${reason}`],
    },
  };
}

export function planNote(args: Args, d: PlanData): Plan {
  const found = customerFrom(args, d.leads);
  const stop = askWhich(found);
  if (stop) return stop;
  const lead = (found as Extract<Resolved, { kind: "found" }>).lead;
  const note = str(args.note, 500);
  if (!note) return needInfo("نص الملاحظة");
  return { ok: true, action: { id: newId(), kind: "note", leadId: lead.id, customerName: lead.name, ...empty, note, summary: [`ملاحظة على ملف العميل ${lead.name}`, note] } };
}

export function planTarget(args: Args, d: PlanData): Plan {
  const who = str(args.agent_id) ?? str(args.agent);
  if (!who) return needInfo("الموظف");
  const people = d.users.filter((u) => u.active && isSalesCapable(u));
  const exact = people.filter((u) => u.id === who);
  const rows = exact.length ? exact : people.filter((u) => norm(u.name).includes(norm(who)));
  if (!rows.length) return { ok: false, result: { status: "agent_not_found", hint: "مفيش موظف مبيعات بالاسم ده في نطاقك." } };
  if (rows.length > 1) return { ok: false, result: { status: "ambiguous_agent", agents: rows.slice(0, 8).map((u) => ({ id: u.id, name: u.name })) } };
  const month = typeof args.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(args.month) ? args.month : d.today.slice(0, 7);
  const amount = typeof args.amount === "number" && Number.isFinite(args.amount) && args.amount > 0 ? Math.round(args.amount) : 0;
  if (!amount) return needInfo("قيمة الهدف بالجنيه");
  const u = rows[0];
  return { ok: true, action: { id: newId(), kind: "target", customerName: u.name, ...empty, target: { userId: u.id, userName: u.name, month, amount }, summary: [`هدف ${u.name} لشهر ${month}: ${money(amount)} ج.م`] } };
}

export function planReassign(args: Args, d: PlanData): Plan {
  const found = customerFrom(args, d.leads);
  const stop = askWhich(found);
  if (stop) return stop;
  const lead = (found as Extract<Resolved, { kind: "found" }>).lead;
  const who = str(args.agent_id) ?? str(args.agent);
  if (!who) return needInfo("الموظف الجديد المسؤول عن العميل");
  const people = d.users.filter((u) => u.active && isSalesCapable(u) && u.branchId === lead.branchId);
  const exact = people.filter((u) => u.id === who);
  const rows = exact.length ? exact : people.filter((u) => norm(u.name).includes(norm(who)));
  if (!rows.length) return { ok: false, result: { status: "agent_not_found", hint: "مفيش موظف مبيعات بالاسم ده في فرع العميل." } };
  if (rows.length > 1) return { ok: false, result: { status: "ambiguous_agent", agents: rows.slice(0, 8).map((u) => ({ id: u.id, name: u.name })) } };
  if (rows[0].id === lead.assignedAgentId) return { ok: false, result: { status: "invalid", problem: "العميل ده مع الموظف ده أصلًا." } };
  return { ok: true, action: { id: newId(), kind: "reassign", leadId: lead.id, customerName: lead.name, ...empty, reassign: { toUserId: rows[0].id, toName: rows[0].name }, summary: [`نقل العميل ${lead.name} للموظف ${rows[0].name}`] } };
}
