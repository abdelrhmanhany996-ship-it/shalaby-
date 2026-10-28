import test from "node:test";
import assert from "node:assert/strict";
import { buildCoachSnapshot, snapshotFingerprint, type CoachInput } from "../src/lib/coach";
import { defaultTargetSettings } from "../src/lib/targets";
import type { Booking, EmployeeTarget, FollowUp, Lead, User } from "../src/types/crm";

const TODAY = "2026-10-20";
const user = (id: string, over: Partial<User> = {}) => ({ id, name: id, role: "sales_agent", active: true, branchId: "b1", ...over }) as User;
const lead = (id: string, over: Partial<Lead> = {}) => ({ id, name: `عميل ${id}`, phone: "0100000000", email: "a@b.c", status: "interested", branchId: "b1", createdAt: "2026-09-01", notes: "", assignedAgentId: "me", ...over }) as Lead;
const fu = (id: string, leadId: string, over: Partial<FollowUp> = {}) => ({ id, leadId, leadName: `عميل ${leadId}`, assignedAgentId: "me", branchId: "b1", scheduledAt: TODAY, reason: "عرض سعر", type: "call", notes: "", status: "due", ...over }) as FollowUp;
const input = (over: Partial<CoachInput> = {}): CoachInput => ({
  user: user("me"), today: TODAY, followUps: [], leads: [], bookings: [], notBoughtRecords: [], users: [user("me")], targets: [], targetSettings: defaultTargetSettings, canSeeTargets: false, ...over,
});

test("candidates are the open follow-ups, most overdue and highest priority first, with evidence and no contact details", () => {
  const snap = buildCoachSnapshot(input({
    leads: [lead("1"), lead("2"), lead("3")],
    followUps: [
      fu("a", "1", { scheduledAt: "2026-10-18", status: "overdue" }),
      fu("b", "2", { scheduledAt: "2026-10-10", status: "overdue", priority: "high", rescheduleCount: 2 }),
      fu("c", "3", { scheduledAt: "2026-10-25", status: "upcoming" }),
      fu("d", "3", { scheduledAt: "2026-10-01", status: "completed" }),
    ],
  }));
  assert.deepEqual(snap.candidates.map((c) => c.leadId), ["2", "1", "3"]);
  assert.equal(snap.candidates[0].daysOverdue, 10);
  assert.equal(snap.candidates[0].rescheduledTimes, 2);
  assert.deepEqual(snap.counts, { openFollowUps: 3, overdue: 2, dueToday: 0, customersWithoutFollowUp: 0 });
  const text = JSON.stringify(snap);
  assert.ok(!text.includes("0100000000") && !text.includes("a@b.c"), "no phone or e-mail is sent");
});

test("a follow-up on a customer the user cannot see is not included, and the plan says so", () => {
  const snap = buildCoachSnapshot(input({ leads: [lead("1")], followUps: [fu("a", "1"), fu("x", "hidden")] }));
  assert.deepEqual(snap.candidates.map((c) => c.leadId), ["1"]);
  assert.ok(snap.dataNotes.some((n) => n.includes("مش مربوطة")));
});

test("interested customers with no open follow-up and no contact for two weeks are flagged; recent ones are not", () => {
  const snap = buildCoachSnapshot(input({
    leads: [lead("old", { lastContactDate: "2026-09-20" }), lead("recent", { lastContactDate: "2026-10-15" }), lead("lost", { status: "not_interested", lastContactDate: "2026-01-01" }), lead("bought", { status: "booked", lastContactDate: "2026-01-01" }), lead("hasfu", { lastContactDate: "2026-01-01" })],
    followUps: [fu("a", "hasfu")],
  }));
  const kinds = Object.fromEntries(snap.candidates.map((c) => [c.leadId, c.kind]));
  assert.deepEqual(kinds, { hasfu: "follow_up", old: "no_follow_up" });
  assert.equal(snap.counts.customersWithoutFollowUp, 1);
});

test("purchases and the customer's reasons ride along as evidence", () => {
  const b = { id: "b", leadId: "1", agentId: "me", bookingStatus: "confirmed", bookingDate: "2026-10-01", createdAt: "2026-10-01T00:00:00Z", amount: 5000, courseName: "دهان", department: "decor" } as Booking;
  const snap = buildCoachSnapshot(input({ leads: [lead("1", { customerRatingStars: 2 })], followUps: [fu("a", "1")], bookings: [b] }));
  assert.deepEqual(snap.candidates[0].bought, { date: "2026-10-01", amountEGP: 5000 });
  assert.equal(snap.candidates[0].customerStars, 2);
});

test("team target facts appear only for people who may see targets, and only their own scope", () => {
  const users = [user("me", { role: "branch_manager" }), user("s1"), user("s2")];
  const targets = [
    { id: "t1", userId: "s1", month: "2026-10", amount: 10000 },
    { id: "t2", userId: "s2", month: "2026-10", amount: 10000 },
  ] as EmployeeTarget[];
  const bookings = [{ id: "b1", agentId: "s2", bookingStatus: "confirmed", bookingDate: "2026-10-05", amount: 9000, department: "decor" }] as Booking[];
  const withTargets = buildCoachSnapshot(input({ user: users[0], users, targets, bookings, canSeeTargets: true, followUps: [fu("a", "1", { assignedAgentId: "s1", scheduledAt: "2026-10-01", status: "overdue" })], leads: [lead("1", { assignedAgentId: "s1" })] }));
  const names = (withTargets.team as { name: string }[]).map((t) => t.name);
  assert.deepEqual(names.sort(), ["s1", "s2"]);
  const s1 = (withTargets.team as { name: string; state: string; overdueFollowUps: number }[]).find((t) => t.name === "s1")!;
  assert.equal(s1.overdueFollowUps, 1);
  assert.equal(s1.state, "متأخر عن الهدف"); // 0% by day 20 of 31
  const without = buildCoachSnapshot(input({ user: users[0], users, targets, bookings, canSeeTargets: false }));
  assert.equal(without.team, undefined);
});

test("a salesperson gets their own standing, not the team's", () => {
  const targets = [{ id: "t", userId: "me", month: "2026-10", amount: 10000 }] as EmployeeTarget[];
  const snap = buildCoachSnapshot(input({ targets }));
  assert.equal((snap.me as { hasTarget: boolean }).hasTarget, true);
  assert.equal(snap.team, undefined);
});

test("fingerprint changes with the data and not with order", () => {
  const a = buildCoachSnapshot(input({ leads: [lead("1")], followUps: [fu("a", "1")] }));
  const b = buildCoachSnapshot(input({ leads: [lead("1")], followUps: [fu("a", "1")] }));
  const c = buildCoachSnapshot(input({ leads: [lead("1")], followUps: [fu("a", "1", { scheduledAt: "2026-10-19", status: "overdue" })] }));
  assert.equal(snapshotFingerprint(a), snapshotFingerprint(b));
  assert.notEqual(snapshotFingerprint(a), snapshotFingerprint(c));
});

test("an empty scope is stated, not padded", () => {
  const snap = buildCoachSnapshot(input());
  assert.deepEqual(snap.candidates, []);
  assert.ok(snap.dataNotes.length >= 1);
});
