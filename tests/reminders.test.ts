import test from "node:test";
import assert from "node:assert/strict";
import { reminderTasks } from "../src/lib/reminders";
import type { Lead, ReminderDone, ReviewRequest, Visit, BrokerEntity } from "../src/types/crm";

const NOW = new Date("2026-10-20T12:00:00Z").getTime();
const lead = { id: "l1", name: "محمد" } as Lead;
const broker = { id: "b1", name: "وسيط", phone: "0101", active: true } as BrokerEntity;
const visit = (over: Partial<Visit> = {}) => ({ id: "v1", visitorName: "محمد", visitorType: "client", linkedLeadId: "l1", receivedByAgentId: "me", branchId: "br", branchName: "القاهرة", date: "2026-10-20", ...over }) as Visit;
const data = (over: Partial<Parameters<typeof reminderTasks>[0]> = {}) => ({ visits: [visit()], reviewRequests: [] as ReviewRequest[], leads: [lead], brokers: [broker], reminderDone: [] as ReminderDone[], ...over });

test("a saved visit with no review request yields a reminder; it vanishes once the request exists", () => {
  const t = reminderTasks(data(), "me", NOW);
  assert.deepEqual(t.map((x) => [x.id, x.level]), [["rs:v1:client", "due"]]);
  const sent = { id: "r", leadId: "l1", subjectKind: "visit", subjectId: "v1", status: "sent", sentAt: "2026-10-20T10:00:00Z", agentId: "me", branchId: "br" } as ReviewRequest;
  assert.deepEqual(reminderTasks(data({ reviewRequests: [sent] }), "me", NOW), []);
});

test("older visits are overdue, other people's visits and old history are not mine", () => {
  assert.equal(reminderTasks(data({ visits: [visit({ date: "2026-10-17" })] }), "me", NOW)[0].level, "overdue");
  assert.deepEqual(reminderTasks(data(), "someone-else", NOW), []);
  assert.deepEqual(reminderTasks(data({ visits: [visit({ date: "2026-09-01" })] }), "me", NOW), []);
});

test("a visit with a customer and a broker gives one reminder each, and 'done' hides only that one", () => {
  const both = visit({ visitorType: "both", brokerId: "b1", brokerName: "وسيط" });
  const t = reminderTasks(data({ visits: [both] }), "me", NOW);
  assert.deepEqual(t.map((x) => x.id).sort(), ["rs:v1:broker", "rs:v1:client"]);
  const done = [{ id: "rs:v1:client", branchId: "br", agentId: "me", doneAt: "x" }] as ReminderDone[];
  assert.deepEqual(reminderTasks(data({ visits: [both], reminderDone: done }), "me", NOW).map((x) => x.id), ["rs:v1:broker"]);
});

test("an unanswered request after 48 hours asks for the one nudge", () => {
  const r = { id: "r2", leadId: "l1", leadName: "محمد", subjectKind: "visit", subjectId: "v0", subjectLabel: "زيارة", status: "sent", sentAt: "2026-10-17T10:00:00Z", agentId: "me", branchId: "br" } as ReviewRequest;
  const t = reminderTasks(data({ visits: [], reviewRequests: [r] }), "me", NOW);
  assert.deepEqual(t.map((x) => x.id), ["rn:r2"]);
});
