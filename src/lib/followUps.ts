import type { FollowUp, FollowUpPriority, FollowUpReschedule } from "../types/crm";

export const priorityNames: Record<FollowUpPriority, string> = { high: "عالية", normal: "عادية", low: "منخفضة" };
export const priorityOf = (f: Pick<FollowUp, "priority">): FollowUpPriority => f.priority ?? "normal";
const priorityRank: Record<FollowUpPriority, number> = { high: 0, normal: 1, low: 2 };

const open = (f: FollowUp) => f.status !== "completed" && f.status !== "cancelled";

/** "HH:mm" when the follow-up was planned for a time of day, otherwise undefined (a date only). */
export const timeOfDay = (f: Pick<FollowUp, "scheduledAt">): string | undefined => {
  const m = /T(\d{2}:\d{2})/.exec(f.scheduledAt);
  return m ? m[1] : undefined;
};

/** Joins a date with an optional time the way scheduledAt is stored. */
export const joinSchedule = (date: string, time?: string) => (time && /^\d{2}:\d{2}$/.test(time) ? `${date}T${time}` : date);

export type Bucket = "overdue" | "today" | "upcoming" | "completed" | "cancelled";

/**
 * Where a follow-up belongs. `today` is the Cairo date as YYYY-MM-DD. This mirrors followUpStatus (a past date is overdue,
 * today is "today", later is upcoming) so the screen and the sidebar badge always agree.
 */
export function bucketOf(f: FollowUp, today: string): Bucket {
  if (f.status === "completed") return "completed";
  if (f.status === "cancelled") return "cancelled";
  const d = f.scheduledAt.slice(0, 10);
  return d < today ? "overdue" : d === today ? "today" : "upcoming";
}

export function bucketize(list: FollowUp[], today: string): Record<Bucket, FollowUp[]> {
  const out: Record<Bucket, FollowUp[]> = { overdue: [], today: [], upcoming: [], completed: [], cancelled: [] };
  for (const f of list) out[bucketOf(f, today)].push(f);
  const byTime = (a: FollowUp, b: FollowUp) => a.scheduledAt.localeCompare(b.scheduledAt);
  // Most urgent first, then the earliest.
  const byUrgency = (a: FollowUp, b: FollowUp) => priorityRank[priorityOf(a)] - priorityRank[priorityOf(b)] || byTime(a, b);
  out.overdue.sort(byUrgency);
  out.today.sort(byUrgency);
  out.upcoming.sort(byTime);
  out.completed.sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
  return out;
}

export type ReminderLevel = "overdue" | "late_today" | "soon" | "today";

export interface FollowUpReminder {
  followUp: FollowUp;
  level: ReminderLevel;
  /** Whole days late, for overdue ones. */
  daysLate: number;
}

const DAY = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY);

/**
 * What a person should be told about right now. `today` is the Cairo date and `time` the Cairo time (HH:mm).
 *  - overdue: the date has passed
 *  - late_today: planned for a time today that has already passed
 *  - soon: planned for a time within the next `soonMinutes`
 *  - today: due today with no time of day (shown, but not an interruption)
 * Only the person the follow-up is assigned to is reminded.
 */
export function pendingReminders(list: FollowUp[], userId: string, today: string, time: string, soonMinutes = 60): FollowUpReminder[] {
  const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const out: FollowUpReminder[] = [];
  for (const f of list) {
    if (!open(f) || f.assignedAgentId !== userId) continue;
    const d = f.scheduledAt.slice(0, 10);
    if (d < today) {
      out.push({ followUp: f, level: "overdue", daysLate: daysBetween(d, today) });
    } else if (d === today) {
      const t = timeOfDay(f);
      if (!t) out.push({ followUp: f, level: "today", daysLate: 0 });
      else if (minutes(t) <= minutes(time)) out.push({ followUp: f, level: "late_today", daysLate: 0 });
      else if (minutes(t) - minutes(time) <= soonMinutes) out.push({ followUp: f, level: "soon", daysLate: 0 });
      else out.push({ followUp: f, level: "today", daysLate: 0 });
    }
  }
  const rank: Record<ReminderLevel, number> = { overdue: 0, late_today: 1, soon: 2, today: 3 };
  return out.sort((a, b) => rank[a.level] - rank[b.level] || priorityRank[priorityOf(a.followUp)] - priorityRank[priorityOf(b.followUp)] || a.followUp.scheduledAt.localeCompare(b.followUp.scheduledAt));
}

/** The reminders that deserve an interruption (a notification), not just a list entry. */
export const interrupting = (r: FollowUpReminder) => r.level === "overdue" || r.level === "late_today" || r.level === "soon";

const MAX_LOG = 20;

/** The follow-up after it was moved to a new date, with the move recorded. Completed or cancelled ones cannot be moved. */
export function rescheduled(f: FollowUp, to: string, by: { id: string; name: string }, reason: string, at: string): FollowUp {
  if (!open(f)) throw new Error("المتابعة اتقفلت ومينفعش تتأجل.");
  const why = reason.trim();
  if (!why) throw new Error("اكتب سبب التأجيل.");
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(to)) throw new Error("الموعد الجديد غير صحيح.");
  if (to === f.scheduledAt) throw new Error("الموعد الجديد زي القديم.");
  const entry: FollowUpReschedule = { at, from: f.scheduledAt, to, byId: by.id, byName: by.name, reason: why };
  return {
    ...f,
    scheduledAt: to,
    rescheduleCount: (f.rescheduleCount ?? 0) + 1,
    rescheduleLog: [...(f.rescheduleLog ?? []), entry].slice(-MAX_LOG),
    status: "upcoming",
  };
}

/** Counts for the header cards. */
export function followUpCounts(list: FollowUp[], today: string) {
  const b = bucketize(list, today);
  return { overdue: b.overdue.length, today: b.today.length, upcoming: b.upcoming.length, completed: b.completed.length, cancelled: b.cancelled.length };
}

/** The current Cairo time as HH:mm (the app's working time zone). */
export const cairoTime = (now = new Date()) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
