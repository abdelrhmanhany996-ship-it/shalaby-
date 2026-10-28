import type { BrokerEntity, Lead, ReminderDone, ReviewRequest, Visit } from "../types/crm";
import { pendingReferral } from "./referrals";
import { reviewPhase, requestForSubject } from "./reviews";

/** Things the system reminds a salesperson to do. They are worked out from the data, so they vanish by themselves once done. */
export interface ReminderTask {
  /** Stable key: also the id of the "done" record. */
  id: string;
  kind: "review_send" | "review_nudge" | "referral_register";
  title: string;
  detail: string;
  /** Who it is about. */
  leadId?: string;
  brokerId?: string;
  reviewId?: string;
  visitId?: string;
  branchId: string;
  agentId: string;
  /** The day it started to count. */
  since: string;
  level: "overdue" | "due";
}

const DAY = 86_400_000;
export const REMINDER_WINDOW_DAYS = 14;
const dayOf = (s: string) => s.slice(0, 10);

export function reminderTasks(
  d: { visits: Visit[]; reviewRequests: ReviewRequest[]; leads: Lead[]; brokers: BrokerEntity[]; reminderDone: ReminderDone[] },
  userId: string,
  now = Date.now(),
): ReminderTask[] {
  const done = new Set(d.reminderDone.map((x) => x.id));
  const out: ReminderTask[] = [];
  const todayStr = new Date(now).toISOString().slice(0, 10);
  const ageDays = (date: string) => Math.floor((new Date(todayStr).getTime() - new Date(dayOf(date)).getTime()) / DAY);

  for (const v of d.visits) {
    if (v.receivedByAgentId !== userId) continue;
    const age = ageDays(v.date);
    if (age < 0 || age > REMINDER_WINDOW_DAYS) continue;
    const level = age >= 2 ? "overdue" : "due";
    if (v.linkedLeadId && v.visitorType !== "broker") {
      const id = `rs:${v.id}:client`;
      if (!done.has(id) && d.leads.some((l) => l.id === v.linkedLeadId) && !requestForSubject(d.reviewRequests, { leadId: v.linkedLeadId }, "visit", v.id)) {
        out.push({ id, kind: "review_send", title: `ابعت طلب تقييم لـ${v.visitorName}`, detail: `زيارة ${v.branchName || "الفرع"} يوم ${v.date}`, leadId: v.linkedLeadId, visitId: v.id, branchId: v.branchId, agentId: userId, since: v.date, level });
      }
    }
    if (v.brokerId && v.visitorType !== "client") {
      const id = `rs:${v.id}:broker`;
      if (!done.has(id) && d.brokers.some((b) => b.id === v.brokerId) && !requestForSubject(d.reviewRequests, { brokerId: v.brokerId }, "visit", v.id)) {
        out.push({ id, kind: "review_send", title: `ابعت طلب تقييم للوسيط ${v.brokerName || ""}`.trim(), detail: `زيارة ${v.branchName || "الفرع"} يوم ${v.date}`, brokerId: v.brokerId, visitId: v.id, branchId: v.branchId, agentId: userId, since: v.date, level });
      }
    }
  }

  for (const r of d.reviewRequests) {
    if (r.agentId !== userId) continue;
    if (reviewPhase(r, now) === "reminder_due" && !done.has(`rn:${r.id}`)) {
      out.push({ id: `rn:${r.id}`, kind: "review_nudge", title: `ذكّر ${r.leadName} بالتقييم`, detail: `${r.subjectLabel}: عدّت 48 ساعة من غير رد`, leadId: r.leadId || undefined, brokerId: r.brokerId, reviewId: r.id, branchId: r.branchId, agentId: userId, since: dayOf(r.sentAt), level: "due" });
    }
    if (pendingReferral(r) && r.partyKind !== "broker" && !done.has(`rf:${r.id}`)) {
      out.push({ id: `rf:${r.id}`, kind: "referral_register", title: `سجّل ترشيح ${r.response?.referral?.name || ""}`.trim(), detail: `${r.leadName} رشّحه في تقييمه`, leadId: r.leadId, reviewId: r.id, branchId: r.branchId, agentId: userId, since: dayOf(r.answeredAt || r.sentAt), level: "due" });
    }
  }
  return out.sort((a, b) => (a.level === b.level ? a.since.localeCompare(b.since) : a.level === "overdue" ? -1 : 1));
}
