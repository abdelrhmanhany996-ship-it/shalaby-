import test from "node:test";
import assert from "node:assert/strict";
import { balances, defaultAccountingSettings as S, entriesTable, filterEntries, newEntry, recordedSales, sanitizeAccountingSettings, summarize, validateEntry, voided } from "../src/lib/accounting";
import { toCsv } from "../src/lib/reportExports";
import type { AccountEntry, Booking } from "../src/types/crm";

const by = { id: "acc1", name: "محاسب" };
const TODAY = "2026-10-20";
const entry = (over: Partial<AccountEntry> = {}): AccountEntry => ({
  id: "e1", date: "2026-10-10", type: "income", amount: 1000, accountId: "acc-cash", categoryId: "inc-collection", description: "تحصيل دفعة", status: "posted", createdAt: "2026-10-10T08:00:00Z", createdById: "acc1", createdByName: "محاسب", ...over,
});
const input = (over = {}) => ({ date: "2026-10-10", type: "income" as const, amount: 250.555, accountId: "acc-cash", categoryId: "inc-collection", description: "تحصيل دفعة", ...over });

test("a new entry is checked against the books' own lists", () => {
  const e = newEntry(input({ employeeId: "u1", employeeName: "سالي", reference: " إيصال 12 " }), S, "e9", by, "now", TODAY);
  assert.equal(e.amount, 250.56);
  assert.equal(e.status, "posted");
  assert.equal(e.reference, "إيصال 12");
  assert.equal(e.employeeName, "سالي");
  assert.throws(() => validateEntry(input({ amount: 0 }), S, TODAY));
  assert.throws(() => validateEntry(input({ amount: -5 }), S, TODAY));
  assert.throws(() => validateEntry(input({ amount: Number.NaN }), S, TODAY));
  assert.throws(() => validateEntry(input({ date: "2026-10-21" }), S, TODAY), /مستقبلي/);
  assert.throws(() => validateEntry(input({ date: "2026-13-40" }), S, TODAY));
  assert.throws(() => validateEntry(input({ accountId: "nope" }), S, TODAY));
  assert.throws(() => validateEntry(input({ categoryId: "exp-rent" }), S, TODAY), /مش من نوع/);
  assert.throws(() => validateEntry(input({ description: "  ا " }), S, TODAY));
});

test("balances: opening + income - expenses, per account, cancelled entries ignored", () => {
  const settings = { ...S, accounts: S.accounts.map((a) => (a.id === "acc-cash" ? { ...a, openingBalance: 500 } : a)) };
  const list = [
    entry(),
    entry({ id: "e2", type: "expense", categoryId: "exp-rent", amount: 300 }),
    entry({ id: "e3", accountId: "acc-bank", amount: 2000 }),
    entry({ id: "e4", amount: 9999, status: "void" }),
    entry({ id: "e5", accountId: "gone", amount: 40, type: "expense", categoryId: "exp-other" }),
  ];
  const b = balances(settings, list);
  const get = (id: string) => b.rows.find((r) => r.account.id === id)!;
  assert.equal(get("acc-cash").balance, 1200); // 500 + 1000 - 300
  assert.equal(get("acc-bank").balance, 2000);
  assert.equal(get("acc-wallet").balance, 0);
  assert.equal(get("?").balance, -40);
  assert.equal(b.total, 3160); // nothing lost or invented
  // as of an earlier date
  assert.equal(balances(settings, list, "2026-10-09").total, 500);
});

test("voiding keeps the record, stops it counting, and needs a reason; it can't be done twice", () => {
  const e = entry();
  const v = voided(e, "مبلغ غلط", by, "t");
  assert.equal(v.status, "void");
  assert.equal(v.amount, e.amount);
  assert.deepEqual([v.voidedByName, v.voidReason], ["محاسب", "مبلغ غلط"]);
  assert.equal(e.status, "posted");
  assert.throws(() => voided(v, "تاني", by, "t"));
  assert.throws(() => voided(e, " ", by, "t"));
  assert.equal(balances(S, [v]).total, 0);
  const fixed = newEntry(input({ amount: 800 }), S, "e2", by, "t", TODAY, e.id);
  assert.equal(fixed.replacesId, "e1");
  assert.equal(balances(S, [v, fixed]).total, 800);
});

test("filters by date, type, account, category, employee, status and text; newest first", () => {
  const list = [
    entry({ id: "a", date: "2026-10-01", employeeId: "u1", employeeName: "سالي" }),
    entry({ id: "b", date: "2026-10-15", type: "expense", categoryId: "exp-rent", accountId: "acc-bank", description: "إيجار المعرض" }),
    entry({ id: "c", date: "2026-10-12", status: "void" }),
  ];
  assert.deepEqual(filterEntries(list, {}).map((e) => e.id), ["b", "a"]);
  assert.deepEqual(filterEntries(list, { status: "all" }).map((e) => e.id), ["b", "c", "a"]);
  assert.deepEqual(filterEntries(list, { status: "void" }).map((e) => e.id), ["c"]);
  assert.deepEqual(filterEntries(list, { from: "2026-10-05" }).map((e) => e.id), ["b"]);
  assert.deepEqual(filterEntries(list, { to: "2026-10-05" }).map((e) => e.id), ["a"]);
  assert.deepEqual(filterEntries(list, { type: "expense" }).map((e) => e.id), ["b"]);
  assert.deepEqual(filterEntries(list, { accountId: "acc-bank" }).map((e) => e.id), ["b"]);
  assert.deepEqual(filterEntries(list, { categoryId: "inc-collection" }).map((e) => e.id), ["a"]);
  assert.deepEqual(filterEntries(list, { employeeId: "u1" }).map((e) => e.id), ["a"]);
  assert.deepEqual(filterEntries(list, { q: "ايجار" }).map((e) => e.id), []); // exact text, not fuzzy
  assert.deepEqual(filterEntries(list, { q: "إيجار" }).map((e) => e.id), ["b"]);
});

test("summary totals match the balances' movements, by category, employee and month", () => {
  const list = [
    entry({ employeeId: "u1", employeeName: "سالي" }),
    entry({ id: "e2", date: "2026-09-30", amount: 400, employeeId: "u1", employeeName: "سالي" }),
    entry({ id: "e3", type: "expense", categoryId: "exp-rent", amount: 300 }),
    entry({ id: "e4", amount: 77, status: "void" }),
  ];
  const s = summarize(list);
  assert.deepEqual([s.income, s.expense, s.net, s.count], [1400, 300, 1100, 3]);
  assert.deepEqual(s.byMonth.map((m) => [m.month, m.income, m.expense, m.net]), [["2026-09", 400, 0, 400], ["2026-10", 1000, 300, 700]]);
  assert.deepEqual(s.byEmployee, [{ employeeId: "u1", name: "سالي", income: 1400, expense: 0 }]);
  assert.equal(s.byCategory.reduce((t, c) => t + (c.type === "income" ? c.total : -c.total), 0), s.net);
  const b = balances(S, list);
  assert.equal(b.total, s.net);
});

test("recorded sales are for comparison only and never counted twice", () => {
  const bk = (o: Partial<Booking>) => ({ id: "b1", department: "decor", amount: 1000, bookingDate: "2026-10-05", bookingStatus: "confirmed", ...o }) as Booking;
  assert.equal(recordedSales([bk({}), bk({}), bk({ id: "b2", bookingStatus: "cancelled" }), bk({ id: "b3", paymentStatus: "refunded" }), bk({ id: "b4", amount: 250, bookingDate: "2026-09-01" })], "2026-10-01", "2026-10-31"), 1000);
});

test("the export is a spreadsheet-safe table with every entry", () => {
  const table = entriesTable([entry({ description: '=HYPERLINK("x")', reference: "a,b" }), entry({ id: "v", status: "void", voidReason: "غلط" })], S);
  assert.equal(table.rows.length, 2);
  assert.equal(table.headers.length, table.rows[0].length);
  const lines = toCsv(table).split("\r\n");
  assert.ok(lines[1].includes("\"'=HYPERLINK(\"\"x\"\")\""));
  assert.ok(lines[1].includes('"a,b"'));
  assert.ok(lines[2].includes("ملغاة"));
});

test("bad settings fall back to a safe set", () => {
  assert.deepEqual(sanitizeAccountingSettings(null), S);
  const s = sanitizeAccountingSettings({ accounts: [{ id: "x", name: " بنك ", openingBalance: 5, active: true }, { id: "", name: "" } as never], categories: [{ id: "c", name: "خدمات", type: "expense", active: true }, { id: "d", name: "x", type: "weird" } as never] });
  assert.deepEqual(s.accounts, [{ id: "x", name: "بنك", openingBalance: 5, active: true }]);
  assert.deepEqual(s.categories, [{ id: "c", name: "خدمات", type: "expense", active: true }]);
});
