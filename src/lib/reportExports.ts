import type { AiSuggestion, AuditLog, Booking, BrokerEntity, Branch, FollowUp, Lead, NotBoughtRecord, ReminderDone, ReviewNote, ReviewRequest, User, Visit } from "../types/crm";
import { departmentIds, bookingSplit } from "./purchases";
import { departmentNames, followUpStatus, followUpTypeNames, statusNames } from "./presentation";
import { notBoughtReasons } from "./notBought";
import { complaintOpenedAt, complaintState, complaintStateLabel, isComplaint, isLateComplaint, resolutionHours } from "./reviews";
import { employeeRatings, ratingLevelLabel } from "./employeeRating";
import { isSalesCapable } from "./permissions";
import type { Permission } from "./permissions";

export interface ReportData {
  leads: Lead[];
  visits: Visit[];
  bookings: Booking[];
  followUps: FollowUp[];
  notBoughtRecords: NotBoughtRecord[];
  reviewRequests: ReviewRequest[];
  reviewNotes: ReviewNote[];
  users: User[];
  brokers: BrokerEntity[];
  branches: Branch[];
  auditLogs: AuditLog[];
  aiSuggestions: AiSuggestion[];
  reminderDone: ReminderDone[];
}
export interface ReportFilter {
  from?: string;
  to?: string;
  branchId?: string;
}
export interface ReportTable {
  headers: string[];
  rows: (string | number)[][];
}
export interface ReportDef {
  id: string;
  title: string;
  description: string;
  audience: string;
  /** "core" reports come first, in the order of the list; "extra" ones sit below them. */
  tier: "core" | "extra";
  needs: Permission[];
  /** Printable summary instead of a spreadsheet. */
  print?: boolean;
  build: (d: ReportData, f: ReportFilter) => ReportTable;
}

const day = (s?: string) => (s || "").slice(0, 10);
const inRange = (s: string | undefined, f: ReportFilter) => {
  const d = day(s);
  if (!d) return !f.from && !f.to;
  return (!f.from || d >= f.from) && (!f.to || d <= f.to);
};
const inBranch = (branchId: string | undefined, f: ReportFilter) => !f.branchId || branchId === f.branchId;
const branchName = (d: ReportData, id?: string) => d.branches.find((b) => b.id === id)?.name || "";
const userName = (d: ReportData, id?: string) => d.users.find((u) => u.id === id)?.name || "";
const live = (b: Booking) => b.bookingStatus !== "cancelled";
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : "");

/** Branches that have something to show under the current filter (real ones only, never an empty list). */
function branchesIn(d: ReportData, f: ReportFilter): Branch[] {
  return d.branches.filter((b) => (!f.branchId || b.id === f.branchId) && b.active !== false);
}

export function branchPerformance(d: ReportData, f: ReportFilter): ReportTable {
  const now = Date.now();
  return {
    headers: ["الفرع", "زيارات", "عملاء جدد", "عدد المشتريات", "إجمالي المبيعات (ج.م)", "نتائج «لسه»", "نسبة الشراء من النتائج المسجلة %", "متابعات متأخرة", "متوسط تقييم العملاء"],
    rows: branchesIn(d, f).map((b) => {
      const bookings = d.bookings.filter((x) => live(x) && x.branchId === b.id && inRange(x.bookingDate, f));
      const notYet = d.notBoughtRecords.filter((n) => n.branchId === b.id && inRange(n.createdAt, f)).length;
      const stars = d.reviewRequests.filter((r) => r.branchId === b.id && r.status === "answered" && r.response && inRange(r.answeredAt, f)).map((r) => r.response!.rating);
      return [
        b.name,
        d.visits.filter((v) => v.branchId === b.id && inRange(v.date, f)).length,
        d.leads.filter((l) => l.branchId === b.id && inRange(l.createdAt, f)).length,
        bookings.length,
        bookings.reduce((s, x) => s + x.amount, 0),
        notYet,
        pct(bookings.length, bookings.length + notYet),
        d.followUps.filter((x) => x.branchId === b.id && followUpStatus(x) === "overdue").length,
        avg(stars),
      ];
    }),
  };
}

export function overdueFollowUps(d: ReportData, f: ReportFilter): ReportTable {
  const today = new Date().toISOString().slice(0, 10);
  const days = (s: string) => Math.max(0, Math.round((new Date(today).getTime() - new Date(day(s)).getTime()) / 86_400_000));
  return {
    headers: ["العميل", "الهاتف", "الفرع", "المسؤول", "موعد المتابعة", "أيام التأخير", "النوع", "السبب"],
    rows: d.followUps
      .filter((x) => followUpStatus(x) === "overdue" && inBranch(x.branchId, f) && inRange(x.scheduledAt, f))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .map((x) => [x.leadName, x.leadPhone, branchName(d, x.branchId), x.assignedAgentName || userName(d, x.assignedAgentId), day(x.scheduledAt), days(x.scheduledAt), followUpTypeNames[x.type] || x.type, x.reason]),
  };
}

export function notYetReasons(d: ReportData, f: ReportFilter): ReportTable {
  const records = d.notBoughtRecords.filter((n) => inBranch(n.branchId, f) && inRange(n.createdAt, f));
  const branches = branchesIn(d, f);
  const total = records.length;
  return {
    headers: ["السبب", "العدد", "النسبة من السجلات %", ...branches.map((b) => b.name)],
    rows: notBoughtReasons
      .map((r) => {
        const withReason = records.filter((n) => n.reasons.includes(r.id));
        return [r.label, withReason.length, pct(withReason.length, total), ...branches.map((b) => withReason.filter((n) => n.branchId === b.id).length)] as (string | number)[];
      })
      .sort((a, b) => (b[1] as number) - (a[1] as number)),
  };
}

export function salesByDepartment(d: ReportData, f: ReportFilter): ReportTable {
  const branches = branchesIn(d, f);
  return {
    headers: ["الفرع", ...departmentIds.map((id) => departmentNames[id]), "الإجمالي (ج.م)"],
    rows: [
      ...branches.map((b) => {
        const list = d.bookings.filter((x) => live(x) && x.branchId === b.id && inRange(x.bookingDate, f));
        const cols = departmentIds.map((id) => list.reduce((s, x) => s + bookingSplit(x)[id], 0));
        return [b.name, ...cols, cols.reduce((a, c) => a + c, 0)];
      }),
    ].concat(
      (() => {
        const list = d.bookings.filter((x) => live(x) && inBranch(x.branchId, f) && inRange(x.bookingDate, f));
        const cols = departmentIds.map((id) => list.reduce((s, x) => s + bookingSplit(x)[id], 0));
        return [["الإجمالي", ...cols, cols.reduce((a, c) => a + c, 0)]];
      })(),
    ),
  };
}

export function brokerPerformance(d: ReportData, f: ReportFilter): ReportTable {
  return {
    headers: ["الوسيط", "النوع", "الهاتف", "عملاء جابهم", "اشتروا", "إجمالي مشترياتهم (ج.م)", "نشط"],
    rows: d.brokers
      .map((b) => {
        const brought = d.leads.filter((l) => l.brokerId === b.id && inBranch(l.branchId, f) && inRange(l.createdAt, f));
        const ids = new Set(brought.map((l) => l.id));
        const bought = d.bookings.filter((x) => live(x) && ids.has(x.leadId) && inRange(x.bookingDate, f));
        const buyers = new Set(bought.map((x) => x.leadId)).size;
        return [b.name, { individual: "فرد", company: "شركة", engineering_company: "شركة هندسية", contractor: "مقاول" }[b.type] || b.type, b.phone, brought.length, buyers, bought.reduce((s, x) => s + x.amount, 0), b.active ? "نعم" : "لا"] as (string | number)[];
      })
      .sort((a, b) => (b[5] as number) - (a[5] as number)),
  };
}

export function employeeRatingsReport(d: ReportData, f: ReportFilter): ReportTable {
  const rows = employeeRatings(d.users.filter((u) => inBranch(u.branchId, f)), d.reviewRequests, d.followUps);
  return {
    headers: ["الموظف", "الفرع", "عدد التقييمات", "المتوسط", "التقييم المحسوب", "المستوى", "شكاوى", "نسبة رد العملاء %"],
    rows: rows.map((r) => [r.name, branchName(d, r.branchId), r.count, r.average == null ? "" : Math.round(r.average * 10) / 10, r.score == null ? "" : Math.round(r.score * 10) / 10, ratingLevelLabel[r.level], r.complaints, r.responseRatePercent ?? ""]),
  };
}

export function complaintsReport(d: ReportData, f: ReportFilter): ReportTable {
  return {
    headers: ["العميل", "الفرع", "الموظف", "التقييم", "تاريخ الشكوى", "الحالة", "ساعات حتى الحل", "متصعّدة (أكتر من 24 ساعة)", "التعليق"],
    rows: d.reviewRequests
      .filter((r) => isComplaint(r) && inBranch(r.branchId, f) && inRange(complaintOpenedAt(r), f))
      .map((r) => [r.leadName, r.branchName || branchName(d, r.branchId), r.agentName || userName(d, r.agentId), r.response?.rating ?? "", day(complaintOpenedAt(r)), complaintStateLabel[complaintState(r, d.reviewNotes)], resolutionHours(r, d.reviewNotes) ?? "", isLateComplaint(r, d.reviewNotes) ? "نعم" : "لا", r.response?.comment || ""]),
  };
}

export function referralsReport(d: ReportData, f: ReportFilter): ReportTable {
  const spent = new Map<string, number>();
  for (const b of d.bookings) if (live(b)) spent.set(b.leadId, (spent.get(b.leadId) ?? 0) + b.amount);
  return {
    headers: ["رشّحه", "المرشَّح", "هاتفه", "الفرع", "تاريخ التسجيل", "الحالة", "اشترى", "مشترياته (ج.م)"],
    rows: d.leads
      .filter((l) => l.referredByLeadId && inBranch(l.branchId, f) && inRange(l.createdAt, f))
      .map((l) => [l.referredByName || d.leads.find((x) => x.id === l.referredByLeadId)?.name || "", l.name, l.phone, l.branchName || branchName(d, l.branchId), day(l.createdAt), statusNames[l.status], (spent.get(l.id) ?? 0) > 0 ? "نعم" : "لا", spent.get(l.id) ?? 0]),
  };
}

export function customerList(d: ReportData, f: ReportFilter): ReportTable {
  const lastVisit = new Map<string, string>();
  for (const v of d.visits) if (v.linkedLeadId && day(v.date) > (lastVisit.get(v.linkedLeadId) ?? "")) lastVisit.set(v.linkedLeadId, day(v.date));
  const lastBuy = new Map<string, Booking>();
  for (const b of d.bookings) if (live(b) && day(b.bookingDate) >= day(lastBuy.get(b.leadId)?.bookingDate)) lastBuy.set(b.leadId, b);
  return {
    headers: ["العميل", "الهاتف", "الحالة", "الفرع", "المسؤول", "آخر زيارة", "آخر شراء", "مبلغ آخر شراء (ج.م)", "الوسيط"],
    rows: d.leads
      .filter((l) => inBranch(l.branchId, f))
      .map((l) => [l.name, l.phone, statusNames[l.status], l.branchName || branchName(d, l.branchId), l.assignedAgentName || userName(d, l.assignedAgentId), lastVisit.get(l.id) || "", day(lastBuy.get(l.id)?.bookingDate), lastBuy.get(l.id)?.amount ?? "", l.brokerName || ""]),
  };
}

export function auditReport(d: ReportData, f: ReportFilter): ReportTable {
  return {
    headers: ["التاريخ والوقت", "المستخدم", "الدور", "الإجراء", "العنصر", "التفاصيل"],
    rows: d.auditLogs.filter((a) => inRange(a.timestamp, f)).map((a) => [a.timestamp.replace("T", " ").slice(0, 16), a.userName, a.userRole, a.action, a.entity, a.details]),
  };
}

/** What each salesperson did in the period and what came of it, including how they treated Zaki's suggestions. */
export function salesEffort(d: ReportData, f: ReportFilter): ReportTable {
  return {
    headers: ["السيلز", "الفرع", "زيارات استقبلها", "عملاء جدد", "متابعات اتجدولت", "متابعات اتعملت", "نسبة الإنجاز %", "متابعات متأخرة حاليًا", "طلبات تقييم اتبعتت", "تقييمات وصلت", "عدد المشتريات", "إجمالي المبيعات (ج.م)", "تذكيرات اتنجزت", "اقتراحات زكي", "اتقبلت", "اتفضّت", "لسه مستنية"],
    rows: d.users
      .filter((u) => isSalesCapable(u) && u.active !== false && inBranch(u.branchId, f))
      .map((u) => {
        const fu = d.followUps.filter((x) => x.assignedAgentId === u.id && inRange(x.scheduledAt, f));
        const done = fu.filter((x) => x.status === "completed").length;
        const reviews = d.reviewRequests.filter((r) => r.agentId === u.id && inRange(r.sentAt, f));
        const bookings = d.bookings.filter((b) => live(b) && b.agentId === u.id && inRange(b.bookingDate, f));
        const sug = d.aiSuggestions.filter((s) => s.agentId === u.id && s.status !== "checked" && inRange(s.dayKey, f));
        return [
          u.name,
          branchName(d, u.branchId),
          d.visits.filter((v) => v.receivedByAgentId === u.id && inRange(v.date, f)).length,
          d.leads.filter((l) => l.assignedAgentId === u.id && inRange(l.createdAt, f)).length,
          fu.length,
          done,
          pct(done, fu.filter((x) => x.status !== "cancelled").length),
          d.followUps.filter((x) => x.assignedAgentId === u.id && followUpStatus(x) === "overdue").length,
          reviews.length,
          reviews.filter((r) => r.status === "answered").length,
          bookings.length,
          bookings.reduce((s, x) => s + x.amount, 0),
          d.reminderDone.filter((r) => r.agentId === u.id && inRange(r.doneAt, f)).length,
          sug.length,
          sug.filter((s) => s.status === "accepted").length,
          sug.filter((s) => s.status === "rejected").length,
          sug.filter((s) => s.status === "pending").length,
        ];
      }),
  };
}

/** Every suggestion Zaki made in the period and what the salesperson decided. */
export function zakiSuggestionsReport(d: ReportData, f: ReportFilter): ReportTable {
  const verdict = { pending: "مستنية قرار", accepted: "اتقبلت", rejected: "اتفضّت", checked: "" } as const;
  return {
    headers: ["التاريخ", "السيلز", "الفرع", "عميل/وسيط", "الاسم", "الموعد المقترح", "السبب", "اللي اتقال", "مصدره", "القرار", "اتعدّلت قبل القبول", "الموعد النهائي", "سبب الرفض"],
    rows: d.aiSuggestions
      .filter((s) => s.status !== "checked" && inBranch(s.branchId, f) && inRange(s.dayKey, f))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((s) => [s.dayKey, s.agentName || userName(d, s.agentId), branchName(d, s.branchId), s.partyKind === "broker" ? "وسيط" : "عميل", s.name, s.proposedDate || "", s.reason || "", s.evidence || "", s.source || "", verdict[s.status], s.status === "accepted" ? (s.edited ? "نعم" : "لا") : "", s.finalDate || "", s.rejectReason || ""]),
  };
}

/** Key numbers for one period, shown as a printable one-pager. */
export function weeklySummary(d: ReportData, f: ReportFilter): ReportTable {
  const visits = d.visits.filter((v) => inBranch(v.branchId, f) && inRange(v.date, f));
  const bookings = d.bookings.filter((x) => live(x) && inBranch(x.branchId, f) && inRange(x.bookingDate, f));
  const notYet = d.notBoughtRecords.filter((n) => inBranch(n.branchId, f) && inRange(n.createdAt, f));
  const answered = d.reviewRequests.filter((r) => r.status === "answered" && r.response && inBranch(r.branchId, f) && inRange(r.answeredAt, f));
  const stars = answered.map((r) => r.response!.rating);
  const top = [...notYetCounts(notYet)].sort((a, b) => b[1] - a[1])[0];
  return {
    headers: ["المؤشر", "القيمة"],
    rows: [
      ["الزيارات", visits.length],
      ["عملاء جدد", d.leads.filter((l) => inBranch(l.branchId, f) && inRange(l.createdAt, f)).length],
      ["عدد المشتريات", bookings.length],
      ["إجمالي المبيعات (ج.م)", bookings.reduce((s, x) => s + x.amount, 0)],
      ["نتائج «لسه»", notYet.length],
      ["أكتر سبب لـ«لسه»", top ? `${top[0]} (${top[1]})` : "—"],
      ["متابعات تمت", d.followUps.filter((x) => x.status === "completed" && inBranch(x.branchId, f) && inRange(x.completedAt || x.scheduledAt, f)).length],
      ["متابعات متأخرة حاليًا", d.followUps.filter((x) => inBranch(x.branchId, f) && followUpStatus(x) === "overdue").length],
      ["تقييمات وصلت", answered.length],
      ["متوسط التقييم", avg(stars) || "—"],
      ["شكاوى جديدة", d.reviewRequests.filter((r) => isComplaint(r) && inBranch(r.branchId, f) && inRange(complaintOpenedAt(r), f)).length],
    ],
  };
}
function notYetCounts(records: NotBoughtRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of records) for (const id of r.reasons) { const l = notBoughtReasons.find((x) => x.id === id)?.label ?? id; m.set(l, (m.get(l) ?? 0) + 1); }
  return m;
}

/** Most useful first. The first four are what an owner asks for on day one; the rest are extras. */
export const reportCatalog: ReportDef[] = [
  { id: "branch-performance", tier: "core", title: "أداء الفروع", description: "زيارات، عملاء جدد، مبيعات، نسبة الشراء، متابعات متأخرة وتقييم العملاء لكل فرع.", audience: "المالك والمدير العام", needs: ["bookings.view", "customers.view"], build: branchPerformance },
  { id: "overdue-followups", tier: "core", title: "المتابعات المتأخرة", description: "مين اتأخر، كام يوم، وعند مين. الأقدم أول.", audience: "المدير العام ومديرو الفروع", needs: ["followups.view"], build: overdueFollowUps },
  { id: "not-yet-reasons", tier: "core", title: "أسباب «لسه»", description: "ليه العملاء ما اشتروش: عدد كل سبب ونسبته وتوزيعه على الفروع.", audience: "المالك والمدير العام", needs: ["customers.view"], build: notYetReasons },
  { id: "sales-by-department", tier: "core", title: "المبيعات حسب القسم والفرع", description: "مبيعات كل فرع موزعة على الأقسام الأربعة، مع إجمالي الشركة.", audience: "المالك", needs: ["bookings.view"], build: salesByDepartment },
  { id: "sales-effort", tier: "core", title: "جهد السيلز (شهري)", description: "كل سيلز: زيارات، متابعات اتعملت ونسبة إنجازها، تقييمات، مشتريات، وتعامله مع اقتراحات زكي.", audience: "المالك والمدير العام", needs: ["reports.view"], build: salesEffort },
  { id: "zaki-suggestions", tier: "core", title: "اقتراحات زكي: اتقبل واتفضّ إيه", description: "كل اقتراح زكي عمله، وقرار السيلز عليه وسبب الرفض، ومدى تعديل الموعد.", audience: "المالك والمدير العام", needs: ["reports.view"], build: zakiSuggestionsReport },
  { id: "weekly-summary", tier: "extra", title: "ملخص الفترة (للطباعة أو PDF)", description: "صفحة واحدة بأهم الأرقام للفترة المختارة، جاهزة للطباعة أو الحفظ PDF.", audience: "المالك", needs: ["reports.view"], print: true, build: weeklySummary },
  { id: "brokers", tier: "extra", title: "أداء الوسطاء", description: "كل وسيط: عملاء جابهم، كام اشترى، وإجمالي مشترياتهم.", audience: "المالك", needs: ["brokers.view"], build: brokerPerformance },
  { id: "employee-ratings", tier: "extra", title: "تقييمات الموظفين", description: "تقييم كل موظف من عملائه: المتوسط، المحسوب، المستوى، والشكاوى.", audience: "المالك والمدير العام", needs: ["reports.view"], build: employeeRatingsReport },
  { id: "complaints", tier: "extra", title: "الشكاوى", description: "الشكاوى المفتوحة والمتصعّدة وزمن الحل.", audience: "المالك", needs: ["reports.view"], build: complaintsReport },
  { id: "referrals", tier: "extra", title: "الترشيحات", description: "مين رشّح مين، وكام مرشَّح اشترى ومشترياتهم.", audience: "المالك", needs: ["customers.view"], build: referralsReport },
  { id: "customers", tier: "extra", title: "قايمة العملاء", description: "كل عميل مع آخر زيارة وآخر شراء والمسؤول والوسيط.", audience: "مدير الفرع", needs: ["customers.view"], build: customerList },
  { id: "audit", tier: "extra", title: "سجل العمليات", description: "مين عمل إيه ومتى في النظام.", audience: "المطوّر", needs: ["audit.view"], build: auditReport },
];

/** Spreadsheet-safe CSV (opens in Excel with Arabic intact; cells starting with = + @ - are neutralised). */
export function toCsv(t: ReportTable): string {
  const cell = (v: string | number) => {
    const s = String(v ?? "");
    return '"' + (/^[=+@-]/.test(s) && Number.isNaN(Number(s)) ? "'" : "") + s.replace(/"/g, '""') + '"';
  };
  return "﻿" + [t.headers, ...t.rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
