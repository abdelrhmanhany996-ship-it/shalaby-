import type { Booking, Quote, User } from "../types/crm";
import { addToDate } from "./postSale";
import { isSalesCapable } from "./permissions";

/** The working week is Saturday to Friday. `today` is the Cairo date (YYYY-MM-DD). */
export function weekRange(today: string): { from: string; to: string } {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // Sunday = 0 ... Saturday = 6
  const from = addToDate(today, { days: -((dow + 1) % 7) });
  return { from, to: addToDate(from, { days: 6 }) };
}

export interface SellerWeek {
  userId: string;
  name: string;
  /** What they sold in the period, in EGP. */
  sales: number;
  deals: number;
  /** Quotes they made in the period, and how those ended up. */
  quotes: number;
  quotesValue: number;
  accepted: number;
  lost: number;
  /** Quotes still open (draft or sent). */
  pending: number;
}

const inRange = (d: string, from: string, to: string) => d.slice(0, 10) >= from && d.slice(0, 10) <= to;

/**
 * One row per salesperson (and sales manager) for the period: what they sold and what became of their quotes.
 * Pass only the rows the viewer may read; people with no activity still appear, so a quiet week is visible too.
 */
export function weeklyTeamSales(input: { users: User[]; bookings: Booking[]; quotes: Quote[]; from: string; to: string }): SellerWeek[] {
  const { users, bookings, quotes, from, to } = input;
  const rows = new Map<string, SellerWeek>();
  const row = (id: string, name: string) => {
    let r = rows.get(id);
    if (!r) rows.set(id, (r = { userId: id, name, sales: 0, deals: 0, quotes: 0, quotesValue: 0, accepted: 0, lost: 0, pending: 0 }));
    return r;
  };
  for (const u of users) if (u.active && isSalesCapable(u)) row(u.id, u.name);
  for (const b of bookings) {
    if (b.bookingStatus === "cancelled" || !inRange(b.bookingDate, from, to)) continue;
    const r = row(b.agentId, b.agentName ?? "—");
    r.sales += b.amount;
    r.deals += 1;
  }
  for (const q of quotes) {
    if (!inRange(q.date, from, to)) continue;
    const r = row(q.agentId, q.agentName ?? "—");
    r.quotes += 1;
    r.quotesValue += q.total;
    if (q.status === "accepted") r.accepted += 1;
    else if (q.status === "lost") r.lost += 1;
    else r.pending += 1;
  }
  return [...rows.values()].sort((a, b) => b.sales - a.sales || b.quotes - a.quotes || a.name.localeCompare(b.name, "ar"));
}

export function teamTotals(rows: SellerWeek[]) {
  return rows.reduce(
    (t, r) => ({ sales: t.sales + r.sales, deals: t.deals + r.deals, quotes: t.quotes + r.quotes, accepted: t.accepted + r.accepted }),
    { sales: 0, deals: 0, quotes: 0, accepted: 0 },
  );
}
