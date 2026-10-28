import type { BrokerEntity, Booking, Department, Lead } from "../types/crm";
import { bookingSplit, departmentIds } from "./purchases";

export type Split = Record<Department, number>;
const emptySplit = (): Split => ({ construction: 0, decor: 0, garden: 0, general: 0 });

export interface CustomerRow {
  leadId: string;
  name: string;
  phone: string;
  branchId: string;
  brokerId?: string;
  brokerName?: string;
  total: number;
  split: Split;
  purchases: number;
  lastDate?: string;
}

/** Customers ranked by total purchases (cancelled purchases excluded). */
export function customerRows(bookings: Booking[], leads: Lead[]): CustomerRow[] {
  const byLead = new Map<string, CustomerRow>();
  for (const l of leads) {
    byLead.set(l.id, {
      leadId: l.id,
      name: l.name,
      phone: l.phone,
      branchId: l.branchId,
      brokerId: l.brokerId,
      brokerName: l.brokerName,
      total: 0,
      split: emptySplit(),
      purchases: 0,
    });
  }
  for (const b of bookings) {
    if (b.bookingStatus === "cancelled") continue;
    const row = byLead.get(b.leadId);
    if (!row) continue;
    const s = bookingSplit(b);
    for (const id of departmentIds) {
      row.split[id] += s[id];
      row.total += s[id];
    }
    row.purchases += 1;
    if (!row.lastDate || b.bookingDate > row.lastDate) row.lastDate = b.bookingDate;
  }
  return [...byLead.values()]
    .filter((r) => r.purchases > 0)
    .sort((a, b) => b.total - a.total);
}

export interface BrokerRow {
  brokerId: string;
  name: string;
  type: BrokerEntity["type"];
  referred: number; // all customers they brought
  buyers: CustomerRow[]; // those who bought, strongest first
  total: number;
  split: Split;
}

/** Brokers ranked by the total purchases of the customers they brought. */
export function brokerRows(
  customers: CustomerRow[],
  leads: Lead[],
  brokers: BrokerEntity[],
): BrokerRow[] {
  return brokers
    .map((b) => {
      const buyers = customers.filter((c) => c.brokerId === b.id);
      const split = emptySplit();
      for (const c of buyers) for (const id of departmentIds) split[id] += c.split[id];
      return {
        brokerId: b.id,
        name: b.name,
        type: b.type,
        referred: leads.filter((l) => l.brokerId === b.id).length,
        buyers,
        total: buyers.reduce((s, c) => s + c.total, 0),
        split,
      };
    })
    .filter((r) => r.referred > 0)
    .sort((a, b) => b.total - a.total);
}

export interface DepartmentLeader {
  total: number;
  buyers: number;
  top: { leadId: string; name: string; amount: number }[];
  topBroker?: { name: string; amount: number };
}

/** Who buys the most from each department, and who brings that business. */
export function departmentLeaders(
  customers: CustomerRow[],
  brokers: BrokerRow[],
  top = 3,
): Record<Department, DepartmentLeader> {
  const out = {} as Record<Department, DepartmentLeader>;
  for (const id of departmentIds) {
    const buyers = customers.filter((c) => c.split[id] > 0).sort((a, b) => b.split[id] - a.split[id]);
    const broker = [...brokers].sort((a, b) => b.split[id] - a.split[id])[0];
    out[id] = {
      total: buyers.reduce((s, c) => s + c.split[id], 0),
      buyers: buyers.length,
      top: buyers.slice(0, top).map((c) => ({ leadId: c.leadId, name: c.name, amount: c.split[id] })),
      topBroker: broker && broker.split[id] > 0 ? { name: broker.name, amount: broker.split[id] } : undefined,
    };
  }
  return out;
}

export interface FeedbackSummary {
  count: number;
  average: number;
  location: number;
  treatment: number;
  price: number;
  distribution: number[]; // index 0 = 1 star
  recent: { leadId: string; name: string; stars: number; comment?: string }[];
}

const avg = (nums: number[]) => (nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0);

export function feedbackSummary(leads: Lead[]): FeedbackSummary {
  const rated = leads.filter((l) => l.customerRatingStars);
  const distribution = [0, 0, 0, 0, 0];
  for (const l of rated) distribution[Math.min(5, Math.max(1, Math.round(l.customerRatingStars!))) - 1] += 1;
  return {
    count: rated.length,
    average: avg(rated.map((l) => l.customerRatingStars!)),
    location: avg(leads.map((l) => l.locationRating || 0).filter(Boolean)),
    treatment: avg(leads.map((l) => l.treatmentRating || 0).filter(Boolean)),
    price: avg(leads.map((l) => l.priceRating || 0).filter(Boolean)),
    distribution,
    recent: rated
      .filter((l) => l.customerRatingComment)
      .slice(0, 5)
      .map((l) => ({ leadId: l.id, name: l.name, stars: l.customerRatingStars!, comment: l.customerRatingComment })),
  };
}
