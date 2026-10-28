import test from "node:test";
import assert from "node:assert/strict";
import { addToDate, buildPostSaleSchedule } from "../src/lib/postSale";

test("post-sale schedule: 7 days, 30 days, 6 months and 12 months after delivery", () => {
  const dates = buildPostSaleSchedule("2026-10-19").map((m) => [
    m.milestone,
    m.date,
  ]);
  assert.deepEqual(dates, [
    ["7d", "2026-10-26"],
    ["30d", "2026-11-18"],
    ["6m", "2027-04-19"],
    ["12m", "2027-10-19"],
  ]);
});

test("month arithmetic clamps to the end of shorter months and handles leap years", () => {
  assert.equal(addToDate("2026-08-31", { months: 6 }), "2027-02-28");
  assert.equal(addToDate("2027-08-31", { months: 6 }), "2028-02-29");
  assert.equal(addToDate("2026-12-31", { months: 12 }), "2027-12-31");
  assert.equal(addToDate("2026-12-28", { days: 7 }), "2027-01-04");
});

test("each milestone carries an Arabic reason for the follow-up", () => {
  for (const m of buildPostSaleSchedule("2026-01-01")) {
    assert.ok(m.reason.length > 10);
  }
});
