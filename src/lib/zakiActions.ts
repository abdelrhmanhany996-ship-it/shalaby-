import type { Booking, Lead, PurchaseLine } from "../types/crm";
import { cleanLines, describeLine, grandTotal, productsLabel } from "./purchaseLines";
import { phoneKey } from "./referrals";

/**
 * What Shalaby may do for the user: register a customer and record a sale. The model only PREPARES an action;
 * nothing is saved until the person confirms it (a button, or a plain "تمام" typed in the chat). The confirmation is
 * recognised here, in code, so a model can never confirm on its own behalf.
 */
export interface PendingAction {
  id: string;
  kind: "customer" | "sale";
  /** The existing customer a sale is for. */
  leadId?: string;
  /** The customer to register (alone, or together with the sale). */
  newCustomer?: { name: string; phone: string; notes?: string };
  customerName: string;
  lines: PurchaseLine[];
  total: number;
  note?: string;
  /** YYYY-MM-DD */
  date: string;
  /** Short lines shown to the person before they confirm. */
  summary: string[];
}

type Args = Record<string, unknown>;
export type Plan = { ok: true; action: PendingAction } | { ok: false; result: Record<string, unknown> };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const validPhone = (p: string) => phoneKey(p).length >= 10;
const brief = (l: Lead) => ({ id: l.id, name: l.name, phone: l.phone });

export type Resolved = { kind: "found"; lead: Lead } | { kind: "ambiguous"; leads: Lead[] } | { kind: "none" };

/** The customer the user means: by id, then phone, then name (a part of it is enough). */
export function resolveCustomer(leads: Lead[], query: { id?: string; name?: string; phone?: string }): Resolved {
  if (query.id) {
    const byId = leads.find((l) => l.id === query.id);
    if (byId) return { kind: "found", lead: byId };
  }
  if (query.phone && validPhone(query.phone)) {
    const key = phoneKey(query.phone);
    const byPhone = leads.filter((l) => phoneKey(l.phone) === key || (l.whatsappPhone && phoneKey(l.whatsappPhone) === key));
    if (byPhone.length === 1) return { kind: "found", lead: byPhone[0] };
    if (byPhone.length > 1) return { kind: "ambiguous", leads: byPhone };
  }
  const name = query.name ? norm(query.name) : "";
  if (name) {
    const exact = leads.filter((l) => norm(l.name) === name);
    if (exact.length === 1) return { kind: "found", lead: exact[0] };
    const part = exact.length ? exact : leads.filter((l) => norm(l.name).includes(name));
    if (part.length === 1) return { kind: "found", lead: part[0] };
    if (part.length > 1) return { kind: "ambiguous", leads: part.slice(0, 8) };
  }
  return { kind: "none" };
}

/** Items the model sent, cleaned: a name and a value are required, and a count without a price is not enough. */
export function parseItems(raw: unknown): { lines: PurchaseLine[]; problem?: string } {
  if (!Array.isArray(raw) || !raw.length) return { lines: [], problem: "مفيش أصناف. اسأل المستخدم باع إيه وبكام." };
  const lines: PurchaseLine[] = [];
  for (const r of raw.slice(0, 30)) {
    const o = (r ?? {}) as Args;
    const name = str(o.name, 120);
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);
    const price = n(o.price);
    const qty = n(o.qty);
    const total = n(o.total);
    if (!name) return { lines: [], problem: "في صنف من غير اسم. اسأل المستخدم." };
    if (!price && !total) return { lines: [], problem: `سعر «${name}» مش واضح. اسأل المستخدم بكام.` };
    lines.push({ name, ...(price ? { price } : {}), ...(qty ? { qty } : {}), total: total ?? (price! * (qty ?? 1)) });
  }
  const kept = cleanLines(lines);
  return kept.length ? { lines: kept } : { lines: [], problem: "مفيش أصناف صالحة." };
}

let counter = 0;
const newId = () => `act-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function planCustomer(args: Args, leads: Lead[]): Plan {
  const name = str(args.name, 120);
  const phone = str(args.phone, 30);
  if (!name) return { ok: false, result: { status: "need_info", missing: "اسم العميل" } };
  if (!phone || !validPhone(phone)) return { ok: false, result: { status: "need_info", missing: "رقم موبايل العميل (10 أرقام على الأقل)" } };
  const same = resolveCustomer(leads, { phone });
  if (same.kind === "found") return { ok: false, result: { status: "already_exists", customer: brief(same.lead), hint: "العميل ده متسجل. اعرض بياناته واسأل لو عاوز يسجل له عملية بيع." } };
  if (same.kind === "ambiguous") return { ok: false, result: { status: "already_exists", customers: same.leads.map(brief) } };
  const notes = str(args.notes, 500);
  const action: PendingAction = {
    id: newId(),
    kind: "customer",
    newCustomer: { name, phone, ...(notes ? { notes } : {}) },
    customerName: name,
    lines: [],
    total: 0,
    date: "",
    summary: [`تسجيل عميل جديد: ${name}`, `الموبايل: ${phone}`, ...(notes ? [`ملاحظة: ${notes}`] : [])],
  };
  return { ok: true, action };
}

export function planSale(args: Args, leads: Lead[], today: string): Plan {
  const items = parseItems(args.items);
  if (items.problem) return { ok: false, result: { status: "need_info", missing: items.problem } };
  const date = isDate(args.date) ? args.date : today;
  if (date > today) return { ok: false, result: { status: "invalid", problem: "تاريخ البيع في المستقبل." } };
  const wanted = { id: str(args.customer_id), name: str(args.customer), phone: str(args.phone, 30) };
  const found = resolveCustomer(leads, wanted);
  const note = str(args.note, 300);
  const total = grandTotal(items.lines);
  const base = { id: newId(), kind: "sale" as const, lines: items.lines, total, ...(note ? { note } : {}), date };
  const lineSummary = items.lines.map(describeLine);
  const tail = [`الإجمالي: ${money(total)} ج.م`, ...(date !== today ? [`التاريخ: ${date}`] : []), ...(note ? [`ملاحظة: ${note}`] : [])];

  if (found.kind === "ambiguous") return { ok: false, result: { status: "ambiguous_customer", customers: found.leads.map(brief), hint: "اسأل المستخدم يحدد مين فيهم." } };
  if (found.kind === "found") {
    const lead = found.lead;
    return { ok: true, action: { ...base, leadId: lead.id, customerName: lead.name, summary: [`تسجيل عملية بيع للعميل ${lead.name} (${lead.phone})`, ...lineSummary, ...tail] } };
  }
  // Not registered: a phone number lets the same confirmation register the customer first.
  const name = wanted.name;
  if (!name) return { ok: false, result: { status: "need_info", missing: "اسم العميل" } };
  if (!wanted.phone || !validPhone(wanted.phone))
    return { ok: false, result: { status: "customer_not_found", customer: name, hint: "العميل مش متسجل. اسأل المستخدم عن رقم موبايله عشان يتسجل كعميل جديد مع عملية البيع." } };
  return {
    ok: true,
    action: { ...base, newCustomer: { name, phone: wanted.phone }, customerName: name, summary: [`تسجيل عميل جديد: ${name} (${wanted.phone})`, "وتسجيل عملية بيع له:", ...lineSummary, ...tail] },
  };
}

/** The booking a confirmed sale becomes, for a customer that exists. */
export function bookingFor(lead: Lead, a: Pick<PendingAction, "lines" | "total" | "note" | "date">, agentId: string): Omit<Booking, "id" | "createdAt"> {
  return {
    leadId: lead.id,
    leadName: lead.name,
    leadPhone: lead.phone,
    branchId: lead.branchId,
    agentId,
    department: "general",
    courseId: "ps-general",
    courseName: productsLabel(a.lines),
    lines: a.lines,
    bookingDate: a.date,
    amount: a.total,
    departmentAmounts: { general: a.total },
    bookingStatus: "confirmed",
    source: lead.source,
    notes: [a.note, "سُجّلت عن طريق شلبي"].filter(Boolean).join(" · "),
  };
}

const YES = new Set(["تمام", "سجل", "سجلها", "سجله", "اه", "ايوه", "ايوة", "اوك", "اوكي", "ok", "okay", "yes", "y", "موافق", "كمل", "نفذ", "اكيد", "ماشي", "تمم", "سجلهم"]);
const STRONG_NO = new Set(["لا", "لأ", "لاا", "الغي", "الغيها", "الغاء", "الغ", "بلاش", "cancel", "no", "n", "لغي", "ماتسجلش", "متسجلش", "وقف", "خلاص", "مش"]);
const NO = new Set([...STRONG_NO, "عايز", "عاوز", "اسجل", "اسجلها"]);
const words = (t: string) => norm(t).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

/** A short message that only says "yes, register it" (or "no"). Anything longer goes to the model as a normal message. */
export function confirmation(text: string): "yes" | "no" | null {
  const w = words(text);
  if (!w.length || w.length > 4) return null;
  if (w.every((x) => YES.has(x))) return "yes";
  if (w.every((x) => NO.has(x)) && w.some((x) => STRONG_NO.has(x))) return "no";
  return null;
}
