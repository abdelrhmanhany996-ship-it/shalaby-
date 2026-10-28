import test from "node:test";
import assert from "node:assert/strict";
import { achievedFor, defaultTargetSettings, evaluate, monthProgress, overview, sanitizeTargetSettings, shiftMonth, targetId, withAmount } from "../src/lib/targets";
import type { Booking, EmployeeTarget, User } from "../src/types/crm";

const S = defaultTargetSettings;
const booking = (over: Partial<Booking> = {}) =>
  ({ id: "b1", agentId: "u1", department: "decor", amount: 1000, bookingDate: "2026-10-05", bookingStatus: "confirmed", ...over }) as Booking;
const user = (id: string, over: Partial<User> = {}) => ({ id, name: id, role: "sales_agent", active: true, branchId: "br1", ...over }) as User;

test("achievement counts each purchase once, in its month, for its employee", () => {
  const list = [booking(), booking({ id: "b2", amount: 500 }), booking({ id: "b1" }), booking({ id: "b3", agentId: "u2" }), booking({ id: "b4", bookingDate: "2026-09-30" })];
  const a = achievedFor("u1", "2026-10", list, S);
  assert.equal(a.amount, 1500); // the duplicate b1 is ignored
  assert.equal(a.purchases, 2);
});

test("cancelled and refunded purchases do not count; the split across departments does", () => {
  const list = [
    booking({ id: "c", bookingStatus: "cancelled" }),
    booking({ id: "r", paymentStatus: "refunded" }),
    booking({ id: "s", amount: 900, departmentAmounts: { construction: 600, garden: 300 } }),
  ];
  assert.equal(achievedFor("u1", "2026-10", list, S).amount, 900);
  assert.equal(achievedFor("u1", "2026-10", list, { ...S, departments: ["garden"] }).amount, 300);
});

test("month progress and shifting months", () => {
  assert.equal(monthProgress("2026-10", "2026-09-30"), 0);
  assert.equal(monthProgress("2026-10", "2026-11-01"), 1);
  assert.equal(monthProgress("2026-10", "2026-10-31"), 1);
  assert.equal(monthProgress("2026-09", "2026-09-15"), 0.5);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("state: achieved, on track, behind (against the pace), missed (month over)", () => {
  // mid-month: should be at 50%
  assert.equal(evaluate(10000, 10000, "2026-09", "2026-09-15", S).state, "achieved");
  assert.equal(evaluate(10000, 5000, "2026-09", "2026-09-15", S).state, "on_track");
  assert.equal(evaluate(10000, 3000, "2026-09", "2026-09-15", S).state, "behind"); // 30% vs 50% expected = 60% of pace < 70
  assert.equal(evaluate(10000, 3000, "2026-09", "2026-10-02", S).state, "missed");
  assert.equal(evaluate(10000, 3000, "2026-11", "2026-10-02", S).state, "on_track"); // a future month has no pace yet
  assert.equal(evaluate(0, 500, "2026-09", "2026-09-15", S).state, "no_target");
  const p = evaluate(10000, 3000, "2026-09", "2026-09-15", S);
  assert.deepEqual([p.percent, p.remaining, p.expectedPercent], [30, 7000, 50]);
  // without pace the full target is the reference
  assert.equal(evaluate(10000, 5000, "2026-09", "2026-09-15", { ...S, paceAware: false }).state, "behind");
  // over-achievement shows above 100
  assert.equal(evaluate(10000, 12500, "2026-09", "2026-09-15", S).percent, 125);
});

test("settings are clamped to safe values", () => {
  const s = sanitizeTargetSettings({ behindBelow: 500, achievedFrom: -5, departments: ["garden", "nope" as never], defaultAmount: -1 });
  assert.deepEqual(s, { behindBelow: 1, achievedFrom: 1, departments: ["garden"], defaultAmount: 0, paceAware: true });
  assert.deepEqual(sanitizeTargetSettings(null), S);
});

test("overview: each employee once, different targets, and a reconciling 'others' figure", () => {
  const users = [user("u1"), user("u2"), user("m1", { role: "sales_agent", active: false }), user("hr", { role: "supervisor" })];
  const targets = [{ id: targetId("u1", "2026-10"), userId: "u1", month: "2026-10", amount: 2000 }, { id: targetId("u2", "2026-10"), userId: "u2", month: "2026-10", amount: 8000 }] as EmployeeTarget[];
  const bookings = [booking({ amount: 1000 }), booking({ id: "b2", agentId: "u2", amount: 2000 }), booking({ id: "b3", agentId: "gone", amount: 700 })];
  const o = overview(users, targets, bookings, "2026-10", "2026-10-31", S);
  assert.deepEqual(o.rows.map((r) => [r.user.id, r.target, r.achieved]).sort(), [["u1", 2000, 1000], ["u2", 8000, 2000]]);
  assert.deepEqual(o.total, { target: 10000, achieved: 3000, remaining: 7000, percent: 30 });
  assert.equal(o.otherAchieved, 700);
  // total sales in scope = listed + others
  assert.equal(o.total.achieved + o.otherAchieved, 3700);
  // a different month does not pick up October's targets
  assert.equal(overview(users, targets, bookings, "2026-11", "2026-11-01", S).total.target, 0);
});

test("setting a target keeps history and stays one row per employee and month", () => {
  const by = { id: "m", name: "المدير" };
  const first = withAmount(undefined, user("u1"), "2026-10", 5000, " ملاحظة ", by, "t1");
  assert.equal(first.id, "tgt-u1-2026-10");
  assert.equal(first.note, "ملاحظة");
  const second = withAmount(first, user("u1"), "2026-10", 7000, undefined, by, "t2");
  assert.equal(second.id, first.id);
  assert.deepEqual(second.history, [{ at: "t2", byId: "m", byName: "المدير", from: 5000, to: 7000 }]);
  assert.equal(withAmount(second, user("u1"), "2026-10", 7000, undefined, by, "t3").history?.length, 1);
  assert.throws(() => withAmount(undefined, user("u1"), "2026-13", 1, undefined, by, "t"));
  assert.throws(() => withAmount(undefined, user("u1"), "2026-10", -1, undefined, by, "t"));
  assert.throws(() => withAmount(undefined, user("u1", { branchId: undefined }), "2026-10", 1, undefined, by, "t"));
});

import { monthHistory } from "../src/lib/targets";
test("month history lists the previous months oldest first with real figures", () => {
  const t = [{ id: "a", userId: "u1", month: "2026-08", amount: 1000 }, { id: "b", userId: "u1", month: "2026-09", amount: 2000 }] as EmployeeTarget[];
  const b = [booking({ id: "x", bookingDate: "2026-08-10", amount: 500 }), booking({ id: "y", bookingDate: "2026-09-10", amount: 2500 })];
  const h = monthHistory("u1", "2026-10", 3, t, b, "2026-10-15", S);
  assert.deepEqual(h.map((x) => [x.month, x.target, x.achieved, x.percent, x.state]), [["2026-07", 0, 0, 0, "no_target"], ["2026-08", 1000, 500, 50, "missed"], ["2026-09", 2000, 2500, 125, "achieved"]]);
});
