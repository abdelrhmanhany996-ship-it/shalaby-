import type { PurchaseLine } from "../types/crm";

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** A line's value: price x pieces when both are given, otherwise the amount typed directly. */
export function lineTotal(l: Pick<PurchaseLine, "price" | "qty" | "total">): number {
  const price = num(l.price);
  const qty = num(l.qty);
  return price && qty ? round2(price * qty) : round2(num(l.total));
}

export const grandTotal = (lines: PurchaseLine[]) => round2(lines.reduce((s, l) => s + lineTotal(l), 0));

/** Lines worth keeping: they have a name or a value. Totals are recomputed so a stored line is always consistent. */
export function cleanLines(lines: PurchaseLine[]): PurchaseLine[] {
  return lines
    .map((l) => ({
      name: l.name.trim().slice(0, 120),
      ...(num(l.price) ? { price: round2(num(l.price)) } : {}),
      ...(num(l.qty) ? { qty: num(l.qty) } : {}),
      total: lineTotal(l),
    }))
    .filter((l) => l.name || l.total > 0)
    .slice(0, 50);
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** "كرسي × 2 × 150 = 300" (price and pieces are shown only when they were typed). */
export function describeLine(l: PurchaseLine): string {
  const parts = [l.name || "صنف"];
  if (l.qty) parts.push(`× ${fmt(l.qty)} قطعة`);
  if (l.price) parts.push(`بسعر ${fmt(l.price)}`);
  return `${parts.join(" ")} = ${fmt(l.total)} ج.م`;
}

/** The product names for a purchase title, or the plain default when none were typed. */
export function productsLabel(lines: PurchaseLine[] | undefined): string {
  const names = [...new Set((lines ?? []).map((l) => l.name.trim()).filter(Boolean))];
  if (!names.length) return "عملية بيع";
  return names.length > 3 ? `${names.slice(0, 3).join(" + ")} + ${names.length - 3}` : names.join(" + ");
}
