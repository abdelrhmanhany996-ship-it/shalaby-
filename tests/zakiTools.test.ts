import test from "node:test";
import assert from "node:assert/strict";
import { runTool, type ToolData } from "../src/lib/zakiTools";
import { zakiTools } from "../src/lib/zakiGuide";
import * as demo from "../src/data/demoData";
import * as seed from "../src/data/initialData";
import { today } from "../src/lib/presentation";

const data = (over: Partial<ToolData> = {}): ToolData => ({
  today: today(),
  leads: demo.demoLeads,
  bookings: demo.demoBookings,
  followUps: demo.demoFollowUps,
  visits: demo.demoVisits,
  notBoughtRecords: demo.demoNotBought,
  brokers: demo.demoBrokers,
  users: [...seed.initialUsers, ...demo.demoUsers],
  branches: seed.initialBranches,
  ...over,
});
const call = (name: string, args = {}, d = data()) => runTool(name, args, d) as any;

test("every declared tool has an implementation", () => {
  for (const t of zakiTools) assert.ok(!String(call(t.name).error ?? "").startsWith("أداة غير معروفة"), `tool ${t.name} is not implemented`);
});

test("top customers by garden answers 'who buys the most garden'", () => {
  const r = call("top_customers", { department: "garden", limit: 3 });
  assert.equal(r.rows.length, 3);
  assert.ok(r.rows[0].amountEGP >= r.rows[1].amountEGP);
  assert.match(r.ranking, /البستان/);
});

test("rows are limited and flagged as truncated; limit is capped at 50", () => {
  const r = call("find_customers", { limit: 3 });
  assert.equal(r.shown, 3);
  assert.equal(r.truncated, true);
  assert.ok(call("find_customers", { limit: 9999 }).shown <= 50);
});

test("customer lookup tolerates Arabic spelling variants and reports ambiguity", () => {
  const one = call("get_customer", { name: "منصور" });
  assert.ok(one.name.includes("منصور"));
  assert.ok(Array.isArray(one.purchases));
  const unknown = call("get_customer", { name: "لا يوجد شخص بهذا الاسم" });
  assert.ok(unknown.error);
});

test("tools only see the data they are given (role scoping)", () => {
  const mine = demo.demoLeads.filter((l) => l.assignedAgentId === "usr-agent-cairo-1");
  const ids = new Set(mine.map((l) => l.id));
  const d = data({
    leads: mine,
    bookings: demo.demoBookings.filter((b) => ids.has(b.leadId)),
    followUps: demo.demoFollowUps.filter((f) => ids.has(f.leadId)),
    notBoughtRecords: demo.demoNotBought.filter((r) => ids.has(r.leadId)),
  });
  const o = call("overview", {}, d);
  assert.equal(o.customers, mine.length);
  assert.ok(call("find_customers", { limit: 50 }, d).total <= mine.length);
  assert.ok(call("get_customer", { name: "منصور" }, d).error);
});

test("followups, not-bought reasons, brokers and period stats return live aggregates", () => {
  assert.ok(call("list_followups", { status: "overdue" }).rows.every((f: any) => f.daysOverdue > 0));
  assert.ok(call("not_bought").reasons.length > 3);
  assert.ok(call("top_brokers", { limit: 2 }).rows[0].totalEGP > 0);
  const p = call("period_stats", { from: "2000-01-01", to: "2100-01-01" });
  assert.ok(p.purchases.totalEGP > 0);
  assert.ok(call("period_stats", { from: "not-a-date" }).purchases.count > 0); // invalid dates are ignored
  assert.ok(call("performance", { group_by: "agent" }).rows.length > 3);
});

test("unknown tools and bad arguments never throw", () => {
  assert.ok(call("drop_database").error);
  assert.doesNotThrow(() => call("find_customers", { limit: "abc", department: 5, query: {} }));
});

test("reviews tool lists late complaints with their stats", () => {
  const H = 3_600_000;
  const ago = (h: number) => new Date(Date.now() - h * H).toISOString();
  const lead = demo.demoLeads[0];
  const reviewRequests = [
    { id: "a".repeat(24), leadId: lead.id, leadName: lead.name, branchId: lead.branchId, agentId: "x", subjectKind: "visit" as const, subjectLabel: "زيارة", sentAt: ago(50), answeredAt: ago(40), status: "answered" as const, response: { rating: 1, comment: "اتأخروا" } },
    { id: "b".repeat(24), leadId: lead.id, leadName: lead.name, branchId: lead.branchId, agentId: "x", subjectKind: "visit" as const, subjectLabel: "زيارة", sentAt: ago(5), answeredAt: ago(2), status: "answered" as const, response: { rating: 5 } },
  ];
  const r = call("reviews", { only: "late" }, data({ reviewRequests, reviewNotes: [] }));
  assert.equal(r.total, 1);
  assert.equal(r.rows[0].lateOver24h, true);
  assert.equal(r.rows[0].comment, "اتأخروا");
  assert.equal(r.stats.answered, 2);
  assert.equal(r.stats.complaints.late, 1);
  assert.equal(call("reviews", {}, data({ reviewRequests, reviewNotes: [] })).total, 2);
});
