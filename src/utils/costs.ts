import { Subscription, User } from '../types';

const USD = new Set(['$', 'USD', 'usd']);

// Archived and expired subscriptions are no longer being paid for
export const isBilled = (s: Subscription) => s.status !== 'Archived' && s.status !== 'Expired';

// Months covered by one payment, from the start and renewal dates (yearly falls back to 12)
const billingMonths = (s: Subscription) => {
  const start = new Date(s.startDate);
  const end = new Date(s.renewalDate);
  if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
    const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (months >= 1) return months;
  }
  return s.billingCycle === 'Yearly' ? 12 : 1;
};

export const monthlyCost = (s: Subscription) => (Number(s.cost) || 0) / billingMonths(s);

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CostStats {
  monthlyTotal: number;
  yearlyTotal: number;
  payingUsers: number;
  avgPerUser: number | null;
  // Subscriptions in other currencies are left out of the $ totals instead of being added as if they were dollars
  otherCurrencyCount: number;
}

export const costStats = (subscriptions: Subscription[], users: User[]): CostStats => {
  const billed = subscriptions.filter(isBilled);
  const usd = billed.filter((s) => USD.has(s.currency));
  const monthlyTotal = round2(usd.reduce((sum, s) => sum + monthlyCost(s), 0));

  // Only real, active users who are actually assigned to a paid subscription
  const activeIds = new Set(users.filter((u) => !u.status || u.status === 'Active').map((u) => u.id));
  const paying = new Set(usd.flatMap((s) => s.assignedUserIds || []).filter((id) => activeIds.has(id)));

  return {
    monthlyTotal,
    yearlyTotal: round2(monthlyTotal * 12),
    payingUsers: paying.size,
    avgPerUser: paying.size ? round2(monthlyTotal / paying.size) : null,
    otherCurrencyCount: billed.length - usd.length,
  };
};

export const formatUsd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
