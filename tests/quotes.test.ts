import test from "node:test";
import assert from "node:assert/strict";
import { nextQuoteNumber, priceLines, quoteError, quoteFollowUpDate, validUntil, defaultTerms, QUOTE_FOLLOWUP_DAYS } from "../src/lib/quotes";
import { quoteHtml } from "../src/lib/quotePrint";
import { weekRange, weeklyTeamSales, teamTotals } from "../src/lib/teamSales";
import type { Booking, FollowUp, Quote, User } from "../src/types/crm";

const quote = (over: Partial<Quote> = {}): Quote => ({
  id: "q1", number: "Q-261029-01", date: "2026-10-29", leadId: "l1", leadName: "اولاد مسعود", leadPhone: "010", addressedTo: "اولاد مسعود",
  branchId: "b1", agentId: "u1", agentName: "أحمد", lines: [{ name: "AC10-2Hp/380", price: 4500, qty: 2, total: 9000 }], total: 9000, terms: defaultTerms,
  status: "sent", createdAt: "2026-10-29T10:00:00Z", updatedAt: "2026-10-29T10:00:00Z", ...over,
});
const fu = (over: Partial<FollowUp> = {}) =>
  ({ id: "f1", leadId: "l1", leadName: "x", leadPhone: "1", assignedAgentId: "u1", branchId: "b1", scheduledAt: "2026-11-05", reason: "r", type: "call", notes: "", status: "upcoming", ...over }) as FollowUp;

test("the example statement adds up like the paper one", () => {
  const { lines, total } = priceLines([
    { name: "AC10-2Hp/380", price: 4500, qty: 2, total: 0 },
    { name: "AC10-3Hp/220", price: 4500, qty: 3, total: 0 },
    { name: "AC10-2Hp/220", price: 3900, qty: 1, total: 0 },
  ]);
  assert.deepEqual(lines.map((l) => l.total), [9000, 13500, 3900]);
  assert.equal(total, 26400);
});

test("a quote needs a customer and at least one named, priced line", () => {
  assert.match(quoteError({ leadId: "", lines: [] }), /العميل/);
  assert.match(quoteError({ leadId: "l1", lines: [] }), /صنف/);
  assert.match(quoteError({ leadId: "l1", lines: [{ name: "", total: 100 }] }), /اسم/);
  assert.equal(quoteError({ leadId: "l1", lines: [{ name: "جهاز", total: 100 }] }), "");
});

test("quote numbers count up within a day", () => {
  assert.equal(nextQuoteNumber("2026-10-29", []), "Q-261029-01");
  assert.equal(nextQuoteNumber("2026-10-29", ["Q-261029-01", "Q-261029-02", "Q-261028-09"]), "Q-261029-03");
});

test("a sent quote is followed up after 3 days unless its owner already has a follow-up", () => {
  assert.equal(QUOTE_FOLLOWUP_DAYS, 3);
  assert.equal(quoteFollowUpDate(quote(), "2026-10-29", []), "2026-11-01");
  assert.equal(quoteFollowUpDate(quote(), "2026-10-29", [fu()]), null);
  // closed, other customer or other person's follow-ups do not count
  assert.equal(quoteFollowUpDate(quote(), "2026-10-29", [fu({ status: "completed" }), fu({ leadId: "l2" }), fu({ assignedAgentId: "u2" })]), "2026-11-01");
});

test("validity comes from the terms", () => {
  assert.equal(validUntil(quote()), "2026-11-13");
  assert.equal(validUntil(quote({ terms: ["البضاعة حاضرة"] })), null);
});

test("the printed page has the table, total and notes, and escapes what was typed", () => {
  const html = quoteHtml(quote({ addressedTo: "<b>x</b>", total: 26400 }));
  assert.match(html, /AC10-2Hp\/380/);
  assert.match(html, /26,400 جنية مصري/);
  assert.match(html, /السعر غير شامل/);
  assert.ok(!html.includes("<b>x</b>"));
});

test("week runs Saturday to Friday", () => {
  assert.deepEqual(weekRange("2026-10-29"), { from: "2026-10-24", to: "2026-10-30" }); // Thursday
  assert.deepEqual(weekRange("2026-10-24"), { from: "2026-10-24", to: "2026-10-30" }); // Saturday
  assert.deepEqual(weekRange("2026-10-30"), { from: "2026-10-24", to: "2026-10-30" }); // Friday
});

test("weekly team sales: each seller's sales and quotes, quiet sellers included", () => {
  const users = [
    { id: "u1", name: "أحمد", role: "sales_agent", active: true },
    { id: "u2", name: "منى", role: "sales_agent", active: true },
    { id: "m", name: "المدير", role: "regional_manager", active: true },
    { id: "acc", name: "حسابات", role: "supervisor", active: true },
  ] as User[];
  const bk = (agentId: string, amount: number, bookingDate: string, bookingStatus = "completed") => ({ agentId, amount, bookingDate, bookingStatus }) as Booking;
  const rows = weeklyTeamSales({
    users,
    bookings: [bk("u1", 9000, "2026-10-25"), bk("u1", 3900, "2026-10-28"), bk("u1", 500, "2026-10-20"), bk("m", 2000, "2026-10-26"), bk("u1", 700, "2026-10-26", "cancelled")],
    quotes: [quote({ status: "accepted" }), quote({ id: "q2", status: "sent", total: 1000 }), quote({ id: "q3", status: "lost", agentId: "u2", agentName: "منى", total: 500 })],
    from: "2026-10-24",
    to: "2026-10-30",
  });
  assert.deepEqual(rows.map((r) => r.userId), ["u1", "m", "u2"]);
  assert.equal(rows[0].sales, 12900);
  assert.equal(rows[0].deals, 2);
  assert.equal(rows[0].quotes, 2);
  assert.equal(rows[0].accepted, 1);
  assert.equal(rows[0].pending, 1);
  assert.equal(rows[2].lost, 1);
  assert.deepEqual(teamTotals(rows), { sales: 14900, deals: 3, quotes: 3, accepted: 1 });
});

import { satisfactionCall, SATISFACTION_DAYS } from "../src/lib/postSale";
import { pendingReminders } from "../src/lib/followUps";

test("one satisfaction call a week after the sale, and it never raises a reminder", () => {
  assert.equal(SATISFACTION_DAYS, 7);
  assert.equal(satisfactionCall("2026-10-29").date, "2026-11-05");
  const call = fu({ id: "ps", category: "post_sale", scheduledAt: "2026-10-20", status: "overdue" });
  const normal = fu({ id: "n", scheduledAt: "2026-10-20", status: "overdue" });
  assert.deepEqual(pendingReminders([call, normal], "u1", "2026-10-29", "10:00").map((r) => r.followUp.id), ["n"]);
});

import { progressTone } from "../src/lib/progress";
import { achievedBetween, targetForPeriod } from "../src/lib/targets";
import { periodReport, periods, reportText } from "../src/lib/salesReport";
import { defaultTargetSettings } from "../src/lib/targets";

test("bar colours follow the thresholds: red, orange, yellow, green, glowing green with a star above the target", () => {
  const t = (p: number) => progressTone(p).tone;
  assert.deepEqual([0, 20, 21, 50, 51, 75, 76, 100].map(t), ["red", "red", "orange", "orange", "yellow", "yellow", "green", "green"]);
  assert.equal(t(100.1), "shine");
  assert.equal(progressTone(100).over, false);
  assert.equal(progressTone(150).over, true);
});

test("a target for a period counts the month's target for the days inside it", () => {
  const targets = [{ id: "tgt-u1-2026-10", userId: "u1", amount: 3100000 }, { id: "tgt-u1-2026-11", userId: "u1", amount: 3000000 }] as any[];
  const s = { ...defaultTargetSettings, defaultAmount: 0 };
  assert.equal(targetForPeriod("u1", "2026-10-01", "2026-10-31", targets, s), 3100000);
  assert.equal(targetForPeriod("u1", "2026-10-25", "2026-10-31", targets, s), 700000);
  assert.equal(targetForPeriod("u1", "2026-10-31", "2026-11-01", targets, s), 100000 + 100000);
  assert.equal(targetForPeriod("u2", "2026-10-01", "2026-10-31", targets, s), 0);
});

test("the money report: sold between the dates against the target, best first, cancelled ignored", () => {
  const users = [{ id: "u1", name: "أحمد", role: "sales_agent", active: true }, { id: "u2", name: "منى", role: "sales_agent", active: true }] as User[];
  const bk = (id: string, agentId: string, amount: number, bookingDate: string, bookingStatus = "completed") => ({ id, agentId, amount, bookingDate, bookingStatus, departmentAmounts: { general: amount } }) as unknown as Booking;
  const bookings = [bk("1", "u1", 400000, "2026-10-05"), bk("2", "u1", 700000, "2026-10-20"), bk("3", "u1", 99999, "2026-10-21", "cancelled"), bk("4", "u1", 50000, "2026-09-30"), bk("5", "u2", 250000, "2026-10-10")];
  const targets = [{ id: "tgt-u1-2026-10", userId: "u1", amount: 1000000 }, { id: "tgt-u2-2026-10", userId: "u2", amount: 1000000 }] as any[];
  assert.deepEqual(achievedBetween("u1", "2026-10-01", "2026-10-31", bookings, defaultTargetSettings), { amount: 1100000, purchases: 2 });
  const r = periodReport({ users, bookings, targets, settings: defaultTargetSettings, ...periods.month("2026-10-29") });
  assert.deepEqual(r.rows.map((x) => [x.name, x.sold, x.target, x.percent, x.tone, x.over]), [["أحمد", 1100000, 1000000, 110, "shine", true], ["منى", 250000, 1000000, 25, "orange", false]]);
  assert.deepEqual(r.total, { sold: 1350000, deals: 3, target: 2000000, percent: 67.5 });
  assert.match(reportText(r, "2026-10-01", "2026-10-31"), /أحمد: باع 1,100,000 ج.م من هدف 1,000,000 \(110٪\) ⭐/);
  assert.deepEqual(periods.week("2026-10-29"), { from: "2026-10-24", to: "2026-10-30" });
  assert.deepEqual(periods.lastMonth("2026-10-29"), { from: "2026-09-01", to: "2026-09-30" });
});
