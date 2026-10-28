import type { Booking, Department, NotBoughtRecord } from "../types/crm";

/** The four main departments a purchase is split across. */
export const departmentIds: Department[] = [
  "construction",
  "decor",
  "garden",
  "general",
];

/** Amount of a purchase per department; older records fall back to their single department. */
export function bookingSplit(b: Booking): Record<Department, number> {
  const out = { construction: 0, decor: 0, garden: 0, general: 0 } as Record<
    Department,
    number
  >;
  if (b.departmentAmounts) {
    for (const id of departmentIds) out[id] = b.departmentAmounts[id] || 0;
  } else {
    out[b.department] = b.amount;
  }
  return out;
}

export function splitTotals(bookings: Booking[]): Record<Department, number> {
  const out = { construction: 0, decor: 0, garden: 0, general: 0 } as Record<
    Department,
    number
  >;
  for (const b of bookings) {
    const s = bookingSplit(b);
    for (const id of departmentIds) out[id] += s[id];
  }
  return out;
}

/** The only purchase categories in the system: one per main department. They match the ids of existing invoices. */
export const purchaseCategoryList = [
  { id: "cat-construction", name: "إنشائي" },
  { id: "cat-decor", name: "ديكور" },
  { id: "cat-garden", name: "بستان" },
  { id: "cat-misc", name: "متنوع" },
] as const;

const categoryDepartment: Record<string, Department> = {
  "cat-construction": "construction",
  "cat-decor": "decor",
  "cat-garden": "garden",
  "cat-misc": "general",
};

/** The booking fields for what a customer bought, from the amounts picked per category. */
export function purchaseFromItems(items: { categoryId: string; categoryName: string; amount: number }[]) {
  const amounts: Partial<Record<Department, number>> = {};
  const names: string[] = [];
  for (const i of items) {
    const dept = categoryDepartment[i.categoryId] ?? (departmentIds.includes(i.categoryId as Department) ? (i.categoryId as Department) : "general");
    const amount = Number(i.amount);
    if (!(amount > 0)) continue;
    amounts[dept] = (amounts[dept] ?? 0) + amount;
    names.push(i.categoryName);
  }
  const entries = Object.entries(amounts) as [Department, number][];
  const primary = [...entries].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "general";
  return {
    department: primary,
    departmentAmounts: amounts,
    amount: entries.reduce((s, [, v]) => s + v, 0),
    courseId: entries.length === 1 ? `ps-${primary}` : "ps-multi",
    courseName: [...new Set(names)].join(" + "),
  };
}

export type LastOutcome =
  | { kind: "bought"; date: string; amount: number; what: string }
  | { kind: "ask" };

/**
 * What to show next to a customer about buying. If the latest thing recorded is a purchase, the
 * question has already been answered, so show when they last bought. Otherwise (never bought, or a
 * "not yet" after the last purchase) the question is still open.
 */
export function lastOutcome(
  leadId: string,
  bookings: Pick<Booking, "leadId" | "bookingStatus" | "bookingDate" | "createdAt" | "amount" | "courseName">[],
  notBought: Pick<NotBoughtRecord, "leadId" | "createdAt">[],
): LastOutcome {
  const stamp = (d: string) => new Date(d).getTime() || 0;
  const bought = bookings
    .filter((b) => b.leadId === leadId && b.bookingStatus !== "cancelled")
    .sort((a, b) => stamp(b.createdAt) - stamp(a.createdAt))[0];
  if (!bought) return { kind: "ask" };
  const later = notBought.some((n) => n.leadId === leadId && stamp(n.createdAt) > stamp(bought.createdAt));
  return later ? { kind: "ask" } : { kind: "bought", date: bought.bookingDate, amount: bought.amount, what: bought.courseName };
}
