import { auth } from "./firebase";

const ENDPOINT = "/api/ai.php";

export type AiStatus = "unknown" | "server" | "none";
let cached: AiStatus = "unknown";

async function authHeader(): Promise<Record<string, string>> {
  try {
    const token = await auth.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** Whether the server-side speech/AI helper (api/ai.php) is configured. */
export async function aiStatus(): Promise<AiStatus> {
  if (cached !== "unknown") return cached;
  try {
    const res = await fetch(`${ENDPOINT}?ping=1`, { cache: "no-store" });
    const data = await res.json();
    cached = data?.configured ? "server" : "none";
  } catch {
    cached = "none";
  }
  return cached;
}

async function call(init: RequestInit): Promise<any> {
  const res = await fetch(ENDPOINT, {
    ...init,
    headers: { ...(init.headers || {}), ...(await authHeader()) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && data?.error === "rate_limited") {
    throw new Error(data?.detail === "day" ? "وصلت للحد اليومي لطلبات الذكاء الاصطناعي، جرّب بكرة." : "طلبات كتير في وقت قصير، جرّب بعد شوية.");
  }
  if (!res.ok) throw new Error([data?.error || `HTTP ${res.status}`, data?.detail].filter(Boolean).join(": "));
  return data;
}

/** Egyptian-Arabic speech to text. */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("mode", "transcribe");
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  form.append("audio", blob, `note.${ext}`);
  const data = await call({ method: "POST", body: form });
  return String(data.text || "").trim();
}

/** Cleans up a note without adding information, and suggests a not-bought reason if clear. */
export async function refineText(
  text: string,
  reasons: { id: string; label: string }[] = [],
): Promise<{ text: string; reasonId: string | null }> {
  const data = await call({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "refine", text, reasons }),
  });
  return { text: String(data.text || text), reasonId: data.reasonId || null };
}

import type { ReviewAnalysis } from "../types/crm";

/** Is a customer's review a complaint, a remark or praise? Called only for reviews that have a comment. */
export async function classifyReview(rating: number, comment: string): Promise<ReviewAnalysis> {
  const data = await call({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "classify", rating, comment }),
  });
  return {
    kind: data.kind,
    category: data.category || undefined,
    severity: data.severity,
    summary: data.summary || undefined,
  };
}

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  used?: string[]; // tools Zaki looked at (display only)
}

type Content = { role: "user" | "model"; parts: Record<string, unknown>[] };
const MAX_STEPS = 6;

/**
 * Zaki as an agent. The server runs the language model; whenever the model wants
 * data it answers with tool calls. Those run HERE, in the browser, against the
 * user's own live and role-scoped data, and the results go back for the next step.
 * Nothing is sent that the model did not ask for.
 */
export async function runZaki(opts: {
  question: string;
  history: ChatTurn[];
  tools: unknown[];
  guide: string;
  today: string;
  viewer: string;
  execute: (name: string, args: Record<string, unknown>) => unknown;
  onStep?: (toolName: string) => void;
}): Promise<{ answer: string; used: string[] }> {
  const contents: Content[] = [
    ...opts.history.slice(-8).map((t): Content => ({ role: t.role === "user" ? "user" : "model", parts: [{ text: t.text }] })),
    { role: "user", parts: [{ text: opts.question }] },
  ];
  const used: string[] = [];
  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await call({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "agent", contents, tools: opts.tools, guide: opts.guide, today: opts.today, viewer: opts.viewer }),
    });
    contents.push(res.modelContent);
    if (res.type === "final") return { answer: String(res.text || "").trim(), used };
    const responses = (res.calls as { name: string; args: Record<string, unknown> }[]).map((c) => {
      opts.onStep?.(c.name);
      used.push(c.name);
      let result: unknown;
      try {
        result = opts.execute(c.name, c.args || {});
      } catch {
        result = { error: "تعذر تنفيذ الأداة" };
      }
      return { functionResponse: { name: c.name, response: { result } } };
    });
    contents.push({ role: "user", parts: responses });
  }
  return { answer: "السؤال محتاج تدوير أكتر من اللي أقدر أعمله مرة واحدة. جرّب تقسمه لأسئلة أصغر.", used };
}

export interface WeeklyReport {
  headline: string;
  improved: { title: string; detail: string }[];
  dropped: { title: string; why: string }[];
  next_week: { action: string; reason: string }[];
  /** Added in the second version of the report; older cached reports lack them. */
  team?: { name: string; verdict: string; detail: string }[];
  lost?: { customer: string; responsible: string; why: string }[];
  complaints?: { headline: string; items: { customer: string; state: string; detail: string }[] };
}

export async function weeklySummary(snapshot: unknown): Promise<WeeklyReport> {
  return call({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "weekly", snapshot }),
  });
}

export interface CustomerBriefResult {
  last_update: string;
  summary: string;
  suggestion: string;
  watch_out: string;
  tone: "hot" | "warm" | "cold" | "at_risk";
}

/** A quick brief on one customer: the last update, the picture, and how to deal with them now. */
export async function customerBrief(customer: unknown): Promise<CustomerBriefResult> {
  return call({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "brief", customer }),
  });
}

export interface FollowUpSuggestionResult {
  opportunity: boolean;
  date?: string;
  reason?: string;
  evidence?: string;
  source?: string;
  confidence?: number;
}

/** Asks the assistant whether this customer or broker deserves a follow-up nobody scheduled. */
export async function followUpSuggestion(candidate: unknown): Promise<FollowUpSuggestionResult> {
  return call({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "suggest", candidate }) });
}
