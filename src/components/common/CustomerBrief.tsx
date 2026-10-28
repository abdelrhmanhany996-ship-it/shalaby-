import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { aiStatus, customerBrief, type CustomerBriefResult } from "../../lib/aiClient";
import { briefVersion, buildCustomerBrief } from "../../lib/customerBrief";
import type { Lead } from "../../types/crm";

const toneLabel: Record<CustomerBriefResult["tone"], string> = {
  hot: "جاهز للشراء",
  warm: "مهتم",
  cold: "بارد",
  at_risk: "محتاج انتباه",
};

const key = (leadId: string, version: string) => `crm_brief_${leadId}_${version}`;

/**
 * "Zaki's brief": the last update on this customer and how to deal with them now.
 * Saved for the current state of the customer, so opening the file again costs nothing until something new is recorded.
 */
export function CustomerBrief({ lead, compact = false }: { lead: Lead; compact?: boolean }) {
  const { visits, followUps, bookings, notBoughtRecords, reviewRequests, reviewNotes, timelineEvents } = useCRM();
  const input = { lead, visits, followUps, bookings, notBoughtRecords, reviewRequests, reviewNotes, timelineEvents };
  const version = useMemo(() => briefVersion(input), [lead, visits, followUps, bookings, notBoughtRecords, reviewRequests, reviewNotes, timelineEvents]);
  const [brief, setBrief] = useState<CustomerBriefResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error" | "off">("idle");

  const run = async () => {
    setState("loading");
    try {
      const r = await customerBrief(buildCustomerBrief(input));
      setBrief(r);
      try {
        sessionStorage.setItem(key(lead.id, version), JSON.stringify(r));
      } catch {
        /* ignore */
      }
      setState("idle");
    } catch {
      setState("error");
    }
  };

  // Opening a customer shows the brief straight away: the saved one if nothing changed, otherwise a fresh one.
  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    setBrief(null);
    setState("idle");
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(key(lead.id, version));
    } catch {
      /* ignore */
    }
    if (saved) {
      try {
        setBrief(JSON.parse(saved));
      } catch {
        /* ignore */
      }
      return;
    }
    aiStatus().then((s) => {
      if (!alive) return;
      if (s !== "server") return setState("off");
      // A short pause so flicking through customers does not fire a request for each one.
      timer = window.setTimeout(() => alive && run(), 600);
    });
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, version]);

  if (state === "off") return null;

  return (
    <section className={`brief-card${brief ? ` tone-${brief.tone}` : ""}${compact ? " is-compact" : ""}`} aria-label="ملخص زكي عن العميل">
      <div className="brief-head">
        <strong>
          <Sparkles size={15} /> ملخص زكي
        </strong>
        {brief && <span className="status-pill brief-tone">{toneLabel[brief.tone]}</span>}
        <button className="btn-secondary" onClick={run} disabled={state === "loading"}>
          {state === "loading" ? <Loader2 size={14} className="spin" /> : brief ? <RefreshCw size={14} /> : <Sparkles size={14} />}
          {brief ? "تحديث" : state === "loading" ? "بجهّز الملخص…" : "جهّز لي ملخص سريع"}
        </button>
      </div>
      {state === "error" && <p className="notice warning">تعذر تجهيز الملخص دلوقتي، جرّب تاني بعد شوية.</p>}
      {!brief && state === "loading" && <p className="quiet-note" style={{ padding: 0 }}>زكي بيراجع بيانات العميل…</p>}
      {brief && (
        <dl className="brief-body">
          {brief.last_update && (
            <div>
              <dt>آخر تحديث</dt>
              <dd>{brief.last_update}</dd>
            </div>
          )}
          {brief.summary && !compact && (
            <div>
              <dt>الصورة</dt>
              <dd>{brief.summary}</dd>
            </div>
          )}
          {brief.suggestion && (
            <div className="brief-next">
              <dt>إزاي تتعامل معاه</dt>
              <dd>{brief.suggestion}</dd>
            </div>
          )}
          {brief.watch_out && (
            <div className="brief-watch">
              <dt>خد بالك</dt>
              <dd>{brief.watch_out}</dd>
            </div>
          )}
        </dl>
      )}
      {brief && <small className="table-secondary">مبني على بيانات العميل الحالية في النظام، ومش بديل عن حكمك.</small>}
    </section>
  );
}
