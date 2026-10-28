import { useEffect, useRef, useState } from "react";
import { Check, Sparkles, X, ArrowUpLeft, RefreshCw } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { aiStatus, followUpSuggestion } from "../../lib/aiClient";
import { DEFAULT_SUGGESTIONS_PER_DAY } from "../../lib/license";
import { nearbyFollowUp, selectCandidates, suggestionBudget, suggestionStats } from "../../lib/aiSuggestions";
import { followUpTypeNames, today as todayStr } from "../../lib/presentation";
import type { AiSuggestion, FollowUp } from "../../types/crm";

const rejectReasons = ["مش فرصة حقيقية", "الوقت مش مناسب دلوقتي", "في متابعة موجودة فعلًا", "الاقتراح فهم غلط", "سبب تاني"];
const typeChoices: FollowUp["type"][] = ["call", "whatsapp", "branch_visit", "meeting"];

type Flow = { id: string; step: "ask" | "edit" | "reject" } | null;

/** Zaki's follow-up suggestions: each one can be read in full, edited, accepted or rejected, and every decision is counted. */
export function SuggestionsTab({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const crm = useCRM();
  const { effectiveUser, aiSuggestions, saveSuggestions, decideSuggestion, followUps, license, leads, visits, bookings, notBoughtRecords, reviewRequests, reviewNotes, timelineEvents, brokers } = crm;
  const today = todayStr();
  const perDay = license.suggestionsPerDay ?? DEFAULT_SUGGESTIONS_PER_DAY;
  const budget = suggestionBudget(aiSuggestions, effectiveUser.id, today, perDay);
  const mine = aiSuggestions.filter((s) => s.agentId === effectiveUser.id && s.status !== "checked");
  const pending = mine.filter((s) => s.status === "pending").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const decided = mine.filter((s) => s.status !== "pending").sort((a, b) => (b.decidedAt || "").localeCompare(a.decidedAt || ""));
  const month = suggestionStats(mine, new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));

  const [state, setState] = useState<"idle" | "running" | "off" | "error" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");
  const [flow, setFlow] = useState<Flow>(null);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState<FollowUp["type"]>("call");
  const [rejectWhy, setRejectWhy] = useState(rejectReasons[0]);
  const [toast, setToast] = useState("");
  const ran = useRef(false);

  const run = async () => {
    if (state === "running") return;
    setState("running");
    setMessage("");
    const cands = selectCandidates({ leads, visits, followUps, bookings, notBoughtRecords, reviewRequests, reviewNotes, timelineEvents, brokers, aiSuggestions }, effectiveUser.id, today);
    let left = budget.left;
    let checksLeft = budget.checksLeft;
    let made = 0;
    for (const [i, c] of cands.entries()) {
      if (left <= 0 || checksLeft <= 0) break;
      setProgress(`زكي بيراجع ${c.name} (${i + 1} من ${cands.length})…`);
      let r;
      try {
        r = await followUpSuggestion(c.bundle);
      } catch (e) {
        setState("error");
        setMessage(e instanceof Error ? e.message : "زكي مش متاح دلوقتي.");
        return;
      }
      checksLeft--;
      const base = { partyKind: c.partyKind, leadId: c.leadId, brokerId: c.brokerId, name: c.name, branchId: c.branchId, agentId: effectiveUser.id, agentName: effectiveUser.name, fingerprint: c.fingerprint, snapshot: c.snapshot };
      const party = { leadId: c.leadId, brokerId: c.brokerId };
      // Never suggest a second follow-up next to one the salesperson already scheduled.
      const worth = r.opportunity && r.date && r.reason && r.evidence && !nearbyFollowUp(followUps, party, r.date);
      if (worth) {
        saveSuggestions([{ ...base, status: "pending", proposedDate: r.date, reason: r.reason, evidence: r.evidence, source: r.source, confidence: r.confidence }]);
        left--;
        made++;
      } else saveSuggestions([{ ...base, status: "checked" }]);
    }
    setProgress("");
    setState("done");
    setMessage(made ? `زكي لقى ${made} فرصة جديدة.` : cands.length ? "زكي راجع البيانات ومفيش فرص جديدة دلوقتي." : "مفيش بيانات جديدة تستاهل المراجعة.");
  };

  // Opening the tab reviews the day's new data once, if the assistant is on.
  useEffect(() => {
    let alive = true;
    aiStatus().then((s) => {
      if (!alive) return;
      if (s !== "server") return setState("off");
      const key = `zk-sug-${effectiveUser.id}-${today}`;
      let seen = false;
      try {
        seen = !!sessionStorage.getItem(key);
        sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
      if (!ran.current && !seen && budget.left > 0) {
        ran.current = true;
        void run();
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(""), 6000);
  };
  const open = (s: AiSuggestion, step: "ask" | "edit" | "reject") => {
    setFlow({ id: s.id, step });
    setDate(s.proposedDate || "");
    setReason(s.reason || "");
    setType("call");
    setRejectWhy(rejectReasons[0]);
  };
  const accept = (s: AiSuggestion, edited: boolean) => {
    try {
      decideSuggestion(s.id, { accept: true, date: edited ? date : s.proposedDate!, reason: edited ? reason.trim() : s.reason!, type, edited: edited && (date !== s.proposedDate || reason.trim() !== s.reason || type !== "call") });
      setFlow(null);
      flash(`اتجدولت متابعة ${s.name} يوم ${edited ? date : s.proposedDate} وظهرت في المتابعات وفي سجل العميل.`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "تعذر الجدولة.");
    }
  };
  const reject = (s: AiSuggestion) => {
    try {
      decideSuggestion(s.id, { accept: false, reason: rejectWhy });
      setFlow(null);
      flash("تم الرفض، وزكي مش هيقترحها تاني على نفس الكلام.");
    } catch (e) {
      flash(e instanceof Error ? e.message : "تعذر الرفض.");
    }
  };

  const daysFrom = (d?: string) => (d ? Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86_400_000) : 0);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>
            <Sparkles size={18} style={{ display: "inline", marginInlineEnd: 6 }} />
            اقتراحات زكي
          </h2>
          <p>زكي بيقرا ملاحظات عملائك ووسطائك، ولو لقى فرصة ما اتجدولش لها متابعة (زي «هيبني فيلا كمان شهر») بيقترحها هنا. أنت اللي بتقرر.</p>
        </div>
        <button className="btn-secondary" onClick={() => void run()} disabled={state === "running" || state === "off" || budget.left <= 0}>
          <RefreshCw size={15} />
          دوّر على فرص جديدة
        </button>
      </div>
      <p className="table-secondary" style={{ padding: "0 22px" }}>
        النهارده: {budget.made} من {perDay} اقتراح · آخر 30 يوم: اتقبل {month.accepted} واتفضّ {month.rejected}
        {month.edited ? ` (منها ${month.edited} اتعدّلت قبل القبول)` : ""}
      </p>
      {state === "off" && <p className="notice warning">زكي مش مفعّل على السيرفر دلوقتي، فمش هيقدر يطلّع اقتراحات.</p>}
      {state === "running" && <p className="notice" role="status">{progress || "زكي بيراجع البيانات…"}</p>}
      {message && <p className={`notice${state === "error" ? " warning" : ""}`} role="status">{message}</p>}
      {toast && <p className="notice" role="status">{toast}</p>}

      {pending.length === 0 && state !== "running" && (
        <div className="empty-state">
          <Sparkles size={28} strokeWidth={1.3} />
          <h3>مفيش اقتراحات مستنية قرارك</h3>
          <p>لما زكي يلاقي فرصة في ملاحظات العملاء هتظهر هنا.</p>
        </div>
      )}

      {pending.map((s) => {
        const near = s.proposedDate ? nearbyFollowUp(followUps, { leadId: s.leadId, brokerId: s.brokerId }, s.proposedDate) : undefined;
        const lead = s.leadId ? leads.find((l) => l.id === s.leadId) : undefined;
        const active = flow?.id === s.id ? flow.step : null;
        return (
          <article className="suggestion-card" key={s.id}>
            <div className="followup-heading">
              <h2>{s.name}</h2>
              <span className="followup-pills">
                <span className="status-pill">{s.partyKind === "broker" ? "وسيط" : "عميل"}</span>
                <span className="status-pill is-warning">اقتراح زكي</span>
              </span>
            </div>
            <p>
              <strong>المتابعة المقترحة:</strong> يوم <bdi>{s.proposedDate}</bdi> ({daysFrom(s.proposedDate) > 0 ? `بعد ${daysFrom(s.proposedDate)} يوم` : "النهارده"})
            </p>
            <p>
              <strong>ليه؟</strong> {s.reason}
            </p>
            {s.evidence && (
              <blockquote className="suggestion-quote">
                «{s.evidence}»{s.source && <small> · {s.source}</small>}
              </blockquote>
            )}
            {near && <p className="notice warning">عندك متابعة مجدولة قريبة ({near.scheduledAt.slice(0, 10)}): {near.reason}. ممكن الاقتراح ده يتكرر معاها.</p>}
            <details>
              <summary>الداتا اللي زكي بنى عليها الاقتراح ({s.snapshot?.length ?? 0})</summary>
              <ul className="suggestion-data">{(s.snapshot ?? []).map((l, i) => <li key={i}>{l}</li>)}</ul>
              {lead && (
                <button className="btn-text" onClick={() => onOpenLead(lead.id)}>
                  تحب أظهرلك تفاصيل العميل؟ افتح الملف <ArrowUpLeft size={13} />
                </button>
              )}
            </details>

            {!active && (
              <div className="followup-actions">
                <button className="btn-primary btn-buy" onClick={() => open(s, "ask")}>
                  <Check size={15} /> قبول
                </button>
                <button className="btn-secondary" onClick={() => open(s, "edit")}>
                  عدّل التفاصيل
                </button>
                <button className="btn-secondary" onClick={() => open(s, "reject")}>
                  <X size={15} /> رفض
                </button>
              </div>
            )}
            {active === "ask" && (
              <div className="suggestion-step" role="group" aria-label="تأكيد القبول">
                <strong>حابب تعدّل حاجة في الموعد أو التفاصيل؟</strong>
                <div className="followup-actions">
                  <button className="btn-primary btn-buy" onClick={() => accept(s, false)}>
                    لأ، اجدولها كده
                  </button>
                  <button className="btn-secondary" onClick={() => setFlow({ id: s.id, step: "edit" })}>
                    أيوه، عدّل
                  </button>
                  <button className="btn-text" onClick={() => setFlow(null)}>
                    رجوع
                  </button>
                </div>
              </div>
            )}
            {active === "edit" && (
              <div className="suggestion-step">
                <div className="field-grid">
                  <label className="field">
                    <span>موعد المتابعة</span>
                    <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>نوع المتابعة</span>
                    <select value={type} onChange={(e) => setType(e.target.value as FollowUp["type"])}>
                      {typeChoices.map((t) => (
                        <option key={t} value={t}>
                          {followUpTypeNames[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>سبب المتابعة</span>
                  <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                <div className="followup-actions">
                  <button className="btn-primary btn-buy" disabled={!date || date < today || !reason.trim()} onClick={() => accept(s, true)}>
                    اقبل واجدول
                  </button>
                  <button className="btn-text" onClick={() => setFlow(null)}>
                    إلغاء
                  </button>
                </div>
              </div>
            )}
            {active === "reject" && (
              <div className="suggestion-step">
                <label className="field">
                  <span>ليه رفضته؟ (بيساعدنا نحسّن الاقتراحات)</span>
                  <select value={rejectWhy} onChange={(e) => setRejectWhy(e.target.value)}>
                    {rejectReasons.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <div className="followup-actions">
                  <button className="btn-primary" onClick={() => reject(s)}>
                    تأكيد الرفض
                  </button>
                  <button className="btn-text" onClick={() => setFlow(null)}>
                    رجوع
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}

      {decided.length > 0 && (
        <details className="suggestion-history">
          <summary>آخر قراراتك ({decided.length})</summary>
          <ul>
            {decided.slice(0, 15).map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong>: {s.status === "accepted" ? `اتقبل ← متابعة يوم ${s.finalDate}${s.edited ? " (بعد تعديلك)" : ""}` : `اتفضّ${s.rejectReason ? ` (${s.rejectReason})` : ""}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
