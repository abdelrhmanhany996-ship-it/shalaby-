import type { Lead, ReviewNote, ReviewRequest } from "../types/crm";
import { greetingName } from "./names";

export const REVIEW_REMINDER_HOURS = 48;
const HOUR = 3_600_000;

/** 24 random lowercase letters/digits: this is the secret in the customer's link. */
export function newReviewToken(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(random(24), (b) => alphabet[b % alphabet.length]).join("");
}

export function reviewLink(token: string, origin = typeof location !== "undefined" ? location.origin : ""): string {
  return `${origin}/review/?t=${token}`;
}

/** Egyptian mobile numbers to the international form wa.me needs. */
export function whatsappNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("20")) return d;
  if (d.startsWith("0")) return `20${d.slice(1)}`;
  return d;
}

export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`;
}

const firstName = greetingName;

export function requestMessage(lead: Pick<Lead, "name">, _subjectLabel: string, link: string): string {
  return `أهلًا ${firstName(lead.name)} 🌷\nسعدنا بزيارتك لشلبي.\nيشرفنا نعرف رأيك في تجربتك معانا، التقييم بياخد أقل من دقيقة. وأي ملاحظة أو شكوى هنتابعها بنفسنا في نفس اليوم:\n${link}`;
}

export function reminderMessage(lead: Pick<Lead, "name">, link: string): string {
  return `أهلًا ${firstName(lead.name)}، تذكير لطيف 🌷 لو فاضي دقيقة ممكن تقيّم تجربتك معانا؟ رأيك بيفرق معانا:\n${link}`;
}

/** Where a request stands for the salesperson who sent it. */
export type ReviewPhase = "waiting" | "reminder_due" | "reminder_sent" | "expired" | "answered" | "cancelled";

export function reviewPhase(r: ReviewRequest, now = Date.now()): ReviewPhase {
  if (r.status === "answered") return "answered";
  if (r.status === "cancelled") return "cancelled";
  if (r.reminderSentAt) {
    return now - new Date(r.reminderSentAt).getTime() >= REVIEW_REMINDER_HOURS * HOUR ? "expired" : "reminder_sent";
  }
  return now - new Date(r.sentAt).getTime() >= REVIEW_REMINDER_HOURS * HOUR ? "reminder_due" : "waiting";
}

/** Complaint = the customer said so, or rated low; the AI can also flag one hidden in a comment. */
export function isComplaint(r: ReviewRequest): boolean {
  if (r.status !== "answered") return false;
  return !!r.isComplaint || (r.response?.rating ?? 5) <= 2 || r.ai?.kind === "complaint";
}

export type ComplaintState = "open" | "followed_up" | "resolved";

export function complaintState(r: ReviewRequest, notes: ReviewNote[]): ComplaintState {
  const mine = notes.filter((n) => n.requestId === r.id).sort((a, b) => a.at.localeCompare(b.at));
  if (!mine.length) return "open";
  return mine[mine.length - 1].kind === "resolved" ? "resolved" : "followed_up";
}

export const complaintStateLabel: Record<ComplaintState, string> = {
  open: "جديدة",
  followed_up: "تحت المتابعة",
  resolved: "اتحلّت",
};

export function averageRating(list: ReviewRequest[]): number | null {
  const rated = list.filter((r) => r.status === "answered" && r.response).map((r) => r.response!.rating);
  return rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
}

/** A complaint nobody has followed up on for this long is escalated to the managers. */
export const COMPLAINT_ESCALATION_HOURS = 24;

export function complaintOpenedAt(r: ReviewRequest): string {
  return r.answeredAt || r.sentAt;
}

/** Open, with no follow-up at all, for more than a day. */
export function isLateComplaint(r: ReviewRequest, notes: ReviewNote[], now = Date.now()): boolean {
  return (
    isComplaint(r) &&
    complaintState(r, notes) === "open" &&
    now - new Date(complaintOpenedAt(r)).getTime() >= COMPLAINT_ESCALATION_HOURS * HOUR
  );
}

/** Hours from the customer's complaint to the note that closed it; null while it is still open. */
export function resolutionHours(r: ReviewRequest, notes: ReviewNote[]): number | null {
  const done = notes.filter((n) => n.requestId === r.id && n.kind === "resolved").sort((a, b) => a.at.localeCompare(b.at))[0];
  if (!done) return null;
  return Math.max(0, Math.round((new Date(done.at).getTime() - new Date(complaintOpenedAt(r)).getTime()) / HOUR));
}

export interface ReviewStats {
  sent: number;
  answered: number;
  responseRatePercent: number;
  average: number | null;
  complaints: { total: number; open: number; followedUp: number; resolved: number; late: number; avgResolutionHours: number | null };
}

export function reviewStats(list: ReviewRequest[], notes: ReviewNote[], now = Date.now()): ReviewStats {
  const sent = list.filter((r) => r.status !== "cancelled");
  const answered = sent.filter((r) => r.status === "answered");
  const complaints = answered.filter(isComplaint);
  const states = complaints.map((r) => complaintState(r, notes));
  const hours = complaints.map((r) => resolutionHours(r, notes)).filter((h): h is number => h !== null);
  const avg = averageRating(answered);
  return {
    sent: sent.length,
    answered: answered.length,
    responseRatePercent: sent.length ? Math.round((answered.length / sent.length) * 100) : 0,
    average: avg === null ? null : Number(avg.toFixed(1)),
    complaints: {
      total: complaints.length,
      open: states.filter((s) => s === "open").length,
      followedUp: states.filter((s) => s === "followed_up").length,
      resolved: states.filter((s) => s === "resolved").length,
      late: complaints.filter((r) => isLateComplaint(r, notes, now)).length,
      avgResolutionHours: hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : null,
    },
  };
}

/** Who a review request was sent to: a customer, or a broker who came on a visit. */
export type ReviewParty = { leadId: string } | { brokerId: string };
const isParty = (r: ReviewRequest, p: ReviewParty) =>
  "brokerId" in p ? r.partyKind === "broker" && r.brokerId === p.brokerId : r.partyKind !== "broker" && r.leadId === p.leadId;

/** Every request sent to that person, newest first; cancelled ones do not count as "sent". */
export function requestsTo(requests: ReviewRequest[], party: ReviewParty): ReviewRequest[] {
  return requests.filter((r) => r.status !== "cancelled" && isParty(r, party)).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

/** The request already made for exactly this visit or purchase, if any (so the same ask is not sent twice). */
export function requestForSubject(requests: ReviewRequest[], party: ReviewParty, kind: ReviewRequest["subjectKind"], subjectId?: string): ReviewRequest | undefined {
  return requestsTo(requests, party).find((r) => r.subjectKind === kind && (r.subjectId ?? "") === (subjectId ?? ""));
}
