import test from "node:test";
import assert from "node:assert/strict";
import { branchPerformance, notYetReasons, salesEffort, zakiSuggestionsReport, overdueFollowUps, reportCatalog, salesByDepartment, toCsv, weeklySummary, type ReportData } from "../src/lib/reportExports";

const empty: ReportData = { leads: [], visits: [], bookings: [], followUps: [], notBoughtRecords: [], reviewRequests: [], reviewNotes: [], users: [], brokers: [], branches: [], auditLogs: [], aiSuggestions: [], reminderDone: [] };
const data = {
  ...empty,
  branches: [{ id: "b1", name: "القاهرة", active: true }, { id: "b2", name: "الإسكندرية", active: true }],
  visits: [{ id: "v1", branchId: "b1", date: "2026-10-10" }, { id: "v2", branchId: "b1", date: "2026-09-01" }, { id: "v3", branchId: "b2", date: "2026-10-11" }],
  bookings: [
    { id: "k1", leadId: "l1", branchId: "b1", bookingDate: "2026-10-10", amount: 30000, department: "decor", bookingStatus: "confirmed" },
    { id: "k2", leadId: "l2", branchId: "b1", bookingDate: "2026-10-12", amount: 20000, department: "construction", departmentAmounts: { construction: 15000, garden: 5000 }, bookingStatus: "confirmed" },
    { id: "k3", leadId: "l3", branchId: "b1", bookingDate: "2026-10-12", amount: 99999, department: "decor", bookingStatus: "cancelled" },
  ],
  notBoughtRecords: [
    { id: "n1", leadId: "l4", branchId: "b1", createdAt: "2026-10-11T10:00:00Z", reasons: ["price", "comparing"] },
    { id: "n2", leadId: "l5", branchId: "b2", createdAt: "2026-10-11T10:00:00Z", reasons: ["price"] },
  ],
  followUps: [
    { id: "f1", leadName: "أحمد", leadPhone: "010", branchId: "b1", assignedAgentName: "سامي", scheduledAt: "2020-01-05T10:00:00", status: "due", type: "call", reason: "متابعة" },
    { id: "f2", leadName: "منى", leadPhone: "011", branchId: "b1", assignedAgentName: "سامي", scheduledAt: "2020-01-01T10:00:00", status: "due", type: "call", reason: "عرض" },
    { id: "f3", leadName: "تم", leadPhone: "012", branchId: "b1", scheduledAt: "2020-01-01T10:00:00", status: "completed", type: "call", reason: "" },
  ],
} as unknown as ReportData;

test("branch performance counts per branch, skips cancelled purchases and respects the date range", () => {
  const t = branchPerformance(data, { from: "2026-10-01", to: "2026-10-31" });
  const cairo = t.rows.find((r) => r[0] === "القاهرة")!;
  assert.deepEqual(cairo.slice(1, 8), [1, 0, 2, 50000, 1, 67, 2]);
  assert.equal(t.rows.find((r) => r[0] === "الإسكندرية")![3], 0);
  assert.equal(branchPerformance(data, { branchId: "b2" }).rows.length, 1);
});

test("overdue follow-ups list only late ones, oldest first", () => {
  const t = overdueFollowUps(data, {});
  assert.deepEqual(t.rows.map((r) => r[0]), ["منى", "أحمد"]);
  assert.ok((t.rows[0][5] as number) > (t.rows[1][5] as number));
});

test("not-yet reasons are counted per reason and per branch, biggest first", () => {
  const t = notYetReasons(data, {});
  assert.deepEqual(t.rows[0].slice(0, 2), ["السعر أعلى من المتوقع", 2]);
  assert.deepEqual(t.headers.slice(3), ["القاهرة", "الإسكندرية"]);
  assert.deepEqual(t.rows[0].slice(3), [1, 1]);
});

test("sales by department split a mixed purchase and add a company total", () => {
  const t = salesByDepartment(data, {});
  const cairo = t.rows.find((r) => r[0] === "القاهرة")!;
  assert.deepEqual(cairo.slice(1), [15000, 30000, 5000, 0, 50000]);
  assert.equal(t.rows[t.rows.length - 1][0], "الإجمالي");
});

test("weekly summary lists the headline numbers", () => {
  const t = weeklySummary(data, { from: "2026-10-01", to: "2026-10-31" });
  assert.equal(t.rows.find((r) => r[0] === "الزيارات")![1], 2);
  assert.equal(t.rows.find((r) => r[0] === "إجمالي المبيعات (ج.م)")![1], 50000);
});

test("csv keeps Arabic, escapes quotes and neutralises formulas", () => {
  const out = toCsv({ headers: ["a", "b"], rows: [['=1+1', 'قال "تمام"'], [-5, "+x"]] });
  assert.ok(out.startsWith("﻿"));
  assert.ok(out.includes(`"'=1+1","قال ""تمام"""`));
  assert.ok(out.includes(`"-5","'+x"`));
});

test("the catalog puts the four essentials first and marks the rest as extra", () => {
  assert.deepEqual(reportCatalog.filter((r) => r.tier === "core").map((r) => r.id), ["branch-performance", "overdue-followups", "not-yet-reasons", "sales-by-department", "sales-effort", "zaki-suggestions"]);
  assert.equal(reportCatalog.indexOf(reportCatalog.find((r) => r.tier === "extra")!), 6);
});

test("sales effort counts what each salesperson did and how they treated Zaki's suggestions", () => {
  const d = {
    ...empty,
    branches: [{ id: "b1", name: "القاهرة", active: true }],
    users: [{ id: "u1", name: "سامي", role: "sales_agent", branchId: "b1", active: true }, { id: "m", name: "مدير", role: "general_manager", active: true }],
    visits: [{ id: "v1", receivedByAgentId: "u1", branchId: "b1", date: "2026-10-10" }],
    followUps: [
      { id: "f1", assignedAgentId: "u1", branchId: "b1", scheduledAt: "2026-10-12T10:00:00", status: "completed" },
      { id: "f2", assignedAgentId: "u1", branchId: "b1", scheduledAt: "2020-01-01T10:00:00", status: "due" },
    ],
    aiSuggestions: [
      { id: "s1", agentId: "u1", branchId: "b1", status: "accepted", edited: true, dayKey: "2026-10-11", createdAt: "2026-10-11T08:00:00Z", name: "عميل", partyKind: "client", proposedDate: "2026-11-11", finalDate: "2026-11-15" },
      { id: "s2", agentId: "u1", branchId: "b1", status: "rejected", rejectReason: "مش فرصة حقيقية", dayKey: "2026-10-11", createdAt: "2026-10-11T09:00:00Z", name: "وسيط", partyKind: "broker" },
      { id: "s3", agentId: "u1", branchId: "b1", status: "checked", dayKey: "2026-10-11", createdAt: "x", name: "x", partyKind: "client" },
    ],
  } as unknown as ReportData;
  const t = salesEffort(d, { from: "2026-10-01", to: "2026-10-31" });
  assert.equal(t.rows.length, 1); // the manager is not a salesperson
  const row = Object.fromEntries(t.headers.map((h, i) => [h, t.rows[0][i]]));
  assert.equal(row["زيارات استقبلها"], 1);
  assert.equal(row["متابعات اتعملت"], 1);
  assert.equal(row["متابعات متأخرة حاليًا"], 1);
  assert.deepEqual([row["اقتراحات زكي"], row["اتقبلت"], row["اتفضّت"]], [2, 1, 1]);
  const z = zakiSuggestionsReport(d, { from: "2026-10-01", to: "2026-10-31" });
  assert.equal(z.rows.length, 2);
  assert.equal(z.rows.find((r) => r[4] === "عميل")![10], "نعم");
});
