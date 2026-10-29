import type { Booking, EmployeeTarget, TargetSettings, User } from "../types/crm";
import { achievedBetween, targetable, targetForPeriod } from "./targets";
import { progressTone, type Tone } from "./progress";
import { addToDate } from "./postSale";
import { weekRange } from "./teamSales";

export interface ReportRow {
  userId: string;
  name: string;
  sold: number;
  deals: number;
  /** The target for the period (a month's target counted for the days inside the period). */
  target: number;
  percent: number;
  tone: Tone;
  over: boolean;
}

/** Money only: what each person sold between two dates, against their target for those dates. Best sellers first. */
export function periodReport(input: { users: User[]; bookings: Booking[]; targets: EmployeeTarget[]; settings: TargetSettings; from: string; to: string }): { rows: ReportRow[]; total: { sold: number; deals: number; target: number; percent: number } } {
  const { users, bookings, targets, settings, from, to } = input;
  const rows = users
    .filter(targetable)
    .map((u): ReportRow => {
      const a = achievedBetween(u.id, from, to, bookings, settings);
      const target = targetForPeriod(u.id, from, to, targets, settings);
      const percent = target > 0 ? Math.round((a.amount / target) * 1000) / 10 : 0;
      return { userId: u.id, name: u.name, sold: a.amount, deals: a.purchases, target, percent, ...progressTone(target > 0 ? percent : 0) };
    })
    .sort((x, y) => y.sold - x.sold || x.name.localeCompare(y.name, "ar"));
  const sold = rows.reduce((s, r) => s + r.sold, 0);
  const target = rows.reduce((s, r) => s + r.target, 0);
  return { rows, total: { sold, deals: rows.reduce((s, r) => s + r.deals, 0), target, percent: target > 0 ? Math.round((sold / target) * 1000) / 10 : 0 } };
}

const money = (n: number) => n.toLocaleString("en-US");

/** The short report to paste into a chat: one line per person, money only. */
export function reportText(r: ReturnType<typeof periodReport>, from: string, to: string): string {
  return [
    `تقرير المبيعات من ${from} إلى ${to}`,
    ...r.rows.map((x) => `${x.name}: باع ${money(x.sold)} ج.م${x.target ? ` من هدف ${money(x.target)} (${x.percent}٪)${x.over ? " ⭐" : ""}` : " (بدون هدف)"}`),
    `الإجمالي: ${money(r.total.sold)} ج.م${r.total.target ? ` من ${money(r.total.target)} (${r.total.percent}٪)` : ""}`,
  ].join("\n");
}

export const periods = {
  week: (today: string) => weekRange(today),
  month: (today: string) => {
    const m = today.slice(0, 7);
    const [y, mo] = m.split("-").map(Number);
    return { from: `${m}-01`, to: `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, "0")}` };
  },
  lastMonth: (today: string) => {
    const first = `${today.slice(0, 7)}-01`;
    const to = addToDate(first, { days: -1 });
    return { from: `${to.slice(0, 7)}-01`, to };
  },
};
