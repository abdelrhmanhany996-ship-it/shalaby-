import type { FollowUp, PurchaseLine, Quote, QuoteStatus } from "../types/crm";
import { cleanLines, grandTotal } from "./purchaseLines";
import { addToDate } from "./postSale";

/** A quote that was sent and got no follow-up from its owner is followed up this many days later. */
export const QUOTE_FOLLOWUP_DAYS = 3;

export const quoteStatusNames: Record<QuoteStatus, string> = { draft: "مسودة", sent: "اتبعت", accepted: "اتقبل", lost: "ما اتقبلش" };

export const defaultTerms = [
  "السعر غير شامل ضريبة القيمة المضافة",
  "السعر المحدد ساري 15 يوم",
  "البضاعة حاضرة",
  "التسليم من مخازن الشركة بالقاهرة",
  "الدفع عن الاستلام او تحويل قبل الاستلام",
];

/** What a printed quote shows in its header. Change it here when the company details change. */
export const quoteCompany = {
  name: "ريس تك",
  nameEn: "Rees Tech",
  tagline: "POWER FOR EVER",
  address: "6 October city, 2nd District, Central axis, October Plaza, Building no.1, 3rd floor",
  phones: ["+2 011 201 78 395", "+2 010 200 46 193", "+2 011 164 95 066"],
  title: "بيان بيع",
  intro: "تتشرف شركة ريس تك بتقديم بيان بيع لمنتجاتنا",
};

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Q-YYMMDD-NN: the next free number for that day. */
export function nextQuoteNumber(date: string, existing: string[]): string {
  const prefix = `Q-${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}-`;
  const used = existing.filter((n) => n.startsWith(prefix)).map((n) => Number(n.slice(prefix.length))).filter(Number.isFinite);
  return `${prefix}${pad(Math.max(0, ...used) + 1)}`;
}

/** The lines worth keeping and their total. */
export function priceLines(lines: PurchaseLine[]): { lines: PurchaseLine[]; total: number } {
  const kept = cleanLines(lines);
  return { lines: kept, total: grandTotal(kept) };
}

/** Why a quote cannot be saved yet, or "" when it is fine. */
export function quoteError(q: Pick<Quote, "leadId" | "lines">): string {
  if (!q.leadId) return "اختار العميل.";
  const { lines, total } = priceLines(q.lines);
  if (!lines.length) return "ضيف صنف واحد على الأقل.";
  if (lines.some((l) => !l.name)) return "كل صنف لازم يكون له اسم.";
  if (!(total > 0)) return "الإجمالي لازم يكون أكبر من صفر.";
  return "";
}

const open = (f: FollowUp) => f.status !== "completed" && f.status !== "cancelled";

/**
 * The date of the follow-up a sent quote gets by default, or null when its owner already has an open follow-up for that
 * customer (they scheduled their own, so the system adds nothing).
 */
export function quoteFollowUpDate(quote: Pick<Quote, "leadId" | "agentId">, today: string, followUps: FollowUp[]): string | null {
  const mine = followUps.some((f) => open(f) && f.leadId === quote.leadId && f.assignedAgentId === quote.agentId);
  return mine ? null : addToDate(today, { days: QUOTE_FOLLOWUP_DAYS });
}

export const quoteFollowUpReason = (q: Pick<Quote, "number">) => `متابعة عرض السعر ${q.number}: العميل شاف العرض؟ في أي تعديل مطلوب؟`;

/** Last day the quote's prices stand, from its "valid N days" note when it has one. */
export function validUntil(q: Pick<Quote, "date" | "terms">): string | null {
  const m = q.terms.map((t) => /ساري\s+(\d{1,3})\s*يوم/.exec(t)).find(Boolean);
  return m ? addToDate(q.date, { days: Number(m[1]) }) : null;
}
