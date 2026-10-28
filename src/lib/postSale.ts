export type PostSaleMilestone = "7d" | "30d" | "6m" | "12m";

interface MilestoneDef {
  id: PostSaleMilestone;
  label: string;
  reason: string;
  days?: number;
  months?: number;
}

// Follow-ups scheduled after a purchase, counted from the purchase date (buying means receiving: there is no separate delivery).
export const postSaleMilestones: MilestoneDef[] = [
  {
    id: "7d",
    label: "بعد أسبوع من الشراء",
    days: 7,
    reason: "متابعة بعد الشراء: تأكد من رضا العميل وسجّل أي ملاحظات على الشغل.",
  },
  {
    id: "30d",
    label: "بعد شهر",
    days: 30,
    reason: "متابعة الشهر الأول: جودة التنفيذ وأي احتياج لصيانة أو تعديل.",
  },
  {
    id: "6m",
    label: "بعد 6 شهور",
    months: 6,
    reason:
      "متابعة 6 شهور: الحالة العامة للشغل، وفرص إضافية (باقي الوحدة أو مشروع جديد).",
  },
  {
    id: "12m",
    label: "بعد سنة",
    months: 12,
    reason: "متابعة سنوية: صيانة أو إعادة طلاء، وترشيح الأقارب والمعارف.",
  },
];

export const milestoneLabel = (id?: PostSaleMilestone) =>
  postSaleMilestones.find((m) => m.id === id)?.label ?? "";

const pad = (n: number) => String(n).padStart(2, "0");

/** Adds days/months to a YYYY-MM-DD date; month overflow clamps to the month end. */
export function addToDate(
  date: string,
  { days = 0, months = 0 }: { days?: number; months?: number },
): string {
  const [y, m, d] = date.split("-").map(Number);
  const totalMonths = y * 12 + (m - 1) + months;
  const ty = Math.floor(totalMonths / 12);
  const tm = totalMonths % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const base = Date.UTC(ty, tm, Math.min(d, lastDay));
  const out = new Date(base + days * 86_400_000);
  return `${out.getUTCFullYear()}-${pad(out.getUTCMonth() + 1)}-${pad(out.getUTCDate())}`;
}

export function buildPostSaleSchedule(purchaseDate: string) {
  return postSaleMilestones.map((m) => ({
    milestone: m.id,
    date: addToDate(purchaseDate, { days: m.days, months: m.months }),
    reason: m.reason,
  }));
}

/** The post-sale follow-ups still ahead of today for a purchase (a late-recorded one skips what already passed). */
export function upcomingPostSale(purchaseDate: string, todayStr: string, have: Set<string | undefined> = new Set()) {
  return buildPostSaleSchedule(purchaseDate).filter((m) => m.date >= todayStr && !have.has(m.milestone));
}

/** "أسبوع"، "شهر"، "6 شهور"، "سنة": how long after the purchase a milestone comes, in words. */
export function milestoneSpan(m: { days?: number; months?: number }): string {
  if (m.months) return m.months === 12 ? "سنة" : m.months === 1 ? "شهر" : m.months <= 10 ? `${m.months} شهور` : `${m.months} شهر`;
  const d = m.days ?? 0;
  return d === 7 ? "أسبوع" : d === 30 ? "شهر" : d === 1 ? "يوم" : d === 2 ? "يومين" : `${d} يوم`;
}
