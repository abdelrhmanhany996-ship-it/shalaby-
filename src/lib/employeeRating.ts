import type { FollowUp, ReviewRequest, User } from "../types/crm";
import { isComplaint } from "./reviews";
import { isSalesCapable } from "./permissions";

/** A new employee starts near this score and moves toward their real average as ratings come in. */
export const PRIOR_STARS = 4;
export const PRIOR_WEIGHT = 5;
/** Below this many ratings an employee is shown as "too early" instead of being judged. */
export const MIN_RATINGS_FOR_LEVEL = 3;
const DAY = 86_400_000;

export type RatingLevel = "excellent" | "good" | "needs_work" | "new";
export const ratingLevelLabel: Record<RatingLevel, string> = {
  excellent: "ممتاز",
  good: "كويس",
  needs_work: "محتاج تحسين",
  new: "لسه بدري",
};

export interface EmployeeRating {
  userId: string;
  name: string;
  branchId?: string;
  /** Ratings behind the score: customer review links plus satisfaction asked in post-sale calls. */
  count: number;
  /** Plain average of the stars. */
  average: number | null;
  /** The average pulled slightly toward the prior, so one 5-star rating does not rank above fifty 4.8s. */
  score: number | null;
  level: RatingLevel;
  complaints: number;
  /** Customers who answered, out of the review links sent in their name. */
  responseRatePercent: number | null;
  last30: { count: number; average: number | null };
  trend: "up" | "down" | "flat" | null;
}

interface Stars {
  agentId: string;
  stars: number;
  at: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function scoreOf(stars: number[]): { average: number | null; score: number | null } {
  if (!stars.length) return { average: null, score: null };
  const sum = stars.reduce((a, b) => a + b, 0);
  return { average: round1(sum / stars.length), score: round1((sum + PRIOR_STARS * PRIOR_WEIGHT) / (stars.length + PRIOR_WEIGHT)) };
}

export function levelOf(count: number, score: number | null): RatingLevel {
  if (count < MIN_RATINGS_FOR_LEVEL || score === null) return "new";
  return score >= 4.5 ? "excellent" : score >= 4 ? "good" : "needs_work";
}

/** One rating per customer review that was answered, and one per post-sale call that recorded satisfaction. */
export function ratingInputs(reviews: ReviewRequest[], followUps: FollowUp[]): Stars[] {
  const out: Stars[] = [];
  for (const r of reviews)
    if (r.status === "answered" && r.response && r.agentId) out.push({ agentId: r.agentId, stars: r.response.rating, at: r.answeredAt || r.sentAt });
  for (const f of followUps)
    if (f.status === "completed" && f.satisfactionRating && f.assignedAgentId)
      out.push({ agentId: f.assignedAgentId, stars: f.satisfactionRating, at: f.completedAt || f.scheduledAt });
  return out;
}

export function employeeRatings(users: User[], reviews: ReviewRequest[], followUps: FollowUp[], now = Date.now()): EmployeeRating[] {
  const inputs = ratingInputs(reviews, followUps);
  return users
    .filter(isSalesCapable)
    .map((u) => {
      const mine = inputs.filter((i) => i.agentId === u.id);
      const { average, score } = scoreOf(mine.map((i) => i.stars));
      const recent = mine.filter((i) => now - new Date(i.at).getTime() <= 30 * DAY);
      const before = mine.filter((i) => now - new Date(i.at).getTime() > 30 * DAY);
      const r30 = scoreOf(recent.map((i) => i.stars)).average;
      const rBefore = scoreOf(before.map((i) => i.stars)).average;
      const sent = reviews.filter((r) => r.agentId === u.id && r.status !== "cancelled");
      const answered = sent.filter((r) => r.status === "answered");
      return {
        userId: u.id,
        name: u.name,
        branchId: u.branchId,
        count: mine.length,
        average,
        score,
        level: levelOf(mine.length, score),
        complaints: answered.filter(isComplaint).length,
        responseRatePercent: sent.length ? Math.round((answered.length / sent.length) * 100) : null,
        last30: { count: recent.length, average: r30 },
        trend: r30 === null || rBefore === null || recent.length < 2 || before.length < 2 ? null : r30 - rBefore >= 0.3 ? "up" : rBefore - r30 >= 0.3 ? "down" : "flat",
      } as EmployeeRating;
    })
    // Ranked on the score; people with fewer than three ratings are listed after those who can be judged.
    .sort((a, b) => Number(a.level === "new") - Number(b.level === "new") || (b.score ?? -1) - (a.score ?? -1) || b.count - a.count);
}
