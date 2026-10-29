import type { Booking, Lead, ReviewRequest } from "../types/crm";

/** Digits only, Egyptian mobile numbers reduced to their last ten so 0100… and +20100… match. */
import { toLatinDigits } from "./digits";
export const phoneKey = (phone: string) => toLatinDigits(phone).replace(/\D/g, "").slice(-10);
export const isReferralPhone = (phone: string) => phoneKey(phone).length >= 10;

export const referralMessage = (referrer: string) =>
  `أهلًا 🌷 معاك فريق شلبي. ${referrer} رشّحنا ليك وقال إنك ممكن تحتاج شغل دهانات أو تشطيب. يسعدنا نساعدك، وتقدر تعدّي على أقرب فرع لنا في الوقت اللي يناسبك.`;

/** A review that carries a person the customer recommended and that nobody has registered yet. */
export const pendingReferral = (r: ReviewRequest) => hasReferral(r) && !r.referralLeadId;

/** We only take a recommendation from a customer who is happy: 4 or 5 stars. Someone upset is not asked. */
export const REFERRAL_MIN_STARS = 4;
/** A recommended person is called this many days after being registered. */
export const REFERRAL_FOLLOWUP_DAYS = 2;
export const hasReferral = (r: ReviewRequest) =>
  r.status === "answered" && !!r.response?.referral && (r.response.rating ?? 0) >= REFERRAL_MIN_STARS;

export interface ReferrerRow {
  leadId: string;
  name: string;
  branchId: string;
  referred: number;
  visited: number;
  bought: number;
  totalEGP: number;
}

/** Customers who recommended others: how many they brought, and how many of those bought. */
export function referrerRows(leads: Lead[], bookings: Booking[]): ReferrerRow[] {
  const spent = new Map<string, number>();
  for (const b of bookings) if (b.bookingStatus !== "cancelled") spent.set(b.leadId, (spent.get(b.leadId) ?? 0) + b.amount);
  const byRef = new Map<string, Lead[]>();
  for (const l of leads) if (l.referredByLeadId) byRef.set(l.referredByLeadId, [...(byRef.get(l.referredByLeadId) ?? []), l]);
  return [...byRef.entries()]
    .map(([id, brought]) => {
      const from = leads.find((l) => l.id === id);
      const buyers = brought.filter((l) => (spent.get(l.id) ?? 0) > 0);
      return {
        leadId: id,
        name: from?.name ?? brought[0].referredByName ?? "عميل",
        branchId: from?.branchId ?? brought[0].branchId,
        referred: brought.length,
        visited: brought.filter((l) => !["new", "uncontacted"].includes(l.status) || (spent.get(l.id) ?? 0) > 0).length,
        bought: buyers.length,
        totalEGP: buyers.reduce((s, l) => s + (spent.get(l.id) ?? 0), 0),
      };
    })
    .sort((a, b) => b.totalEGP - a.totalEGP || b.referred - a.referred);
}
