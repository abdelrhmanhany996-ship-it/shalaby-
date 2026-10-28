import type {
  Booking,
  Branch,
  BrokerEntity,
  FollowUp,
  Lead,
  NotBoughtRecord,
  ReviewNote,
  ReviewRequest,
  User,
  Visit,
} from "../types/crm";
import { addToDate } from "./postSale";
import { departmentIds } from "./purchases";
import { brokerRows, customerRows, departmentLeaders, feedbackSummary } from "./overview";
import { departmentNames, followUpStatus, today } from "./presentation";
import { reasonLabel } from "./notBought";
import { isSalesCapable } from "./permissions";
import { employeeRatings } from "./employeeRating";
import { referrerRows } from "./referrals";
import { complaintOpenedAt, complaintState, complaintStateLabel, isComplaint, isLateComplaint, reviewStats } from "./reviews";

export interface SnapshotInput {
  user: User;
  scope: string;
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

const inRange = (date: string | undefined, from: string, to: string) =>
  !!date && date.slice(0, 10) >= from && date.slice(0, 10) <= to;
const sum = (nums: number[]) => nums.reduce((s, n) => s + n, 0);

/**
 * A compact, role-scoped picture of the system for the AI assistant. It is built
 * from the data the signed-in user is already allowed to see, so the assistant
 * can never know more than the user does. Money is in EGP; payments and salaries
 * are intentionally absent (they belong to the accounts team).
 */
export function buildSnapshot(input: SnapshotInput) {
  const { leads, bookings, followUps, visits, notBoughtRecords, brokers, users, branches } = input;
  const reviews = input.reviewRequests ?? [];
  const notes = input.reviewNotes ?? [];
  const t = today();
  const weekFrom = addToDate(t, { days: -6 });
  const prevTo = addToDate(t, { days: -7 });
  const prevFrom = addToDate(t, { days: -13 });
  const active = bookings.filter((b) => b.bookingStatus !== "cancelled");
  const userName = (id?: string) => users.find((u) => u.id === id)?.name ?? "غير معروف";
  const branchOf = (id: string) => branches.find((b) => b.id === id)?.name ?? id;

  const period = (from: string, to: string) => ({
    from,
    to,
    newCustomers: leads.filter((l) => inRange(l.createdAt, from, to)).length,
    visits: visits.filter((v) => inRange(v.date, from, to)).length,
    purchases: {
      count: active.filter((b) => inRange(b.bookingDate, from, to)).length,
      totalEGP: sum(active.filter((b) => inRange(b.bookingDate, from, to)).map((b) => b.amount)),
    },
    followUpsCompleted: followUps.filter((f) => f.status === "completed" && inRange(f.completedAt, from, to)).length,
    notBoughtRecorded: notBoughtRecords.filter((r) => inRange(r.createdAt, from, to)).length,
  });

  const customers = customerRows(bookings, leads);
  const brokersRanked = brokerRows(customers, leads, brokers);
  const leaders = departmentLeaders(customers, brokersRanked);
  const feedback = feedbackSummary(leads);
  const grand = sum(customers.map((c) => c.total));
  const viaBrokers = sum(customers.filter((c) => c.brokerId).map((c) => c.total));
  const open = followUps.filter((f) => !["completed", "cancelled"].includes(followUpStatus(f)));
  const overdueDays = (f: FollowUp) =>
    Math.max(0, Math.round((Date.parse(t) - Date.parse(f.scheduledAt.slice(0, 10))) / 86_400_000));
  const reasonCounts = new Map<string, number>();
  for (const r of notBoughtRecords)
    for (const id of r.reasons) reasonCounts.set(reasonLabel(id), (reasonCounts.get(reasonLabel(id)) ?? 0) + 1);

  const agentPeriod = (id: string, from: string, to: string) => {
    const mineIds = new Set(leads.filter((l) => l.assignedAgentId === id).map((l) => l.id));
    const bk = active.filter((b) => mineIds.has(b.leadId) && inRange(b.bookingDate, from, to));
    return {
      newCustomers: leads.filter((l) => l.assignedAgentId === id && inRange(l.createdAt, from, to)).length,
      visitsReceived: visits.filter((v) => v.receivedByAgentId === id && inRange(v.date, from, to)).length,
      purchases: bk.length,
      purchasesEGP: sum(bk.map((b) => b.amount)),
      followUpsCompleted: followUps.filter((f) => f.assignedAgentId === id && f.status === "completed" && inRange(f.completedAt, from, to)).length,
      notBought: notBoughtRecords.filter((r) => r.agentId === id && inRange(r.createdAt, from, to)).length,
    };
  };
  const ratings = employeeRatings(users, reviews, followUps);
  const weekReviews = reviews.filter((r) => inRange(r.answeredAt || r.sentAt, weekFrom, t));
  const prevReviews = reviews.filter((r) => inRange(r.answeredAt || r.sentAt, prevFrom, prevTo));
  const boughtIds = new Set(active.map((b) => b.leadId));

  const split = (s: Record<string, number>) =>
    Object.fromEntries(departmentIds.filter((d) => s[d] > 0).map((d) => [departmentNames[d], s[d]]));

  return {
    today: t,
    viewer: { name: input.user.name, role: input.user.role, scope: input.scope },
    currency: "EGP",
    periods: { this_week: period(weekFrom, t), last_week: period(prevFrom, prevTo) },
    totals: {
      customersInScope: leads.length,
      buyingCustomers: customers.length,
      customersWithoutPurchase: Math.max(leads.length - customers.length, 0),
      purchasesTotalEGP: grand,
      byDepartmentEGP: Object.fromEntries(departmentIds.map((d) => [departmentNames[d], leaders[d].total])),
      shareViaBrokersPercent: grand ? Math.round((viaBrokers / grand) * 100) : 0,
    },
    branches: branches
      .map((b) => {
        const ls = leads.filter((l) => l.branchId === b.id);
        const ids = new Set(ls.map((l) => l.id));
        const cs = customers.filter((c) => ids.has(c.leadId));
        return {
          name: b.name,
          customers: ls.length,
          buyers: cs.length,
          purchasesTotalEGP: sum(cs.map((c) => c.total)),
          overdueFollowUps: open.filter((f) => f.branchId === b.id && followUpStatus(f) === "overdue").length,
          notBoughtYet: ls.length - cs.length,
        };
      })
      .filter((b) => b.customers > 0),
    agents: users
      .filter(isSalesCapable)
      .map((u) => {
        const mine = leads.filter((l) => l.assignedAgentId === u.id);
        const ids = new Set(mine.map((l) => l.id));
        const cs = customers.filter((c) => ids.has(c.leadId));
        const f = open.filter((x) => x.assignedAgentId === u.id);
        return {
          name: u.name,
          branch: branchOf(u.branchId ?? ""),
          customers: mine.length,
          purchasesTotalEGP: sum(cs.map((c) => c.total)),
          overdueFollowUps: f.filter((x) => followUpStatus(x) === "overdue").length,
          dueToday: f.filter((x) => followUpStatus(x) === "due").length,
          completedThisWeek: followUps.filter(
            (x) => x.assignedAgentId === u.id && x.status === "completed" && inRange(x.completedAt, weekFrom, t),
          ).length,
          this_week: agentPeriod(u.id, weekFrom, t),
          last_week: agentPeriod(u.id, prevFrom, prevTo),
          customerRating: (() => {
            const r = ratings.find((x) => x.userId === u.id);
            return r ? { score: r.score, count: r.count, level: r.level, last30: r.last30, trend: r.trend } : null;
          })(),
          reviews: (() => {
            const st = reviewStats(reviews.filter((r) => r.agentId === u.id), notes);
            return { answered: st.answered, average: st.average, complaints: st.complaints.total, openComplaints: st.complaints.open + st.complaints.followedUp };
          })(),
        };
      })
      .filter((a) => a.customers > 0 || a.overdueFollowUps > 0 || a.this_week.visitsReceived > 0 || a.last_week.visitsReceived > 0),
    topCustomers: customers.slice(0, 15).map((c) => ({
      name: c.name,
      totalEGP: c.total,
      byDepartmentEGP: split(c.split),
      broker: c.brokerName ?? null,
      branch: branchOf(c.branchId),
    })),
    topBrokers: brokersRanked.slice(0, 10).map((b) => ({
      name: b.name,
      customersBrought: b.referred,
      buyers: b.buyers.length,
      totalEGP: b.total,
      byDepartmentEGP: split(b.split),
    })),
    topBuyersPerDepartment: Object.fromEntries(
      departmentIds.map((d) => [
        departmentNames[d],
        leaders[d].top.map((x) => ({ name: x.name, amountEGP: x.amount })),
      ]),
    ),
    notBought: {
      reasons: [...reasonCounts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
      unknownSharePercent: notBoughtRecords.length
        ? Math.round((notBoughtRecords.filter((r) => r.reasons.includes("unknown")).length / notBoughtRecords.length) * 100)
        : 0,
      recent: notBoughtRecords.slice(0, 12).map((r) => ({
        customer: r.leadName,
        agent: userName(r.agentId),
        reasons: r.reasons.map(reasonLabel),
        other: r.otherText ?? null,
        note: r.note ?? null,
      })),
    },
    openFollowUps: open
      .map((f) => ({
        customer: f.leadName,
        agent: userName(f.assignedAgentId),
        branch: branchOf(f.branchId),
        due: f.scheduledAt.slice(0, 10),
        status: followUpStatus(f),
        daysOverdue: overdueDays(f),
        kind: f.category === "post_sale" ? "بعد البيع" : "بيع",
        milestone: f.milestone ?? null,
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue || a.due.localeCompare(b.due))
      .slice(0, 60),
    postSale: {
      purchases: bookings.filter((b) => b.bookingStatus !== "cancelled").length,
      followUpsOverdue: open.filter((f) => f.category === "post_sale" && followUpStatus(f) === "overdue").length,
      followUpsDueToday: open.filter((f) => f.category === "post_sale" && followUpStatus(f) === "due").length,
    },
    feedback: {
      ratings: feedback.count,
      average: Number(feedback.average.toFixed(1)),
      location: Number(feedback.location.toFixed(1)),
      treatment: Number(feedback.treatment.toFixed(1)),
      price: Number(feedback.price.toFixed(1)),
      lowRatings: leads
        .filter((l) => (l.customerRatingStars ?? 5) <= 3 && l.customerRatingStars)
        .slice(0, 8)
        .map((l) => ({ customer: l.name, stars: l.customerRatingStars, comment: l.customerRatingComment ?? null })),
    },
    // Customers who left this week without buying, and who was responsible for them.
    lostOpportunities: {
      this_week: notBoughtRecords.filter((r) => inRange(r.createdAt, weekFrom, t)).length,
      last_week: notBoughtRecords.filter((r) => inRange(r.createdAt, prevFrom, prevTo)).length,
      list: notBoughtRecords
        .filter((r) => inRange(r.createdAt, weekFrom, t) && !boughtIds.has(r.leadId))
        .slice(0, 20)
        .map((r) => ({
          customer: r.leadName,
          responsible: r.agentName ?? userName(r.agentId),
          branch: branchOf(r.branchId),
          reasons: r.reasons.map(reasonLabel),
          note: r.note ?? r.otherText ?? null,
        })),
      notInterested: leads
        .filter((l) => l.status === "not_interested" && !boughtIds.has(l.id))
        .slice(0, 10)
        .map((l) => ({ customer: l.name, responsible: userName(l.assignedAgentId), branch: branchOf(l.branchId) })),
    },
    referrals: referrerRows(leads, bookings).slice(0, 8).map((r) => ({ customer: r.name, referred: r.referred, bought: r.bought, totalEGP: r.totalEGP })),
    customerReviews: {
      this_week: reviewStats(weekReviews, notes),
      last_week: reviewStats(prevReviews, notes),
      allTime: reviewStats(reviews, notes),
      openComplaints: reviews
        .filter((r) => isComplaint(r) && complaintState(r, notes) !== "resolved")
        .sort((a, b) => complaintOpenedAt(a).localeCompare(complaintOpenedAt(b)))
        .slice(0, 15)
        .map((r) => ({
          customer: r.leadName,
          branch: branchOf(r.branchId),
          agent: r.agentName ?? userName(r.agentId),
          since: complaintOpenedAt(r).slice(0, 10),
          state: complaintStateLabel[complaintState(r, notes)],
          lateOver24hWithoutFollowUp: isLateComplaint(r, notes),
          stars: r.response?.rating ?? null,
          comment: r.response?.comment?.slice(0, 200) ?? null,
        })),
    },
    customers: leads.slice(0, 150).map((l) => {
      const c = customers.find((x) => x.leadId === l.id);
      return {
        name: l.name,
        branch: branchOf(l.branchId),
        agent: userName(l.assignedAgentId),
        status: l.status,
        source: l.source,
        broker: l.brokerName ?? null,
        purchasesTotalEGP: c?.total ?? 0,
        nextFollowUp: l.nextFollowUpDate?.slice(0, 10) ?? null,
      };
    }),
  };
}

export type Snapshot = ReturnType<typeof buildSnapshot>;
