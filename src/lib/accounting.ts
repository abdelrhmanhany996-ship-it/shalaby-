import type { AccountCategoryDef, AccountDef, AccountEntry, AccountEntryType, AccountingSettings, Booking } from "../types/crm";
import { bookingSplit, departmentIds } from "./purchases";

/**
 * The books. Every balance is computed from the recorded entries and nothing else:
 *   account balance = opening balance + posted income - posted expenses
 * Entries are never edited or removed. A wrong entry is voided (it stays, with who and why, and stops counting) and the
 * corrected one points back to it, so the trail is complete. Sales recorded in the CRM (purchases) are shown next to the books
 * for comparison but are NOT added to any balance: money only enters an account when someone records the receipt.
 */

export const defaultAccountingSettings: AccountingSettings = {
  accounts: [
    { id: "acc-cash", name: "الخزنة (كاش)", openingBalance: 0, active: true },
    { id: "acc-bank", name: "حساب البنك", openingBalance: 0, active: true },
    { id: "acc-wallet", name: "محفظة إلكترونية", openingBalance: 0, active: true },
  ],
  categories: [
    { id: "inc-collection", name: "تحصيل من عملاء", type: "income", active: true },
    { id: "inc-other", name: "إيرادات أخرى", type: "income", active: true },
    { id: "exp-materials", name: "مشتريات وخامات", type: "expense", active: true },
    { id: "exp-rent", name: "إيجار ومرافق", type: "expense", active: true },
    { id: "exp-transport", name: "نقل ومواصلات", type: "expense", active: true },
    { id: "exp-marketing", name: "تسويق وإعلانات", type: "expense", active: true },
    { id: "exp-admin", name: "مصروفات إدارية", type: "expense", active: true },
    { id: "exp-other", name: "مصروفات أخرى", type: "expense", active: true },
  ],
};

/** Settings from the database with bad rows dropped, so a half-written document can never break the screen. */
export function sanitizeAccountingSettings(raw: Partial<AccountingSettings> | null | undefined): AccountingSettings {
  const accounts = (Array.isArray(raw?.accounts) ? raw!.accounts : []).filter(
    (a): a is AccountDef => !!a && typeof a.id === "string" && typeof a.name === "string" && a.name.trim() !== "",
  ).map((a) => ({ id: a.id, name: a.name.trim(), openingBalance: Number.isFinite(a.openingBalance) ? a.openingBalance : 0, active: a.active !== false }));
  const categories = (Array.isArray(raw?.categories) ? raw!.categories : []).filter(
    (c): c is AccountCategoryDef => !!c && typeof c.id === "string" && typeof c.name === "string" && c.name.trim() !== "" && (c.type === "income" || c.type === "expense"),
  ).map((c) => ({ id: c.id, name: c.name.trim(), type: c.type, active: c.active !== false }));
  return {
    accounts: accounts.length ? accounts : defaultAccountingSettings.accounts,
    categories: categories.length ? categories : defaultAccountingSettings.categories,
  };
}

const MAX_AMOUNT = 10_000_000_000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(`${d}T00:00:00Z`).getTime());

export interface EntryInput {
  date: string;
  type: AccountEntryType;
  amount: number;
  accountId: string;
  categoryId: string;
  description: string;
  employeeId?: string;
  employeeName?: string;
  branchId?: string;
  bookingId?: string;
  reference?: string;
}

/** Checks an entry against the books' own lists. Throws a message the person can read. `today` is the Cairo date. */
export function validateEntry(input: EntryInput, settings: AccountingSettings, today: string) {
  if (input.type !== "income" && input.type !== "expense") throw new Error("حدد نوع الحركة: إيراد أو مصروف.");
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > MAX_AMOUNT) throw new Error("المبلغ لازم يكون رقم أكبر من صفر.");
  if (!isDate(input.date)) throw new Error("التاريخ غير صحيح.");
  if (input.date > today) throw new Error("مينفعش تسجّل حركة بتاريخ مستقبلي.");
  const account = settings.accounts.find((a) => a.id === input.accountId);
  if (!account || !account.active) throw new Error("الحساب غير موجود أو متوقف.");
  const category = settings.categories.find((c) => c.id === input.categoryId);
  if (!category || !category.active) throw new Error("التصنيف غير موجود أو متوقف.");
  if (category.type !== input.type) throw new Error("التصنيف ده مش من نوع الحركة المختار.");
  if (input.description.trim().length < 3) throw new Error("اكتب بيان الحركة (3 حروف على الأقل).");
}

export function newEntry(input: EntryInput, settings: AccountingSettings, id: string, by: { id: string; name: string }, now: string, today: string, replacesId?: string): AccountEntry {
  validateEntry(input, settings, today);
  return {
    id,
    date: input.date,
    type: input.type,
    amount: round2(input.amount),
    accountId: input.accountId,
    categoryId: input.categoryId,
    description: input.description.trim(),
    ...(input.employeeId ? { employeeId: input.employeeId, employeeName: input.employeeName } : {}),
    ...(input.branchId ? { branchId: input.branchId } : {}),
    ...(input.bookingId ? { bookingId: input.bookingId } : {}),
    ...(input.reference?.trim() ? { reference: input.reference.trim() } : {}),
    status: "posted",
    ...(replacesId ? { replacesId } : {}),
    createdAt: now,
    createdById: by.id,
    createdByName: by.name,
  };
}

/** The entry cancelled: it keeps every field and stops counting. */
export function voided(entry: AccountEntry, reason: string, by: { id: string; name: string }, now: string): AccountEntry {
  if (entry.status === "void") throw new Error("الحركة دي ملغاة بالفعل.");
  if (reason.trim().length < 3) throw new Error("اكتب سبب الإلغاء.");
  return { ...entry, status: "void", voidedAt: now, voidedById: by.id, voidedByName: by.name, voidReason: reason.trim() };
}

const posted = (e: AccountEntry) => e.status === "posted";
const sum = (list: AccountEntry[]) => round2(list.reduce((s, e) => s + e.amount, 0));

export interface Filters {
  from?: string;
  to?: string;
  type?: AccountEntryType | "all";
  accountId?: string;
  categoryId?: string;
  employeeId?: string;
  /** "posted" (default) hides cancelled entries; "void" shows only them; "all" shows both. */
  status?: "posted" | "void" | "all";
  q?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function filterEntries(entries: AccountEntry[], f: Filters): AccountEntry[] {
  const status = f.status ?? "posted";
  const q = f.q ? norm(f.q) : "";
  return entries
    .filter(
      (e) =>
        (status === "all" || e.status === status) &&
        (!f.from || e.date >= f.from) &&
        (!f.to || e.date <= f.to) &&
        (!f.type || f.type === "all" || e.type === f.type) &&
        (!f.accountId || e.accountId === f.accountId) &&
        (!f.categoryId || e.categoryId === f.categoryId) &&
        (!f.employeeId || e.employeeId === f.employeeId) &&
        (!q || norm(`${e.description} ${e.reference ?? ""} ${e.employeeName ?? ""}`).includes(q)),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export interface AccountBalance {
  account: AccountDef;
  income: number;
  expense: number;
  balance: number;
}

/** Balance per account as of a date (everything recorded up to and including it), and the total of the active accounts. */
export function balances(settings: AccountingSettings, entries: AccountEntry[], asOf?: string) {
  const live = entries.filter((e) => posted(e) && (!asOf || e.date <= asOf));
  const rows: AccountBalance[] = settings.accounts.map((account) => {
    const mine = live.filter((e) => e.accountId === account.id);
    const income = sum(mine.filter((e) => e.type === "income"));
    const expense = sum(mine.filter((e) => e.type === "expense"));
    return { account, income, expense, balance: round2(account.openingBalance + income - expense) };
  });
  // Entries on an account that was later removed from the list still count, under their own line.
  const known = new Set(settings.accounts.map((a) => a.id));
  const orphans = live.filter((e) => !known.has(e.accountId));
  if (orphans.length) {
    const income = sum(orphans.filter((e) => e.type === "income"));
    const expense = sum(orphans.filter((e) => e.type === "expense"));
    rows.push({ account: { id: "?", name: "حساب غير معرّف", openingBalance: 0, active: false }, income, expense, balance: round2(income - expense) });
  }
  return { rows, total: round2(rows.reduce((s, r) => s + r.balance, 0)) };
}

export interface Summary {
  income: number;
  expense: number;
  net: number;
  count: number;
  byCategory: { categoryId: string; type: AccountEntryType; total: number; count: number }[];
  byEmployee: { employeeId: string; name: string; income: number; expense: number }[];
  byMonth: { month: string; income: number; expense: number; net: number }[];
}

/** Totals over a list of entries (cancelled ones are ignored, so pass the filtered list). */
export function summarize(entries: AccountEntry[]): Summary {
  const live = entries.filter(posted);
  const income = sum(live.filter((e) => e.type === "income"));
  const expense = sum(live.filter((e) => e.type === "expense"));
  const cat = new Map<string, { categoryId: string; type: AccountEntryType; total: number; count: number }>();
  const emp = new Map<string, { employeeId: string; name: string; income: number; expense: number }>();
  const mon = new Map<string, { month: string; income: number; expense: number; net: number }>();
  for (const e of live) {
    const c = cat.get(e.categoryId) ?? { categoryId: e.categoryId, type: e.type, total: 0, count: 0 };
    c.total = round2(c.total + e.amount);
    c.count++;
    cat.set(e.categoryId, c);
    if (e.employeeId) {
      const p = emp.get(e.employeeId) ?? { employeeId: e.employeeId, name: e.employeeName ?? e.employeeId, income: 0, expense: 0 };
      p[e.type] = round2(p[e.type] + e.amount);
      emp.set(e.employeeId, p);
    }
    const m = mon.get(e.date.slice(0, 7)) ?? { month: e.date.slice(0, 7), income: 0, expense: 0, net: 0 };
    m[e.type] = round2(m[e.type] + e.amount);
    m.net = round2(m.income - m.expense);
    mon.set(m.month, m);
  }
  return {
    income,
    expense,
    net: round2(income - expense),
    count: live.length,
    byCategory: [...cat.values()].sort((a, b) => b.total - a.total),
    byEmployee: [...emp.values()].sort((a, b) => b.income + b.expense - (a.income + a.expense)),
    byMonth: [...mon.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}

/** Sales recorded in the CRM for the same period (not cancelled or refunded), for comparison with receipts. */
export function recordedSales(bookings: Booking[], from?: string, to?: string) {
  const seen = new Set<string>();
  let total = 0;
  for (const b of bookings) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    if (b.bookingStatus === "cancelled" || b.paymentStatus === "refunded") continue;
    if ((from && b.bookingDate < from) || (to && b.bookingDate > to)) continue;
    const s = bookingSplit(b);
    total += departmentIds.reduce((x, d) => x + (s[d] || 0), 0);
  }
  return round2(total);
}

/** The entries as a table (one row each, cancelled ones included and marked); the report exporter turns it into a spreadsheet-safe CSV. */
export function entriesTable(entries: AccountEntry[], settings: AccountingSettings): { headers: string[]; rows: (string | number)[][] } {
  const account = (id: string) => settings.accounts.find((a) => a.id === id)?.name ?? id;
  const category = (id: string) => settings.categories.find((c) => c.id === id)?.name ?? id;
  return {
    headers: ["التاريخ", "النوع", "المبلغ", "الحساب", "التصنيف", "البيان", "المسؤول", "مرجع", "الحالة", "سبب الإلغاء", "سجّلها"],
    rows: entries.map((e) => [
      e.date,
      e.type === "income" ? "إيراد" : "مصروف",
      e.amount,
      account(e.accountId),
      category(e.categoryId),
      e.description,
      e.employeeName ?? "",
      e.reference ?? "",
      e.status === "void" ? "ملغاة" : "مسجّلة",
      e.voidReason ?? "",
      e.createdByName,
    ]),
  };
}
