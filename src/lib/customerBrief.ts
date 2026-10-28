import type { Booking, FollowUp, Lead, NotBoughtRecord, ReviewNote, ReviewRequest, TimelineEvent, Visit } from "../types/crm";
import { departmentNames, followUpStatus, sourceNames, statusNames, today } from "./presentation";
import { buildTimeline } from "./timeline";
import { complaintState, complaintStateLabel, isComplaint } from "./reviews";
import { reasonLabel } from "./notBought";
import { bookingSplit } from "./purchases";

export interface BriefInput {
  lead: Lead;
  visits: Visit[];
  followUps: FollowUp[];
  bookings: Booking[];
  notBoughtRecords: NotBoughtRecord[];
  reviewRequests: ReviewRequest[];
  reviewNotes: ReviewNote[];
  timelineEvents: TimelineEvent[];
}

const day = (iso?: string) => (iso ? iso.slice(0, 10) : null);
const clip = (s: string | undefined, n: number) => (s ? s.slice(0, n) : null);

/** Everything the assistant may know about one customer, kept compact. It is built from what the signed-in user can already see. */
export function buildCustomerBrief({ lead, visits, followUps, bookings, notBoughtRecords, reviewRequests, reviewNotes, timelineEvents }: BriefInput) {
  const id = lead.id;
  const myBookings = bookings.filter((b) => b.leadId === id && b.bookingStatus !== "cancelled");
  const myReviews = reviewRequests.filter((r) => r.leadId === id);
  return {
    today: today(),
    customer: {
      name: lead.name,
      status: statusNames[lead.status],
      source: sourceNames[lead.source],
      interests: (lead.interests?.length ? lead.interests : [lead.department]).map((d) => departmentNames[d]),
      branch: lead.branchName ?? null,
      responsibleEmployee: lead.assignedAgentName ?? null,
      broker: lead.brokerName ?? null,
      referredBy: lead.referredByName ?? null,
      registeredOn: day(lead.createdAt),
      notes: clip(lead.notes, 400),
    },
    purchases: myBookings.map((b) => ({
      date: b.bookingDate,
      totalEGP: b.amount,
      byDepartmentEGP: Object.fromEntries(Object.entries(bookingSplit(b)).filter(([, v]) => v > 0).map(([k, v]) => [departmentNames[k as keyof typeof departmentNames], v])),
    })),
    visits: visits
      .filter((v) => v.linkedLeadId === id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
      .map((v) => ({ date: v.date, reason: clip(v.reason, 120), outcome: v.outcome, notes: clip(v.notes, 200) })),
    notBought: notBoughtRecords
      .filter((r) => r.leadId === id)
      .slice(0, 4)
      .map((r) => ({ date: day(r.createdAt), reasons: r.reasons.map(reasonLabel), other: r.otherText ?? null, note: clip(r.note, 200) })),
    followUps: followUps
      .filter((f) => f.leadId === id)
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .slice(0, 8)
      .map((f) => ({
        due: day(f.scheduledAt),
        status: followUpStatus(f),
        kind: f.category === "post_sale" ? "بعد البيع" : "بيع",
        reason: clip(f.reason, 160),
        result: clip(f.outcomeResult, 200),
        satisfaction: f.satisfactionRating ?? null,
        referral: clip(f.referralNote, 120),
      })),
    reviews: myReviews
      .filter((r) => r.status === "answered" && r.response)
      .slice(0, 4)
      .map((r) => ({
        about: r.subjectLabel,
        stars: r.response!.rating,
        comment: clip(r.response!.comment, 300),
        complaint: isComplaint(r),
        complaintState: isComplaint(r) ? complaintStateLabel[complaintState(r, reviewNotes)] : null,
        recommendation: r.response!.referral ? `رشّح ${r.response!.referral.name}` : null,
      })),
    reviewPending: myReviews.filter((r) => r.status === "sent").length,
    recentHistory: buildTimeline(id, timelineEvents, reviewRequests, reviewNotes)
      .slice(0, 12)
      .map((e) => ({ date: day(e.at), title: e.title, details: clip(e.details, 160) })),
  };
}

/** Changes whenever something new is recorded about the customer, so a saved brief is never shown stale. */
export function briefVersion(input: BriefInput): string {
  const id = input.lead.id;
  const stamps = [
    input.lead.status,
    input.lead.notes?.length ?? 0,
    ...input.timelineEvents.filter((e) => e.leadId === id).map((e) => e.timestamp),
    ...input.followUps.filter((f) => f.leadId === id).map((f) => `${f.id}${f.status}${f.completedAt ?? ""}`),
    ...input.reviewRequests.filter((r) => r.leadId === id).map((r) => `${r.id}${r.status}${r.answeredAt ?? ""}`),
    ...input.reviewNotes.filter((n) => input.reviewRequests.some((r) => r.id === n.requestId && r.leadId === id)).map((n) => n.id),
    ...input.bookings.filter((b) => b.leadId === id).map((b) => `${b.id}${b.bookingStatus}`),
    ...input.notBoughtRecords.filter((r) => r.leadId === id).map((r) => r.id),
  ];
  let h = 0;
  for (const ch of stamps.join("|")) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return String(h >>> 0);
}
