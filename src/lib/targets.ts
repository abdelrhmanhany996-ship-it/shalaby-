import type { Booking, Department, EmployeeTarget, TargetSettings, User } from "../types/crm";
import { bookingSplit, departmentIds } from "./purchases";
import { isSalesCapable } from "./permissions";

/**
 * Employee targets.
 *
 * Achievement is the value of the employee's purchases (bookings) in the month. Bookings are the only sales record the app writes,
 * so nothing is counted twice: each booking belongs to exactly one employee (agentId) and one month (bookingDate).
 * Cancelled and refunded purchases do not count. Old purchase invoices are never added on top of bookings.
 */

export const defaultTargetSettings: TargetSettings = {
  behindBelow: 70,
  achievedFrom: 100,
  departments: [],
  defaultAmount: 0,
  paceAware: true,
};

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.min(max, Math.max(min, v));
};

/** Settings from the database, with anything missing or out of range replaced by a safe value. */
export function sanitizeTargetSettings(raw: Partial<TargetSettings> | null | undefined): TargetSettings {
  const d = defaultTargetSettings;
  const departments = Array.isArray(raw?.departments) ? raw!.departments.filter((x): x is Department => (departmentIds as string[]).includes(x)) : d.departments;
  const achievedFrom = clamp(raw?.achievedFrom, 1, 1000, d.achievedFrom);
  return {
    behindBelow: clamp(raw?.behindBelow, 1, achievedFrom, d.behindBelow),
    achievedFrom,
    departments: [...new Set(departments)],
    defaultAmount: clamp(raw?.defaultAmount, 0, 1_000_000_000, d.defaultAmount),
    paceAware: typeof raw?.paceAware === "boolean" ? raw.paceAware : d.paceAware,
  };
}

export const monthOf = (date: string) => date.slice(0, 7);
export const isMonth = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
export const targetId = (userId: string, month: string) => `tgt-${userId}-${month}`;

export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const daysInMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** How much of the month has passed on `today` (YYYY-MM-DD): 0 before it starts, 1 once it is over. */
export function monthProgress(month: string, today: string): number {
  const cur = monthOf(today);
  if (cur < month) return 0;
  if (cur > month) return 1;
  return Number(today.slice(8, 10)) / daysInMonth(month);
}

export interface Achievement {
  amount: number;
  /** How many purchases made it up. */
  purchases: number;
  byDepartment: Record<Department, number>;
}

/** What one employee achieved in a month, from the purchases visible to the caller. Each booking id is counted once. */
export function achievedFor(userId: string, month: string, bookings: Booking[], settings: TargetSettings): Achievement {
  const wanted = settings.departments.length ? settings.departments : departmentIds;
  const byDepartment = { construction: 0, decor: 0, garden: 0, general: 0 } as Record<Department, number>;
  const seen = new Set<string>();
  let purchases = 0;
  for (const b of bookings) {
    if (seen.has(b.id) || b.agentId !== userId || monthOf(b.bookingDate) !== month) continue;
    seen.add(b.id);
    if (b.bookingStatus === "cancelled" || b.paymentStatus === "refunded") continue;
    const split = bookingSplit(b);
    let counted = 0;
    for (const dep of wanted) {
      byDepartment[dep] += split[dep] || 0;
      counted += split[dep] || 0;
    }
    if (counted > 0) purchases++;
  }
  const amount = wanted.reduce((s, dep) => s + byDepartment[dep], 0);
  return { amount, purchases, byDepartment };
}

export type TargetState = "no_target" | "achieved" | "on_track" | "behind" | "missed";

export const targetStateNames: Record<TargetState, string> = {
  no_target: "بدون هدف",
  achieved: "حقّق الهدف",
  on_track: "ماشي كويس",
  behind: "متأخر عن الهدف",
  missed: "ما حققش الهدف",
};

export interface Performance {
  target: number;
  achieved: number;
  remaining: number;
  /** Achieved as a percent of the target (not capped, so over-achievement shows). */
  percent: number;
  /** Where the employee should be by today, as a percent of the target (100 for a finished month, 0 for a future one). */
  expectedPercent: number;
  state: TargetState;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Judges achievement against the target.
 *  - achieved: percent >= achievedFrom
 *  - month over and not achieved: missed
 *  - otherwise compare with the pace (or with the full target when pace is off): below `behindBelow` percent of where they should be is behind.
 */
export function evaluate(target: number, achieved: number, month: string, today: string, settings: TargetSettings): Performance {
  const progress = monthProgress(month, today);
  const percent = target > 0 ? round1((achieved / target) * 100) : 0;
  const expectedPercent = settings.paceAware ? round1(progress * 100) : 100;
  const remaining = Math.max(0, target - achieved);
  if (!(target > 0)) return { target: 0, achieved, remaining: 0, percent: 0, expectedPercent, state: "no_target" };
  if (percent >= settings.achievedFrom) return { target, achieved, remaining, percent, expectedPercent, state: "achieved" };
  if (progress >= 1) return { target, achieved, remaining, percent, expectedPercent, state: "missed" };
  const ratio = expectedPercent > 0 ? (percent / expectedPercent) * 100 : 100;
  return { target, achieved, remaining, percent, expectedPercent, state: ratio < settings.behindBelow ? "behind" : "on_track" };
}

export interface TargetRow extends Performance {
  user: Pick<User, "id" | "name" | "branchId" | "role">;
  purchases: number;
  hasRow: boolean;
}

/** The people targets apply to: every active staff member, the owner included (the developer account is not staff). */
export const targetable = (u: Pick<User, "active" | "role">) => u.active && u.role !== "admin";
/** People who work across all branches have no branch; their target row is stored without one. */
const crossBranch = (u: Pick<User, "role">) => ["general_manager", "regional_manager"].includes(u.role);

/**
 * One row per employee for the month: their own target (or the default), what they achieved, and how that stands.
 * `total` adds the rows once; `otherAchieved` is what visible purchases made by people NOT in the list came to,
 * so the overview can always be reconciled with the plain purchases total.
 */
export function overview(users: User[], targets: EmployeeTarget[], bookings: Booking[], month: string, today: string, settings: TargetSettings) {
  const byUser = new Map<string, EmployeeTarget>();
  for (const t of targets) if (t.month === month) byUser.set(t.userId, t);
  const rows: TargetRow[] = users.filter(targetable).map((u) => {
    const row = byUser.get(u.id);
    const target = row ? row.amount : settings.defaultAmount;
    const a = achievedFor(u.id, month, bookings, settings);
    return { ...evaluate(target, a.amount, month, today, settings), user: { id: u.id, name: u.name, branchId: u.branchId, role: u.role }, purchases: a.purchases, hasRow: !!row };
  });
  const listed = new Set(rows.map((r) => r.user.id));
  const others = [...new Set(bookings.map((b) => b.agentId))].filter((id) => !listed.has(id));
  const otherAchieved = others.reduce((s, id) => s + achievedFor(id, month, bookings, settings).amount, 0);
  const target = rows.reduce((s, r) => s + r.target, 0);
  const achieved = rows.reduce((s, r) => s + r.achieved, 0);
  return {
    rows: rows.sort((a, b) => stateRank[a.state] - stateRank[b.state] || a.percent - b.percent),
    total: { target, achieved, remaining: Math.max(0, target - achieved), percent: target > 0 ? round1((achieved / target) * 100) : 0 },
    otherAchieved,
  };
}

const stateRank: Record<TargetState, number> = { behind: 0, missed: 1, on_track: 2, no_target: 3, achieved: 4 };

/** The target row after setting the amount: a new one, or the existing one with the change recorded. */
export function withAmount(
  existing: EmployeeTarget | undefined,
  user: Pick<User, "id" | "name" | "branchId" | "role">,
  month: string,
  amount: number,
  note: string | undefined,
  by: { id: string; name: string },
  now: string,
): EmployeeTarget {
  if (!isMonth(month)) throw new Error("الشهر غير صحيح.");
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) throw new Error("قيمة الهدف غير صحيحة.");
  if (!user.branchId && !crossBranch(user)) throw new Error("الموظف ده مالوش فرع، حدد فرعه الأول.");
  const branchId = user.branchId || "";
  const clean = note?.trim() || undefined;
  if (!existing) {
    return { id: targetId(user.id, month), userId: user.id, userName: user.name, branchId, month, amount, ...(clean ? { note: clean } : {}), setById: by.id, setByName: by.name, createdAt: now, updatedAt: now, history: [] };
  }
  return {
    ...existing,
    amount,
    note: clean,
    userName: user.name,
    branchId,
    setById: by.id,
    setByName: by.name,
    updatedAt: now,
    history: existing.amount === amount ? existing.history : [...(existing.history ?? []), { at: now, byId: by.id, byName: by.name, from: existing.amount, to: amount }].slice(-20),
  };
}

/** The months before `month`, oldest first: how an employee's achievement moved over time. */
export function monthHistory(userId: string, month: string, count: number, targets: EmployeeTarget[], bookings: Booking[], today: string, settings: TargetSettings) {
  return Array.from({ length: count }, (_, i) => shiftMonth(month, -(count - i))).map((m) => {
    const row = targets.find((t) => t.userId === userId && t.month === m);
    const p = evaluate(row ? row.amount : settings.defaultAmount, achievedFor(userId, m, bookings, settings).amount, m, today, settings);
    return { month: m, ...p };
  });
}
