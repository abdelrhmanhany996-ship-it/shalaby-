import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, RefreshCw, Copy, MessageCircle, Check } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { aiStatus, dailyPlan, type DailyPlan as Plan } from "../../lib/aiClient";
import { buildCoachSnapshot, snapshotFingerprint } from "../../lib/coach";
import { hasPermission } from "../../lib/permissions";
import type { User } from "../../types/crm";
import { phoneNumber, today } from "../../lib/presentation";

interface Cached {
  plan: Plan;
  fp: string;
  at: number;
}
// Kept in memory only: a plan holds customer names, and customer data is never written to the browser's disk.
const cache = new Map<string, Cached>();
const AUTO_REFRESH_AFTER_MS = 30 * 60_000;
const CHECK_EVERY_MS = 5 * 60_000;

const hhmm = (t: number) => new Date(t).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });

const canSeeTargetsFor = (u: User) => hasPermission(u, "targets.view");

/** Today's prioritized follow-ups and target gaps from Zaki, built only from data the signed-in user may already see. */
export function DailyPlan({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const { effectiveUser, followUps, leads, bookings, notBoughtRecords, users: staffList, targetUsers, employeeTargets, targetSettings } = useCRM();
  // People targets can be about (their branch), which a branch manager has even without the staff directory.
  const users = canSeeTargetsFor(effectiveUser) ? targetUsers : staffList;
  const canSeeTargets = hasPermission(effectiveUser, "targets.view");
  const canContact = hasPermission(effectiveUser, "customers.contact");
  const snapshot = useMemo(
    () => buildCoachSnapshot({ user: effectiveUser, today: today(), followUps, leads, bookings, notBoughtRecords, users, targets: employeeTargets, targetSettings, canSeeTargets }),
    [effectiveUser, followUps, leads, bookings, notBoughtRecords, users, employeeTargets, targetSettings, canSeeTargets],
  );
  const fp = snapshotFingerprint(snapshot);
  const hasMaterial = snapshot.candidates.length > 0 || !!snapshot.team?.length;

  const [state, setState] = useState<"checking" | "off" | "idle" | "loading" | "error">("checking");
  const [error, setError] = useState("");
  const [shown, setShown] = useState<Cached | null>(cache.get(effectiveUser.id) ?? null);
  const [copied, setCopied] = useState("");
  const latest = useRef({ snapshot, fp });
  latest.current = { snapshot, fp };
  const busy = useRef(false);

  const generate = async () => {
    if (busy.current) return;
    busy.current = true;
    setState("loading");
    setError("");
    const { snapshot: snap, fp: forFp } = latest.current;
    try {
      const raw = await dailyPlan(snap);
      // never trust the shape of a reply: a broken answer must not take the page down
      const plan: Plan = {
        headline: typeof raw?.headline === "string" ? raw.headline : "",
        items: Array.isArray(raw?.items) ? raw.items.filter((x) => x && typeof x.leadId === "string").map((x) => ({ ...x, replies: Array.isArray(x.replies) ? x.replies : [] })) : [],
        team: Array.isArray(raw?.team) ? raw.team.filter((x) => x && typeof x.name === "string") : [],
        limits: typeof raw?.limits === "string" ? raw.limits : "",
      };
      const entry = { plan, fp: forFp, at: Date.now() };
      cache.set(effectiveUser.id, entry);
      setShown(entry);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تجهيز الخطة.");
      setState("error");
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    let alive = true;
    aiStatus().then((s) => {
      if (!alive) return;
      if (s !== "server") return setState("off");
      setState("idle");
      const c = cache.get(effectiveUser.id);
      if (!c && latest.current.snapshot.candidates.length + (latest.current.snapshot.team?.length ?? 0) > 0) generate();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUser.id]);

  // While this tab is open: refresh when the data changed and the plan is at least half an hour old.
  useEffect(() => {
    const id = window.setInterval(() => {
      const c = cache.get(effectiveUser.id);
      if (c && c.fp !== latest.current.fp && Date.now() - c.at > AUTO_REFRESH_AFTER_MS) generate();
    }, CHECK_EVERY_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUser.id]);

  const stale = !!shown && shown.fp !== fp;
  const leadName = (id: string) => leads.find((l) => l.id === id)?.name ?? "";
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 2500);
    } catch {
      /* clipboard may be blocked; the text stays selectable on screen */
    }
  };

  if (state === "off")
    return (
      <section className="panel">
        <div className="empty-state">
          <Sparkles size={28} strokeWidth={1.3} />
          <h3>خطة شلبي مش متفعّلة</h3>
          <p>محتاجة مفتاح Claude على السيرفر. التفاصيل في ملف docs/ai-setup.md.</p>
        </div>
      </section>
    );

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>خطة شلبي النهارده</h2>
          <p>
            {shown
              ? `اتجهزت الساعة ${hhmm(shown.at)} من بيانات نطاقك. بتتحدّث لما تدوس تحديث، وكمان تلقائيًا طول ما الصفحة دي مفتوحة لو البيانات اتغيرت.`
              : "أهم متابعات تبدأ بيها وليه، من بيانات نطاقك بس."}
          </p>
        </div>
        <button className="btn-secondary" onClick={generate} disabled={state === "loading" || state === "checking" || !hasMaterial}>
          <RefreshCw size={15} className={state === "loading" ? "spin" : undefined} />
          {state === "loading" ? "بجهّز…" : "حدّث الخطة"}
        </button>
      </div>
      {stale && state !== "loading" && (
        <p className="notice" role="status" style={{ margin: "0 16px 12px" }}>
          البيانات اتغيرت من وقت ما الخطة اتجهزت. دوس «حدّث الخطة» لو عايز توصيات على آخر وضع.
        </p>
      )}
      {state === "error" && (
        <p className="notice warning" role="alert" style={{ margin: "0 16px 12px" }}>
          {error}
        </p>
      )}
      {snapshot.dataNotes.length > 0 && (
        <ul className="quiet-note" style={{ margin: "0 20px 12px", paddingInlineStart: 18 }}>
          {snapshot.dataNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {!hasMaterial && state !== "loading" && (
        <div className="empty-state">
          <Check size={28} strokeWidth={1.3} />
          <h3>مفيش حاجة محتاجة تحرّك دلوقتي</h3>
          <p>مفيش متابعات مفتوحة ولا عملاء مهملين داخل نطاقك.</p>
        </div>
      )}
      {shown && (
        <div style={{ padding: "0 16px 16px" }}>
          {shown.plan.headline && <p style={{ fontWeight: 600, marginBottom: 12 }}>{shown.plan.headline}</p>}
          {shown.plan.items.map((it) => {
            const lead = leads.find((l) => l.id === it.leadId);
            const mine = lead?.assignedAgentId === effectiveUser.id;
            const key = `${it.leadId}`;
            return (
              <article className="followup-card" key={key} style={{ borderRadius: 10, border: "1px solid var(--line)", marginBottom: 10 }}>
                <div className="followup-heading">
                  <button onClick={() => onOpenLead(it.leadId)}>
                    <h2>
                      {it.priority}. {leadName(it.leadId) || "عميل"}
                    </h2>
                  </button>
                  <span className="status-pill is-warning">أولوية {it.priority}</span>
                </div>
                <p>
                  <strong>ليه دلوقتي:</strong> {it.why}
                </p>
                <p>
                  <strong>الدليل من البيانات:</strong> {it.evidence}
                </p>
                {it.action && (
                  <p>
                    <strong>الخطوة:</strong> {it.action}
                  </p>
                )}
                {it.message && (
                  <div style={{ marginTop: 10, padding: 12, background: "var(--surface-soft)", borderRadius: 8 }}>
                    <p style={{ margin: 0, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{it.message}</p>
                    <div className="followup-actions" style={{ marginTop: 10 }}>
                      <button className="btn-secondary" onClick={() => copy(key, it.message)}>
                        <Copy size={14} />
                        {copied === key ? "اتنسخت" : "انسخ الرسالة"}
                      </button>
                      {mine && canContact && lead && (
                        <a className="btn-secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${phoneNumber(lead.whatsappPhone || lead.phone)}?text=${encodeURIComponent(it.message)}`}>
                          <MessageCircle size={14} />
                          افتح واتساب
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {it.replies.length > 0 && (
                  <ul style={{ margin: "10px 0 0", paddingInlineStart: 18, fontSize: 12, color: "var(--muted)" }}>
                    {it.replies.map((r, i) => (
                      <li key={i}>
                        {r.if && <strong>{r.if}: </strong>}
                        {r.say}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
          {shown.plan.team.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, margin: "18px 0 8px" }}>الفريق: مين محتاج متابعة</h3>
              {shown.plan.team.map((t) => (
                <article className="followup-card" key={t.name} style={{ borderRadius: 10, border: "1px solid var(--line)", marginBottom: 10 }}>
                  <div className="followup-heading">
                    <h2>{t.name}</h2>
                  </div>
                  <p>
                    <strong>المشكلة:</strong> {t.issue}
                  </p>
                  {t.evidence && (
                    <p>
                      <strong>الدليل:</strong> {t.evidence}
                    </p>
                  )}
                  {t.possible_cause && (
                    <p>
                      <strong>سبب محتمل (تفسير مش حقيقة مؤكدة):</strong> {t.possible_cause}
                    </p>
                  )}
                  {t.suggestion && (
                    <p>
                      <strong>اقتراح:</strong> {t.suggestion}
                    </p>
                  )}
                </article>
              ))}
            </>
          )}
          {shown.plan.limits && (
            <p className="quiet-note" style={{ marginTop: 8 }}>
              حدود البيانات: {shown.plan.limits}
            </p>
          )}
          <p className="quiet-note" style={{ marginTop: 8 }}>
            توصيات شلبي مبنية على بيانات النظام بس، ومحتاجة حكمك قبل التنفيذ.
          </p>
        </div>
      )}
    </section>
  );
}
