import type { Booking, EmployeeTarget, FollowUp, Lead, NotBoughtRecord, TargetSettings, User } from "../types/crm";
import { notBoughtReasons } from "./notBought";
import { bucketOf, priorityOf, timeOfDay } from "./followUps";
import { lastOutcome } from "./purchases";
import { statusNames } from "./presentation";
import { monthOf, overview, targetStateNames } from "./targets";
import { isSalesCapable } from "./permissions";

/**
 * What the daily plan is allowed to see. Everything here comes from the lists the signed-in user already holds (the security rules
 * and the workspace already limited them to that person's branches and customers), so a plan can never mention data outside their
 * scope. It holds only what the advice needs: customer names (for a message draft) but no phone numbers or e-mails.
 */
export interface CoachInput {
  user: User;
  today: string;
  followUps: FollowUp[];
  leads: Lead[];
  bookings: Booking[];
  notBoughtRecords: NotBoughtRecord[];
  users: User[];
  targets: EmployeeTarget[];
  targetSettings: TargetSettings;
  /** Only people who may see targets get target facts. */
  canSeeTargets: boolean;
}

const MAX_CANDIDATES = 24;
const MAX_TEAM = 12;
const NO_FOLLOWUP_STALE_DAYS = 14;
const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / DAY);
const clip = (s: string | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export interface CoachCandidate {
  leadId: string;
  customer: string;
  kind: "follow_up" | "no_follow_up";
  followUpDue?: string;
  followUpTime?: string;
  daysOverdue?: number;
  priority?: string;
  rescheduledTimes?: number;
  reason?: string;
  responsible?: string;
  leadStatus: string;
  daysSinceLastContact: number | null;
  interest?: string;
  bought?: { date: string; amountEGP: number } | null;
  notBoughtReasons?: string[];
  customerStars?: number;
  note?: string;
}

export interface CoachSnapshot {
  today: string;
  viewer: { name: string; role: string };
  candidates: CoachCandidate[];
  counts: { openFollowUps: number; overdue: number; dueToday: number; customersWithoutFollowUp: number };
  me?: unknown;
  team?: unknown[];
  month: string;
  dataNotes: string[];
}

const urgency = (c: CoachCandidate) => (c.kind === "follow_up" ? (c.daysOverdue ?? 0) * 10 + (c.priority === "high" ? 25 : c.priority === "low" ? -10 : 0) + (c.followUpDue === undefined ? 0 : 1) : 5);

export function buildCoachSnapshot(i: CoachInput): CoachSnapshot {
  const month = monthOf(i.today);
  const name = (id?: string) => i.users.find((u) => u.id === id)?.name;
  const open = i.followUps.filter((f) => !["completed", "cancelled"].includes(f.status));
  const leadById = new Map(i.leads.map((l) => [l.id, l]));
  const lastContact = (l?: Lead) => (l?.lastContactDate ? days(l.lastContactDate, i.today) : null);

  const base = (l: Lead | undefined, leadId: string, customer: string) => {
    const out = lastOutcome(leadId, i.bookings, i.notBoughtRecords);
    const reasons = i.notBoughtRecords
      .filter((n) => n.leadId === leadId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.reasons;
    return {
      leadId,
      customer,
      leadStatus: l ? statusNames[l.status] : "غير معروف",
      daysSinceLastContact: lastContact(l),
      interest: l?.courseOfInterest ? clip(l.courseOfInterest, 60) : undefined,
      bought: out.kind === "bought" ? { date: out.date, amountEGP: out.amount } : null,
      notBoughtReasons: reasons?.map((r) => notBoughtReasons.find((x) => x.id === r)?.label ?? r).slice(0, 3),
      customerStars: l?.customerRatingStars,
      note: l?.notes ? clip(l.notes, 160) : undefined,
    };
  };

  const fromFollowUps: CoachCandidate[] = open
    .filter((f) => f.leadId && leadById.has(f.leadId))
    .map((f) => ({
      ...base(leadById.get(f.leadId), f.leadId, f.leadName),
      kind: "follow_up" as const,
      followUpDue: f.scheduledAt.slice(0, 10),
      followUpTime: timeOfDay(f),
      daysOverdue: Math.max(0, days(f.scheduledAt, i.today)),
      priority: priorityOf(f),
      rescheduledTimes: f.rescheduleCount ?? 0,
      reason: clip(f.reason, 140),
      responsible: name(f.assignedAgentId),
    }));

  // Customers nobody is following up: interested, but no open follow-up and not touched for a while.
  const withOpen = new Set(open.map((f) => f.leadId));
  const orphans = i.leads.filter(
    (l) =>
      !withOpen.has(l.id) &&
      ["new", "uncontacted", "contacted", "interested", "prospect", "needs_followup"].includes(l.status) &&
      (l.lastContactDate ? days(l.lastContactDate, i.today) >= NO_FOLLOWUP_STALE_DAYS : days(l.createdAt, i.today) >= NO_FOLLOWUP_STALE_DAYS),
  );
  const fromOrphans: CoachCandidate[] = orphans.map((l) => ({ ...base(l, l.id, l.name), kind: "no_follow_up" as const, responsible: name(l.assignedAgentId) }));

  const candidates = [...fromFollowUps, ...fromOrphans].sort((a, b) => urgency(b) - urgency(a)).slice(0, MAX_CANDIDATES);

  const dueToday = open.filter((f) => bucketOf(f, i.today) === "today").length;
  const overdue = open.filter((f) => bucketOf(f, i.today) === "overdue").length;

  // Target performance: everyone sees their own; people who may see targets see their team's.
  const o = overview(i.users, i.targets, i.bookings, month, i.today, i.targetSettings);
  const mineRow = o.rows.find((r) => r.user.id === i.user.id);
  const me = isSalesCapable(i.user)
    ? mineRow
      ? { target: mineRow.target, achievedEGP: mineRow.achieved, percent: mineRow.percent, remainingEGP: mineRow.remaining, expectedPercentByToday: mineRow.expectedPercent, state: targetStateNames[mineRow.state], hasTarget: mineRow.target > 0 }
      : undefined
    : undefined;

  const team = i.canSeeTargets
    ? o.rows
        .filter((r) => r.user.id !== i.user.id)
        .map((r) => {
          const mine = open.filter((f) => f.assignedAgentId === r.user.id);
          return {
            name: r.user.name,
            target: r.target,
            achievedEGP: r.achieved,
            percent: r.percent,
            expectedPercentByToday: r.expectedPercent,
            remainingEGP: r.remaining,
            state: targetStateNames[r.state],
            purchasesThisMonth: r.purchases,
            overdueFollowUps: mine.filter((f) => bucketOf(f, i.today) === "overdue").length,
            openFollowUps: mine.length,
            movedFollowUps: mine.reduce((s, f) => s + (f.rescheduleCount ?? 0), 0),
            hasTarget: r.target > 0,
          };
        })
        .filter((r) => r.hasTarget || r.overdueFollowUps > 0)
        .sort((a, b) => (a.state === targetStateNames.behind ? -1 : 0) - (b.state === targetStateNames.behind ? -1 : 0) || b.overdueFollowUps - a.overdueFollowUps)
        .slice(0, MAX_TEAM)
    : undefined;

  const notes: string[] = [];
  if (!candidates.length) notes.push("مفيش متابعات مفتوحة ولا عملاء مهملين داخل نطاقك دلوقتي.");
  if (i.canSeeTargets && !o.rows.some((r) => r.target > 0)) notes.push("لسه ما اتحددتش أهداف للشهر ده، فمفيش مقارنة بالأهداف.");
  if (open.length > fromFollowUps.length) notes.push("فيه متابعات مفتوحة مش مربوطة بعميل ظاهر ليك، فمتحسبتش.");
  if (fromFollowUps.length + fromOrphans.length > MAX_CANDIDATES) notes.push(`البيانات المعروضة هي أهم ${MAX_CANDIDATES} حالة فقط من ${fromFollowUps.length + fromOrphans.length}.`);

  return {
    today: i.today,
    viewer: { name: i.user.name, role: i.user.role },
    candidates,
    counts: { openFollowUps: open.length, overdue, dueToday, customersWithoutFollowUp: orphans.length },
    ...(me ? { me } : {}),
    ...(team ? { team } : {}),
    month,
    dataNotes: notes,
  };
}

/** A short fingerprint of what the plan was built from: when it changes, new advice is worth asking for. */
export function snapshotFingerprint(s: CoachSnapshot): string {
  const text = JSON.stringify([s.today, s.counts, s.candidates.map((c) => [c.leadId, c.followUpDue, c.followUpTime, c.priority, c.rescheduledTimes, c.leadStatus]), s.me, s.team]);
  let h = 5381;
  for (let k = 0; k < text.length; k++) h = ((h << 5) + h + text.charCodeAt(k)) | 0;
  return String(h >>> 0);
}

