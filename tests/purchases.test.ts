import test from "node:test";
import assert from "node:assert/strict";
import { bookingSplit, splitTotals } from "../src/lib/purchases";
import type { Booking } from "../src/types/crm";

const base = {
  id: "b",
  leadId: "l",
  leadName: "n",
  leadPhone: "0",
  branchId: "br",
  agentId: "a",
  courseId: "c",
  courseName: "c",
  bookingDate: "2026-10-20",
  bookingStatus: "confirmed",
  source: "walk_in",
  notes: "",
  createdAt: "",
} as const;

test("a purchase can be split across any subset of departments", () => {
  const b = {
    ...base,
    department: "garden",
    amount: 1_000_000,
    departmentAmounts: { garden: 500_000, decor: 250_000, general: 250_000 },
  } as Booking;
  assert.deepEqual(bookingSplit(b), {
    construction: 0,
    decor: 250_000,
    garden: 500_000,
    general: 250_000,
  });
});

test("older single-department records fall back to department and amount", () => {
  const b = { ...base, department: "decor", amount: 40_000 } as Booking;
  assert.equal(bookingSplit(b).decor, 40_000);
  assert.equal(bookingSplit(b).garden, 0);
});

test("department totals add up across purchases", () => {
  const a = {
    ...base,
    department: "decor",
    amount: 30,
    departmentAmounts: { decor: 10, garden: 20 },
  } as Booking;
  const c = { ...base, department: "garden", amount: 5 } as Booking;
  const t = splitTotals([a, c]);
  assert.equal(t.decor, 10);
  assert.equal(t.garden, 25);
});

import { purchaseFromItems } from "../src/lib/purchases";
test("purchase picked per category becomes a booking split across the four departments", () => {
  const p = purchaseFromItems([
    { categoryId: "cat-decor", categoryName: "ديكور", amount: 30000 },
    { categoryId: "cat-garden", categoryName: "بستان", amount: 5000 },
    { categoryId: "cat-misc", categoryName: "متنوع", amount: 0 },
  ]);
  assert.equal(p.amount, 35000);
  assert.equal(p.department, "decor");
  assert.deepEqual(p.departmentAmounts, { decor: 30000, garden: 5000 });
  assert.equal(p.courseId, "ps-multi");
  assert.equal(p.courseName, "ديكور + بستان");
  assert.equal(purchaseFromItems([{ categoryId: "cat-misc", categoryName: "متنوع", amount: 10 }]).department, "general");
});

import { upcomingPostSale } from "../src/lib/postSale";

test("a purchase schedules its post-sale follow-ups from the purchase date; a late-recorded one skips what already passed", () => {
  const all = upcomingPostSale("2026-10-20", "2026-10-20");
  assert.deepEqual(all.map((m) => [m.milestone, m.date]), [["7d", "2026-10-27"], ["30d", "2026-11-19"], ["6m", "2027-04-20"], ["12m", "2027-10-20"]]);
  // recorded two months late: the first two are already behind us
  assert.deepEqual(upcomingPostSale("2026-08-20", "2026-10-20").map((m) => m.milestone), ["6m", "12m"]);
  // never doubles what already exists
  assert.deepEqual(upcomingPostSale("2026-10-20", "2026-10-20", new Set(["7d", "30d"])).map((m) => m.milestone), ["6m", "12m"]);
});
