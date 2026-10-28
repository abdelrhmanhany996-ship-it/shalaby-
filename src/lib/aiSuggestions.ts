import type { AiSuggestion, BrokerEntity, FollowUp, Lead, Visit } from "../types/crm";
import { buildCustomerBrief, type BriefInput } from "./customerBrief";
import { followUpStatus } from "./presentation";
import { reviewsText } from "./aiSuggestionsText";

export const MAX_CHECKS_PER_DAY = 25;
export const RECENT_DAYS = 60;
/** A follow-up this close to a suggested day already covers it. */
export const NEARBY_FOLLOWUP_DAYS = 10;
const MIN_TEXT = 12;
const DAY = 86_400_000;

export interface SuggestionData extends Omit<BriefInput, "lead"> {
  leads: Lead[];
  brokers: BrokerEntity[];
  aiSuggestions: AiSuggestion[];
}

export interface Candidate {
  partyKind: "client" | "broker";
  leadId?: string;
  brokerId?: string;
  name: string;
  branchId: string;
  /** What is sent to the assistant. */
  bundle: Record<string, unknown>;
  /** The same facts as plain lines for the salesperson. */
  snapshot: string[];
  fingerprint: string;
  lastTextAt: string;
}

interface DatedText {
  date: string;
  from: string;
  text: string;
}

const day = (s?: string) => (s || "").slice(0, 10);
const generic = /^(زيارة للفرع|زيارة وسيط|مسجل تلقائ|رشّحه العميل|مسجّل تلقائ)/;

export function hashOf(parts: string[]): string {
  let h = 0;
  for (const ch of parts.join("|")) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `fp-${(h >>> 0).toString(36)}`;
}

/** Only free text from the last two months counts as a sign worth reading. */
function usable(texts: DatedText[], today: string): DatedText[] {
  const since = new Date(new Date(today).getTime() - RECENT_DAYS * DAY).toISOString().slice(0, 10);
  return texts
    .map((t) => ({ ...t, text: t.text.trim() }))
    .filter((t) => t.text.length >= MIN_TEXT && !generic.test(t.text) && t.date >= since)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function leadTexts(lead: Lead, d: Omit<SuggestionData, "leads" | "brokers" | "aiSuggestions">): DatedText[] {
  const out: DatedText[] = [];
  if (lead.notes) out.push({ date: day(lead.createdAt), from: "ملاحظة على العميل", text: lead.notes });
  for (const v of d.visits.filter((x) => x.linkedLeadId === lead.id)) {
    if (v.notes) out.push({ date: v.date, from: "زيارة", text: v.notes });
    if (v.reason) out.push({ date: v.date, from: "سبب الزيارة", text: v.reason });
  }
  for (const f of d.followUps.filter((x) => x.leadId === lead.id)) {
    if (f.outcomeResult) out.push({ date: day(f.completedAt || f.scheduledAt), from: "نتيجة متابعة", text: f.outcomeResult });
    if (f.notes) out.push({ date: day(f.scheduledAt), from: "ملاحظة متابعة", text: f.notes });
  }
  for (const n of d.notBoughtRecords.filter((x) => x.leadId === lead.id)) {
    if (n.note) out.push({ date: day(n.createdAt), from: "سبب «لسه»", text: n.note });
    if (n.otherText) out.push({ date: day(n.createdAt), from: "سبب «لسه»", text: n.otherText });
  }
  for (const e of d.timelineEvents.filter((x) => x.leadId === lead.id && x.type === "note")) out.push({ date: day(e.timestamp), from: "ملاحظة", text: e.details || e.title });
  out.push(...reviewsText(lead.id, d.reviewRequests));
  return out;
}

function brokerTexts(broker: BrokerEntity, visits: Visit[], today: string): DatedText[] {
  const out: DatedText[] = [];
  for (const v of visits.filter((x) => x.brokerId === broker.id)) {
    if (v.notes) out.push({ date: v.date, from: "زيارة الوسيط", text: v.notes });
    if (v.reason) out.push({ date: v.date, from: "سبب الزيارة", text: v.reason });
  }
  if (broker.notes && out.length) out.push({ date: out[0].date, from: "ملاحظة على الوسيط", text: broker.notes });
  return out.length ? out : broker.notes ? [{ date: today, from: "ملاحظة على الوسيط", text: broker.notes }] : [];
}

const openOf = (list: FollowUp[]) => list.filter((f) => !["completed", "cancelled"].includes(followUpStatus(f)));

/** Customers and brokers of this salesperson with a recent written sign of a future need and nothing already scheduled for them. */
export function selectCandidates(d: SuggestionData, userId: string, today: string, limit = MAX_CHECKS_PER_DAY): Candidate[] {
  const seen = new Set(d.aiSuggestions.map((s) => s.fingerprint));
  const out: Candidate[] = [];

  for (const lead of d.leads) {
    if (lead.assignedAgentId !== userId || lead.status === "not_interested") continue;
    if (openOf(d.followUps.filter((f) => f.leadId === lead.id)).length) continue;
    if (d.aiSuggestions.some((s) => s.status === "pending" && s.leadId === lead.id)) continue;
    const texts = usable(leadTexts(lead, d), today);
    if (!texts.length) continue;
    const fingerprint = hashOf([lead.id, ...texts.map((t) => t.text)]);
    if (seen.has(fingerprint)) continue;
    const brief = buildCustomerBrief({ ...d, lead });
    out.push({
      partyKind: "client",
      leadId: lead.id,
      name: lead.name,
      branchId: lead.branchId,
      bundle: { kind: "عميل", ...brief, today, writtenNotes: texts.slice(0, 10).map((t) => ({ date: t.date, from: t.from, text: t.text.slice(0, 400) })) },
      snapshot: texts.slice(0, 12).map((t) => `${t.date} · ${t.from}: ${t.text.slice(0, 160)}`),
      fingerprint,
      lastTextAt: texts[0].date,
    });
  }

  for (const broker of d.brokers) {
    const mine = d.visits.filter((v) => v.brokerId === broker.id && v.receivedByAgentId === userId);
    if (!mine.length || !broker.active) continue;
    if (openOf(d.followUps.filter((f) => f.brokerId === broker.id)).length) continue;
    if (d.aiSuggestions.some((s) => s.status === "pending" && s.brokerId === broker.id)) continue;
    const texts = usable(brokerTexts(broker, mine, today), today);
    if (!texts.length) continue;
    const fingerprint = hashOf([broker.id, ...texts.map((t) => t.text)]);
    if (seen.has(fingerprint)) continue;
    out.push({
      partyKind: "broker",
      brokerId: broker.id,
      name: broker.name,
      branchId: mine[0].branchId,
      bundle: {
        kind: "وسيط",
        today,
        broker: { name: broker.name, type: broker.type, customersBrought: d.leads.filter((l) => l.brokerId === broker.id).slice(0, 10).map((l) => l.name) },
        visits: mine.slice(0, 6).map((v) => ({ date: v.date, reason: v.reason, notes: v.notes?.slice(0, 200) ?? null, outcome: v.outcome })),
        followUps: d.followUps.filter((f) => f.brokerId === broker.id).slice(0, 5).map((f) => ({ due: day(f.scheduledAt), status: followUpStatus(f), reason: f.reason })),
        writtenNotes: texts.slice(0, 10).map((t) => ({ date: t.date, from: t.from, text: t.text.slice(0, 400) })),
      },
      snapshot: texts.slice(0, 12).map((t) => `${t.date} · ${t.from}: ${t.text.slice(0, 160)}`),
      fingerprint,
      lastTextAt: texts[0].date,
    });
  }
  return out.sort((a, b) => b.lastTextAt.localeCompare(a.lastTextAt)).slice(0, limit);
}

export interface SuggestionBudget {
  made: number;
  left: number;
  checks: number;
  checksLeft: number;
}

/** How many suggestions this person already got today, and how many more the day allows. */
export function suggestionBudget(list: AiSuggestion[], userId: string, today: string, perDay: number): SuggestionBudget {
  const mine = list.filter((s) => s.agentId === userId && s.dayKey === today);
  const made = mine.filter((s) => s.status !== "checked").length;
  return { made, left: Math.max(0, perDay - made), checks: mine.length, checksLeft: Math.max(0, MAX_CHECKS_PER_DAY - mine.length) };
}

/** A follow-up for the same customer or broker close to the suggested day: it would double up. */
export function nearbyFollowUp(followUps: FollowUp[], party: { leadId?: string; brokerId?: string }, date: string, windowDays = NEARBY_FOLLOWUP_DAYS): FollowUp | undefined {
  const t = new Date(date).getTime();
  return openOf(followUps).find(
    (f) => (party.leadId ? f.leadId === party.leadId : f.brokerId === party.brokerId) && Math.abs(new Date(day(f.scheduledAt)).getTime() - t) <= windowDays * DAY,
  );
}

export interface SuggestionStats {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  edited: number;
}

export function suggestionStats(list: AiSuggestion[], from?: string, to?: string): SuggestionStats {
  const real = list.filter((s) => s.status !== "checked" && (!from || s.dayKey >= from) && (!to || s.dayKey <= to));
  return {
    total: real.length,
    accepted: real.filter((s) => s.status === "accepted").length,
    rejected: real.filter((s) => s.status === "rejected").length,
    pending: real.filter((s) => s.status === "pending").length,
    edited: real.filter((s) => s.status === "accepted" && s.edited).length,
  };
}
