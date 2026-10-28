import test from "node:test";
import assert from "node:assert/strict";
import { bucketize, bucketOf, interrupting, joinSchedule, pendingReminders, rescheduled, timeOfDay } from "../src/lib/followUps";
import { followUpStatus } from "../src/lib/presentation";
import type { FollowUp } from "../src/types/crm";

const fu = (over: Partial<FollowUp> = {}) =>
  ({ id: "f1", leadId: "l1", leadName: "محمد", leadPhone: "0100", assignedAgentId: "me", branchId: "b1", scheduledAt: "2026-10-20", reason: "عرض سعر", type: "call", notes: "", status: "upcoming", ...over }) as FollowUp;

test("buckets match the status the sidebar badge uses", () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  for (const d of ["2000-01-01", today, "2999-01-01"]) {
    const f = fu({ scheduledAt: d });
    const status = followUpStatus(f);
    const b = bucketOf(f, today);
    assert.equal(b === "today" ? "due" : b, status);
  }
  assert.equal(bucketOf(fu({ status: "completed" }), "2026-10-20"), "completed");
  assert.equal(bucketOf(fu({ status: "cancelled", scheduledAt: "2020-01-01" }), "2026-10-20"), "cancelled");
});

test("overdue and today lists put high priority first, then the earliest", () => {
  const list = [
    fu({ id: "a", scheduledAt: "2026-10-18", priority: "low" }),
    fu({ id: "b", scheduledAt: "2026-10-19", priority: "high" }),
    fu({ id: "c", scheduledAt: "2026-10-17" }),
    fu({ id: "d", scheduledAt: "2026-10-20T09:00" }),
    fu({ id: "e", scheduledAt: "2026-10-21", status: "upcoming" }),
  ];
  const b = bucketize(list, "2026-10-20");
  assert.deepEqual(b.overdue.map((f) => f.id), ["b", "c", "a"]);
  assert.deepEqual(b.today.map((f) => f.id), ["d"]);
  assert.deepEqual(b.upcoming.map((f) => f.id), ["e"]);
});

test("time of day is optional and part of the stored date", () => {
  assert.equal(timeOfDay(fu({ scheduledAt: "2026-10-20T14:30" })), "14:30");
  assert.equal(timeOfDay(fu()), undefined);
  assert.equal(joinSchedule("2026-10-20", "14:30"), "2026-10-20T14:30");
  assert.equal(joinSchedule("2026-10-20", ""), "2026-10-20");
  assert.equal(joinSchedule("2026-10-20", "bad"), "2026-10-20");
});

test("reminders: overdue, passed time today, within the hour, and no time", () => {
  const list = [
    fu({ id: "old", scheduledAt: "2026-10-17" }),
    fu({ id: "late", scheduledAt: "2026-10-20T09:00" }),
    fu({ id: "soon", scheduledAt: "2026-10-20T10:30" }),
    fu({ id: "later", scheduledAt: "2026-10-20T16:00" }),
    fu({ id: "notime", scheduledAt: "2026-10-20" }),
    fu({ id: "tomorrow", scheduledAt: "2026-10-21" }),
    fu({ id: "done", scheduledAt: "2026-10-17", status: "completed" }),
    fu({ id: "other", scheduledAt: "2026-10-17", assignedAgentId: "someone" }),
  ];
  const r = pendingReminders(list, "me", "2026-10-20", "10:00");
  assert.deepEqual(r.map((x) => [x.followUp.id, x.level]), [["old", "overdue"], ["late", "late_today"], ["soon", "soon"], ["notime", "today"], ["later", "today"]]);
  assert.equal(r[0].daysLate, 3);
  assert.deepEqual(r.filter(interrupting).map((x) => x.followUp.id), ["old", "late", "soon"]);
});

test("rescheduling keeps the history, needs a reason, and refuses closed follow-ups", () => {
  const by = { id: "u1", name: "سالي" };
  const moved = rescheduled(fu(), "2026-10-25T11:00", by, "العميل مسافر", "2026-10-20T08:00:00Z");
  assert.equal(moved.scheduledAt, "2026-10-25T11:00");
  assert.equal(moved.rescheduleCount, 1);
  assert.deepEqual(moved.rescheduleLog?.[0], { at: "2026-10-20T08:00:00Z", from: "2026-10-20", to: "2026-10-25T11:00", byId: "u1", byName: "سالي", reason: "العميل مسافر" });
  const again = rescheduled(moved, "2026-10-30", by, "تاني", "2026-10-21T08:00:00Z");
  assert.equal(again.rescheduleCount, 2);
  assert.equal(again.rescheduleLog?.length, 2);
  assert.throws(() => rescheduled(fu(), "2026-10-25", by, "  ", "x"));
  assert.throws(() => rescheduled(fu({ status: "completed" }), "2026-10-25", by, "x", "x"));
  assert.throws(() => rescheduled(fu(), "2026-10-20", by, "x", "x"));
  assert.throws(() => rescheduled(fu(), "غلط", by, "x", "x"));
  // the original is untouched
  assert.equal(fu().rescheduleCount, undefined);
});
