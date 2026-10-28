import type { FollowUpType, ReviewNote, ReviewRequest, TimelineEvent, TimelineEventType } from "../types/crm";
import { sourceNames, statusNames } from "./presentation";
import { isComplaint } from "./reviews";

export type TimelineGroup = "visit" | "purchase" | "followup" | "review" | "note" | "account";

export const timelineGroupLabels: Record<TimelineGroup, string> = {
  visit: "الزيارات",
  purchase: "المشتريات",
  followup: "المتابعات",
  review: "التقييمات",
  note: "ملاحظات واتصالات",
  account: "بيانات الحساب",
};

export interface TimelineItem {
  id: string;
  at: string;
  type: TimelineEventType | "review_answered" | "review_reminder" | "review_cancelled" | "complaint_note";
  group: TimelineGroup;
  title: string;
  details: string;
  by: string;
  tone?: "good" | "bad";
}

const followUpTypes: Record<FollowUpType, string> = {
  call: "اتصال",
  whatsapp: "واتساب",
  branch_visit: "زيارة فرع",
  email: "بريد",
  meeting: "اجتماع",
};

const groupOf: Record<TimelineEventType, TimelineGroup> = {
  created: "account",
  visit: "visit",
  inquiry: "note",
  call: "note",
  note: "note",
  status_change: "account",
  followup_created: "followup",
  followup_result: "followup",
  agent_reassigned: "account",
  branch_transferred: "account",
  booking_created: "purchase",
  review_requested: "review",
  review_received: "review",
  admin_action: "account",
};

const status = (key: string) => (statusNames as Record<string, string>)[key] ?? key;

/** Old events were saved with raw keys (interested, call); show them in plain Arabic and drop empty fragments. */
export function cleanEvent(e: TimelineEvent): { title: string; details: string } {
  let title = e.title;
  let details = e.details || "";
  if (e.type === "status_change") {
    title = title.replace(/\(([a-z_]+)\)/, (_, k) => `(${status(k)})`);
    details = details.replace(/\b(new|uncontacted|contacted|interested|prospect|needs_followup|not_interested|booked)\b/g, status);
  }
  if (e.type === "followup_created")
    title = title.replace(/\((call|whatsapp|branch_visit|email|meeting)\)/, (_, k: FollowUpType) => `(${followUpTypes[k]})`);
  if (e.type === "created")
    details = details
      .replace(/^تم إضافة العميل بواسطة .*?،\s*/, "")
      .replace(/المصدر:\s*([a-z_]+)/, (_, k) => `المصدر: ${(sourceNames as Record<string, string>)[k] ?? k}`);
  details = details
    .replace(/\s*[.|-]?\s*(الملاحظات|السبب):\s*(?=$|\s*\|)/g, "")
    .replace(/\s*[.|]\s*$/g, "")
    .replace(/\s*undefined\s*/g, " ")
    .trim();
  return { title, details };
}

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/**
 * One customer's history, newest first: what staff recorded, plus what the customer did
 * on their own (answered a review) and how complaints were handled, which live elsewhere.
 */
export function buildTimeline(
  leadId: string,
  events: TimelineEvent[],
  reviews: ReviewRequest[],
  notes: ReviewNote[],
): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const e of events.filter((x) => x.leadId === leadId)) {
    const c = cleanEvent(e);
    items.push({ id: e.id, at: e.timestamp, type: e.type, group: groupOf[e.type] ?? "account", title: c.title, details: c.details, by: e.authorName });
  }
  for (const r of reviews.filter((x) => x.leadId === leadId)) {
    if (r.status === "answered" && r.answeredAt && r.response) {
      const complaint = isComplaint(r);
      items.push({
        id: `ra-${r.id}`,
        at: r.answeredAt,
        type: "review_answered",
        group: "review",
        title: complaint ? "العميل بعت شكوى" : `العميل قيّم تجربته ${stars(r.response.rating)}`,
        details: [r.subjectLabel, r.response.comment ? `«${r.response.comment}»` : ""].filter(Boolean).join(" · "),
        by: "العميل",
        tone: complaint ? "bad" : r.response.rating >= 4 ? "good" : undefined,
      });
    }
    if (r.reminderSentAt)
      items.push({ id: `rr-${r.id}`, at: r.reminderSentAt, type: "review_reminder", group: "review", title: "اتبعت تذكير بالتقييم", details: r.subjectLabel, by: r.agentName || "" });
    if (r.status === "cancelled" && r.cancelledAt)
      items.push({ id: `rc-${r.id}`, at: r.cancelledAt, type: "review_cancelled", group: "review", title: "اتقفل طلب التقييم من غير رد", details: r.cancelReason || r.subjectLabel, by: r.agentName || "" });
  }
  const mine = new Set(reviews.filter((r) => r.leadId === leadId).map((r) => r.id));
  for (const n of notes.filter((x) => mine.has(x.requestId)))
    items.push({
      id: `rn-${n.id}`,
      at: n.at,
      type: "complaint_note",
      group: "review",
      title: n.kind === "resolved" ? "الشكوى اتحلّت" : "متابعة على الشكوى",
      details: n.text,
      by: n.byName,
      tone: n.kind === "resolved" ? "good" : undefined,
    });
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

/** "اليوم" / "امبارح" / a full date with the year, in Cairo time. */
export function dayLabel(iso: string, now = new Date()): string {
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const day = fmt(new Date(iso));
  if (day === fmt(now)) return "النهارده";
  if (day === fmt(new Date(now.getTime() - 86_400_000))) return "امبارح";
  return new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

