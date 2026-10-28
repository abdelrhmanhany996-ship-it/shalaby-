import type { ReviewRequest } from "../types/crm";

/** What customers wrote in their review comments (dated), as text the assistant may read. */
export function reviewsText(leadId: string, reviews: ReviewRequest[]) {
  return reviews
    .filter((r) => r.leadId === leadId && r.status === "answered" && r.response?.comment)
    .map((r) => ({ date: (r.answeredAt || r.sentAt).slice(0, 10), from: "تعليقه في التقييم", text: r.response!.comment! }));
}
