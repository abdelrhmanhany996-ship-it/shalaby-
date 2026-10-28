import type { Booking, Branch, BrokerEntity, Department, FollowUp, Lead, NotBoughtRecord, ReviewNote, ReviewRequest, User, Visit } from "../types/crm";
import { addToDate } from "./postSale";
import { bookingSplit, departmentIds } from "./purchases";
import { brokerRows, customerRows, feedbackSummary } from "./overview";
import { departmentNames, followUpStatus, sourceNames, statusNames } from "./presentation";
import { notBoughtReasons, reasonLabel } from "./notBought";
import { isSalesCapable } from "./permissions";
import { employeeRatings, ratingLevelLabel } from "./employeeRating";
import { pendingReferral, referrerRows } from "./referrals";
import { complaintOpenedAt, complaintState, complaintStateLabel, isComplaint, isLateComplaint, resolutionHours, reviewStats } from "./reviews";

/** Live, role-scoped data the assistant may query. Built from the workspace (never raw database access). */
export interface ToolData {
  today: string;
  leads: Lead[];
  bookings: Booking[];
  followUps: FollowUp[];
  visits: Visit[];
  notBoughtRecords: NotBoughtRecord[];
  brokers: BrokerEntity[];
  users: User[];
  branches: Branch[];
  reviewRequests?: ReviewRequest[];
  reviewNotes?: ReviewNote[];
}

type Args = Record<string, unknown>;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
const has = (hay: string | undefined, needle: unknown) =>
  typeof needle === "string" && needle.trim() !== "" && norm(hay ?? "").includes(norm(needle));
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const limitOf = (a: Args) => Math.min(MAX_LIMIT, Math.max(1, Math.floor(num(a.limit, DEFAULT_LIMIT))));
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const inRange = (date: string | undefined, from?: string, to?: string) => {
  if (!date) return false;
  const d = date.slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
};
const sum = (n: number[]) => n.reduce((s, x) => s + x, 0);
const dept = (v: unknown): Department | undefined =>
  typeof v === "string" && (departmentIds as string[]).includes(v) ? (v as Department) : undefined;
const byDeptNames = (s: Record<Department, number>) =>
  Object.fromEntries(departmentIds.filter((d) => s[d] > 0).map((d) => [departmentNames[d], s[d]]));

function page<T>(rows: T[], limit: number) {
  return { total: rows.length, shown: Math.min(rows.length, limit), truncated: rows.length > limit, rows: rows.slice(0, limit) };
}

export function runTool(name: string, a: Args, d: ToolData): unknown {
  const userName = (id?: string) => d.users.find((u) => u.id === id)?.name;
  const branchName = (id: string) => d.branches.find((b) => b.id === id)?.name ?? id;
  const branchIdsFor = (q: unknown) => (str(q) ? d.branches.filter((b) => has(b.name, q)).map((b) => b.id) : undefined);
  const agentIdsFor = (q: unknown) => (str(q) ? d.users.filter((u) => has(u.name, q)).map((u) => u.id) : undefined);
  const from = isDate(a.from) ? a.from : undefined;
  const to = isDate(a.to) ? a.to : undefined;
  const active = d.bookings.filter((b) => b.bookingStatus !== "cancelled");
  const customers = customerRows(d.bookings, d.leads);
  const inBranch = (branchId: string, ids?: string[]) => !ids || ids.includes(branchId);

  switch (name) {
    case "overview": {
      const ids = branchIdsFor(a.branch);
      const ls = d.leads.filter((l) => inBranch(l.branchId, ids));
      const lids = new Set(ls.map((l) => l.id));
      const cs = customers.filter((c) => lids.has(c.leadId));
      const open = d.followUps.filter((f) => lids.has(f.leadId) && !["completed", "cancelled"].includes(followUpStatus(f)));
      const split = { construction: 0, decor: 0, garden: 0, general: 0 } as Record<Department, number>;
      for (const c of cs) for (const k of departmentIds) split[k] += c.split[k];
      const total = sum(cs.map((c) => c.total));
      return {
        today: d.today,
        customers: ls.length,
        buyingCustomers: cs.length,
        customersWithoutPurchase: ls.length - cs.length,
        purchasesTotalEGP: total,
        byDepartmentEGP: byDeptNames(split),
        shareViaBrokersPercent: total ? Math.round((sum(cs.filter((c) => c.brokerId).map((c) => c.total)) / total) * 100) : 0,
        followUps: {
          overdue: open.filter((f) => followUpStatus(f) === "overdue").length,
          dueToday: open.filter((f) => followUpStatus(f) === "due").length,
          upcoming: open.filter((f) => followUpStatus(f) === "upcoming").length,
        },
        branches: d.branches.filter((b) => ls.some((l) => l.branchId === b.id)).map((b) => b.name),
      };
    }

    case "period_stats": {
      const bids = branchIdsFor(a.branch);
      const aids = agentIdsFor(a.agent);
      const okLead = (l: Lead) => inBranch(l.branchId, bids) && (!aids || (l.assignedAgentId && aids.includes(l.assignedAgentId)));
      const leadOk = new Set(d.leads.filter(okLead).map((l) => l.id));
      const bk = active.filter((b) => leadOk.has(b.leadId) && inRange(b.bookingDate, from, to));
      const split = { construction: 0, decor: 0, garden: 0, general: 0 } as Record<Department, number>;
      for (const b of bk) for (const k of departmentIds) split[k] += bookingSplit(b)[k];
      return {
        from: from ?? null,
        to: to ?? null,
        newCustomers: d.leads.filter((l) => okLead(l) && inRange(l.createdAt, from, to)).length,
        visits: d.visits.filter((v) => (!bids || bids.includes(v.branchId)) && inRange(v.date, from, to)).length,
        purchases: { count: bk.length, totalEGP: sum(bk.map((b) => b.amount)), byDepartmentEGP: byDeptNames(split) },
        followUpsCompleted: d.followUps.filter((f) => f.status === "completed" && leadOk.has(f.leadId) && inRange(f.completedAt, from, to)).length,
        notBoughtRecorded: d.notBoughtRecords.filter((r) => leadOk.has(r.leadId) && inRange(r.createdAt, from, to)).length,
      };
    }

    case "find_customers": {
      const bids = branchIdsFor(a.branch);
      const aids = agentIdsFor(a.agent);
      const dep = dept(a.department);
      const tot = new Map(customers.map((c) => [c.leadId, c]));
      let rows = d.leads
        .filter((l) => inBranch(l.branchId, bids))
        .filter((l) => !aids || (l.assignedAgentId && aids.includes(l.assignedAgentId)))
        .filter((l) => !str(a.query) || has(l.name, a.query) || (l.phone ?? "").includes(String(a.query)))
        .filter((l) => !str(a.broker) || has(l.brokerName, a.broker))
        .filter((l) => !str(a.status) || l.status === a.status)
        .filter((l) => !str(a.source) || l.source === a.source)
        .filter((l) => a.bought === undefined || (a.bought === true) === !!tot.get(l.id))
        .filter((l) => !dep || (tot.get(l.id)?.split[dep] ?? 0) > 0)
        .map((l) => {
          const c = tot.get(l.id);
          return {
            id: l.id,
            name: l.name,
            phone: l.phone,
            branch: branchName(l.branchId),
            agent: userName(l.assignedAgentId) ?? null,
            status: statusNames[l.status],
            source: sourceNames[l.source],
            broker: l.brokerName ?? null,
            totalEGP: c?.total ?? 0,
            byDepartmentEGP: c ? byDeptNames(c.split) : {},
            lastPurchase: c?.lastDate ?? null,
            nextFollowUp: l.nextFollowUpDate?.slice(0, 10) ?? null,
          };
        });
      const sortBy = str(a.sortBy) ?? "total";
      rows = rows.sort((x, y) => (sortBy === "name" ? x.name.localeCompare(y.name, "ar") : y.totalEGP - x.totalEGP));
      return page(rows, limitOf(a));
    }

    case "get_customer": {
      const q = str(a.name) ?? str(a.id);
      const matches = d.leads.filter((l) => l.id === q || has(l.name, q));
      if (!matches.length) return { error: "مفيش عميل بالاسم ده في نطاقك" };
      if (matches.length > 1 && !matches.some((l) => l.id === q))
        return { ambiguous: true, candidates: matches.slice(0, 8).map((l) => ({ id: l.id, name: l.name, branch: branchName(l.branchId) })) };
      const l = matches[0];
      const c = customers.find((x) => x.leadId === l.id);
      return {
        id: l.id,
        name: l.name,
        phone: l.phone,
        branch: branchName(l.branchId),
        agent: userName(l.assignedAgentId) ?? null,
        status: statusNames[l.status],
        source: sourceNames[l.source],
        broker: l.brokerName ?? null,
        notes: l.notes?.slice(0, 300) ?? null,
        rating: l.customerRatingStars ? { stars: l.customerRatingStars, comment: l.customerRatingComment ?? null } : null,
        totalEGP: c?.total ?? 0,
        byDepartmentEGP: c ? byDeptNames(c.split) : {},
        purchases: d.bookings
          .filter((b) => b.leadId === l.id)
          .map((b) => ({ date: b.bookingDate, totalEGP: b.amount, byDepartmentEGP: byDeptNames(bookingSplit(b)), cancelled: b.bookingStatus === "cancelled" })),
        followUps: d.followUps
          .filter((f) => f.leadId === l.id)
          .sort((x, y) => x.scheduledAt.localeCompare(y.scheduledAt))
          .slice(0, 12)
          .map((f) => ({ due: f.scheduledAt.slice(0, 10), status: followUpStatus(f), kind: f.category === "post_sale" ? "بعد البيع" : "بيع", reason: f.reason.slice(0, 120), rating: f.satisfactionRating ?? null, referral: f.referralNote ?? null })),
        notBought: d.notBoughtRecords.filter((r) => r.leadId === l.id).map((r) => ({ date: r.createdAt.slice(0, 10), reasons: r.reasons.map(reasonLabel), other: r.otherText ?? null, note: r.note ?? null })),
        visits: d.visits.filter((v) => v.linkedLeadId === l.id).slice(0, 5).map((v) => ({ date: v.date, outcome: v.outcome })),
      };
    }

    case "top_customers": {
      const bids = branchIdsFor(a.branch);
      const dep = dept(a.department);
      const rows = customers
        .filter((c) => inBranch(c.branchId, bids))
        .filter((c) => !dep || c.split[dep] > 0)
        .sort((x, y) => (dep ? y.split[dep] - x.split[dep] : y.total - x.total))
        .map((c, i) => ({ rank: i + 1, name: c.name, branch: branchName(c.branchId), broker: c.brokerName ?? null, amountEGP: dep ? c.split[dep] : c.total, totalEGP: c.total, byDepartmentEGP: byDeptNames(c.split), purchases: c.purchases }));
      return { ranking: dep ? `الأكثر شراءً من ${departmentNames[dep]}` : "إجمالي المشتريات", ...page(rows, limitOf(a)) };
    }

    case "top_brokers": {
      const dep = dept(a.department);
      const rows = brokerRows(customers, d.leads, d.brokers)
        .sort((x, y) => (dep ? y.split[dep] - x.split[dep] : y.total - x.total))
        .filter((b) => !dep || b.split[dep] > 0)
        .map((b, i) => ({ rank: i + 1, name: b.name, customersBrought: b.referred, buyers: b.buyers.length, amountEGP: dep ? b.split[dep] : b.total, totalEGP: b.total, byDepartmentEGP: byDeptNames(b.split) }));
      return page(rows, limitOf(a));
    }

    case "get_broker": {
      const rows = brokerRows(customers, d.leads, d.brokers).filter((b) => has(b.name, a.name) || b.brokerId === a.name);
      if (!rows.length) return { error: "مفيش وسيط بالاسم ده (أو ملوش عملاء في نطاقك)" };
      const b = rows[0];
      return {
        name: b.name,
        type: b.type,
        customersBrought: b.referred,
        buyers: b.buyers.length,
        totalEGP: b.total,
        byDepartmentEGP: byDeptNames(b.split),
        customers: b.buyers.slice(0, 20).map((c) => ({ name: c.name, totalEGP: c.total, byDepartmentEGP: byDeptNames(c.split) })),
      };
    }

    case "list_followups": {
      const bids = branchIdsFor(a.branch);
      const aids = agentIdsFor(a.agent);
      const status = str(a.status);
      const kind = str(a.kind);
      const rows = d.followUps
        .filter((f) => inBranch(f.branchId, bids))
        .filter((f) => !aids || aids.includes(f.assignedAgentId))
        .filter((f) => !status || followUpStatus(f) === status)
        .filter((f) => !kind || (kind === "post_sale") === (f.category === "post_sale"))
        .map((f) => ({
          customer: f.leadName,
          agent: userName(f.assignedAgentId) ?? null,
          branch: branchName(f.branchId),
          due: f.scheduledAt.slice(0, 10),
          status: followUpStatus(f),
          daysOverdue: followUpStatus(f) === "overdue" ? Math.round((Date.parse(d.today) - Date.parse(f.scheduledAt.slice(0, 10))) / 86_400_000) : 0,
          kind: f.category === "post_sale" ? "بعد البيع" : "بيع",
          reason: f.reason.slice(0, 120),
        }))
        .sort((x, y) => y.daysOverdue - x.daysOverdue || x.due.localeCompare(y.due));
      return page(rows, limitOf(a));
    }

    case "list_purchases": {
      const bids = branchIdsFor(a.branch);
      const dep = dept(a.department);
      const rows = active
        .filter((b) => inBranch(b.branchId, bids) && inRange(b.bookingDate, from, to))
        .filter((b) => !str(a.customer) || has(b.leadName, a.customer))
        .filter((b) => !dep || bookingSplit(b)[dep] > 0)
        .sort((x, y) => y.bookingDate.localeCompare(x.bookingDate))
        .map((b) => ({ date: b.bookingDate, customer: b.leadName, branch: branchName(b.branchId), totalEGP: b.amount, byDepartmentEGP: byDeptNames(bookingSplit(b)) }));
      return { totalEGP: sum(rows.map((r) => r.totalEGP)), ...page(rows, limitOf(a)) };
    }

    case "not_bought": {
      const bids = branchIdsFor(a.branch);
      const aids = agentIdsFor(a.agent);
      const rs = d.notBoughtRecords
        .filter((r) => inBranch(r.branchId, bids) && (!aids || aids.includes(r.agentId)) && inRange(r.createdAt, from, to))
        .filter((r) => !str(a.reason) || r.reasons.some((x) => x === a.reason));
      const counts = notBoughtReasons
        .map((r) => ({ reason: r.label, id: r.id, count: rs.filter((x) => x.reasons.includes(r.id)).length }))
        .filter((r) => r.count)
        .sort((x, y) => y.count - x.count);
      return {
        records: rs.length,
        unknownSharePercent: rs.length ? Math.round((rs.filter((r) => r.reasons.includes("unknown")).length / rs.length) * 100) : 0,
        reasons: counts,
        recent: rs.slice(0, 10).map((r) => ({ customer: r.leadName, agent: r.agentName ?? userName(r.agentId) ?? null, date: r.createdAt.slice(0, 10), reasons: r.reasons.map(reasonLabel), other: r.otherText ?? null, note: r.note ?? null })),
      };
    }

    case "feedback": {
      const bids = branchIdsFor(a.branch);
      const aids = agentIdsFor(a.agent);
      const maxStars = num(a.maxStars, 5);
      const ls = d.leads.filter((l) => inBranch(l.branchId, bids) && (!aids || (l.assignedAgentId && aids.includes(l.assignedAgentId))));
      const f = feedbackSummary(ls);
      return {
        ratings: f.count,
        average: Number(f.average.toFixed(1)),
        location: Number(f.location.toFixed(1)),
        treatment: Number(f.treatment.toFixed(1)),
        price: Number(f.price.toFixed(1)),
        distribution: f.distribution,
        comments: ls
          .filter((l) => l.customerRatingStars && l.customerRatingStars <= maxStars)
          .slice(0, 10)
          .map((l) => ({ customer: l.name, stars: l.customerRatingStars, comment: l.customerRatingComment ?? null })),
      };
    }

    case "performance": {
      const groupBy = a.group_by === "agent" ? "agent" : "branch";
      const mk = (leadsOf: Lead[]) => {
        const ids = new Set(leadsOf.map((l) => l.id));
        const cs = customers.filter((c) => ids.has(c.leadId));
        const open = d.followUps.filter((f) => ids.has(f.leadId) && !["completed", "cancelled"].includes(followUpStatus(f)));
        return {
          customers: leadsOf.length,
          buyers: cs.length,
          purchasesTotalEGP: sum(cs.map((c) => c.total)),
          notBoughtYet: leadsOf.length - cs.length,
          overdueFollowUps: open.filter((f) => followUpStatus(f) === "overdue").length,
          followUpsCompleted: d.followUps.filter((f) => ids.has(f.leadId) && f.status === "completed" && inRange(f.completedAt, from, to)).length,
        };
      };
      const rows =
        groupBy === "branch"
          ? d.branches.map((b) => ({ name: b.name, ...mk(d.leads.filter((l) => l.branchId === b.id)) })).filter((r) => r.customers)
          : d.users
              .filter(isSalesCapable)
              .map((u) => ({ name: u.name, branch: branchName(u.branchId ?? ""), ...mk(d.leads.filter((l) => l.assignedAgentId === u.id)) }))
              .filter((r) => r.customers);
      return { groupBy, ...page(rows.sort((x, y) => y.purchasesTotalEGP - x.purchasesTotalEGP), limitOf(a)) };
    }

    case "reviews": {
      const bids = branchIdsFor(a.branch);
      const aids = agentIdsFor(a.agent);
      const notes = d.reviewNotes ?? [];
      const only = str(a.only) ?? "all";
      const rs = (d.reviewRequests ?? [])
        .filter((r) => inBranch(r.branchId, bids) && (!aids || aids.includes(r.agentId)))
        .filter((r) => inRange(r.answeredAt || r.sentAt, from, to));
      const rows = rs
        .filter((r) =>
          only === "complaints" ? isComplaint(r)
          : only === "open_complaints" ? isComplaint(r) && complaintState(r, notes) !== "resolved"
          : only === "late" ? isLateComplaint(r, notes)
          : only === "low" ? r.status === "answered" && (r.response?.rating ?? 5) <= 3
          : r.status === "answered",
        )
        .sort((x, y) => complaintOpenedAt(y).localeCompare(complaintOpenedAt(x)))
        .map((r) => {
          const mine = notes.filter((n) => n.requestId === r.id).sort((x, y) => x.at.localeCompare(y.at));
          return {
            customer: r.leadName,
            branch: branchName(r.branchId),
            agent: r.agentName ?? userName(r.agentId) ?? null,
            about: r.subjectLabel,
            date: (r.answeredAt || r.sentAt).slice(0, 10),
            stars: r.response?.rating ?? null,
            comment: r.response?.comment?.slice(0, 300) ?? null,
            complaint: isComplaint(r),
            complaintState: isComplaint(r) ? complaintStateLabel[complaintState(r, notes)] : null,
            lateOver24h: isLateComplaint(r, notes),
            resolutionHours: resolutionHours(r, notes),
            aiSummary: r.ai?.summary ?? null,
            lastFollowUp: mine.length ? { by: mine[mine.length - 1].byName, text: mine[mine.length - 1].text.slice(0, 200) } : null,
          };
        });
      return { stats: reviewStats(rs, notes), ...page(rows, limitOf(a)) };
    }

    case "employee_ratings": {
      const bids = branchIdsFor(a.branch);
      const aids = agentIdsFor(a.agent);
      const rows = employeeRatings(d.users, d.reviewRequests ?? [], d.followUps)
        .filter((r) => (!bids || (r.branchId && bids.includes(r.branchId))) && (!aids || aids.includes(r.userId)))
        .filter((r) => a.onlyRated !== true || r.count > 0)
        .map((r, i) => ({
          rank: i + 1,
          employee: r.name,
          branch: r.branchId ? branchName(r.branchId) : null,
          rating: r.score,
          plainAverage: r.average,
          ratingsCount: r.count,
          level: ratingLevelLabel[r.level],
          complaints: r.complaints,
          customersRepliedPercent: r.responseRatePercent,
          last30Days: r.last30,
          trend: r.trend === "up" ? "في تحسن" : r.trend === "down" ? "في تراجع" : r.trend === "flat" ? "ثابت" : null,
        }));
      return { note: "rating = المتوسط مع تعديل بسيط للتقييمات القليلة؛ level «لسه بدري» = أقل من 3 تقييمات", ...page(rows, limitOf(a)) };
    }

    case "referrals": {
      const bids = branchIdsFor(a.branch);
      const rows = referrerRows(d.leads, d.bookings)
        .filter((r) => inBranch(r.branchId, bids))
        .map((r, i) => ({ rank: i + 1, customer: r.name, branch: branchName(r.branchId), referred: r.referred, contacted: r.visited, bought: r.bought, boughtTotalEGP: r.totalEGP }));
      const waiting = (d.reviewRequests ?? []).filter(pendingReferral).filter((r) => inBranch(r.branchId, bids));
      return {
        referralsWaitingToBeRegistered: waiting.map((r) => ({ from: r.leadName, person: r.response!.referral!.name, branch: branchName(r.branchId) })),
        ...page(rows, limitOf(a)),
      };
    }

    default:
      return { error: `أداة غير معروفة: ${name}` };
  }
}

export const toolLabels: Record<string, string> = {
  overview: "نظرة عامة على المبيعات",
  period_stats: "أرقام الفترة",
  find_customers: "بدوّر في العملاء",
  get_customer: "بفتح ملف العميل",
  top_customers: "بترتيب العملاء بالمشتريات",
  top_brokers: "بترتيب الوسطاء",
  get_broker: "بفتح ملف الوسيط",
  list_followups: "بقلّب في المتابعات",
  list_purchases: "بقلّب في المشتريات",
  not_bought: "بشوف أسباب عدم الشراء",
  feedback: "بقرا تقييمات العملاء",
  performance: "بقارن الفروع والموظفين",
  reviews: "بقرا التقييمات والشكاوى",
  employee_ratings: "بشوف تقييم الموظفين",
  referrals: "بشوف الترشيحات",
};

export const defaultToolDate = (daysAgo: number, today: string) => addToDate(today, { days: -daysAgo });
