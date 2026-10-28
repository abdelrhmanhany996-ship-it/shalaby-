import test from "node:test";
import assert from "node:assert/strict";
import { planDemoRemoval, asDemo, type DemoWorld } from "../src/lib/demoScope";
import type { Lead, User } from "../src/types/crm";

const world = (over: Partial<DemoWorld> = {}): DemoWorld => ({
  users: [], companies: [], warehouses: [], branches: [], teams: [], departmentEntities: [], jobPositions: [], leads: [], visits: [],
  followUps: [], bookings: [], timelineEvents: [], purchaseInvoices: [], brokers: [], notBoughtRecords: [], reviewRequests: [],
  reviewNotes: [], notifications: [], auditLogs: [], ...over,
});
const lead = (id: string, over: Partial<Lead> = {}) => ({ id, name: id, branchId: "real-b", ...over }) as Lead;
const user = (id: string, over: Partial<User> = {}) => ({ id, name: id, role: "sales_agent", ...over }) as User;

test("flagged sample data and everything recorded against a sample customer goes; real records stay", () => {
  const w = world({
    branches: [...asDemo([{ id: "demo-b" }]), { id: "real-b" }] as never,
    leads: [...asDemo([lead("demo-l", { branchId: "demo-b" })]), lead("real-l")],
    visits: [{ id: "v1", linkedLeadId: "demo-l" }, { id: "v2", linkedLeadId: "real-l" }] as never,
    // history written by hand while testing on a sample customer carries no flag, but belongs to it
    timelineEvents: [{ id: "t1", leadId: "demo-l" }, { id: "t2", leadId: "real-l" }] as never,
    bookings: [{ id: "b1", leadId: "demo-l" }, { id: "b2", leadId: "real-l" }] as never,
    reviewRequests: [{ id: "r1", leadId: "demo-l" }, { id: "r2", leadId: "real-l" }] as never,
    reviewNotes: [{ id: "n1", requestId: "r1" }, { id: "n2", requestId: "r2" }] as never,
    auditLogs: [
      { id: "a1", entityId: "demo", userId: "dev" },
      { id: "a2", entityId: "demo-l", userId: "dev" },
      { id: "a3", entityId: "real-l", userId: "dev" },
    ] as never,
  });
  const { drop } = planDemoRemoval(w, {});
  assert.deepEqual([...drop.branches], ["demo-b"]);
  assert.deepEqual([...drop.leads], ["demo-l"]);
  assert.deepEqual([...drop.visits], ["v1"]);
  assert.deepEqual([...drop.timelineEvents], ["t1"]);
  assert.deepEqual([...drop.bookings], ["b1"]);
  assert.deepEqual([...drop.reviewRequests], ["r1"]);
  assert.deepEqual([...drop.reviewNotes], ["n1"]);
  assert.deepEqual([...drop.auditLogs].sort(), ["a1", "a2"]);
});

test("data loaded by an older version (no flag) is found by id; the signed-in developer and staff with a login are kept", () => {
  const w = world({ users: [user("old-demo"), user("dev"), user("has-login", { authUid: "x" } as never), user("mine")], leads: [lead("old-l"), lead("mine")] });
  const plan = planDemoRemoval(w, { users: new Set(["old-demo", "dev", "has-login"]), leads: new Set(["old-l"]) }, "dev");
  assert.deepEqual([...plan.drop.users], ["old-demo"]);
  assert.deepEqual([...plan.drop.leads], ["old-l"]);
});

test("a real customer tied to a sample branch or employee is not removed, only reported", () => {
  const w = world({
    branches: asDemo([{ id: "demo-b" }]) as never,
    users: asDemo([user("demo-u")]),
    leads: [lead("real-1", { branchId: "demo-b" }), lead("real-2", { assignedAgentId: "demo-u" }), lead("real-3")],
  });
  const plan = planDemoRemoval(w, {});
  assert.equal(plan.drop.leads.size, 0);
  assert.equal(plan.realLinked, 2);
});

import { allSampleUsers } from "../src/data/demoData";

test("sample employees an older version saved without the flag are recognised by id; real logins and the developer stay", () => {
  const oldAgent = allSampleUsers.find((u) => u.role === "sales_agent")!; // e.g. an old sample salesperson
  assert.ok(oldAgent, "the sample set includes old-style salespeople");
  const known = { users: new Set(allSampleUsers.map((u) => u.id)) };
  const w = world({
    users: [user(oldAgent.id), user("real-with-login", { authUid: "uid1" }), user("real-no-login"), user("me", { role: "admin" })],
  });
  const { drop } = planDemoRemoval(w, known, "me");
  assert.deepEqual([...drop.users], [oldAgent.id]);
  // the sample developer record is not on the list, so a real developer sharing its id is safe
  assert.ok(!known.users.has("usr-admin"));
});
