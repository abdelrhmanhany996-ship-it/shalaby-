import { useState } from "react";
import { X } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { useDialog } from "./useDialog";
import { VoiceNoteField } from "./VoiceNoteField";
import {
  notBoughtReasons,
  toggleReason,
  type NotBoughtReasonId,
} from "../../lib/notBought";
import type { Lead } from "../../types/crm";

interface Props {
  lead: Lead;
  agentId: string;
  canBook: boolean;
  onBought: () => void;
  onClose: () => void;
}

/** After a visit or follow-up: did the customer buy, or not yet (and why)? */
export function PurchaseOutcomeDialog({ lead, agentId, canBook, onBought, onClose }: Props) {
  const { addNotBoughtRecord } = useCRM();
  const ref = useDialog(true, onClose);
  const [step, setStep] = useState<"choose" | "reason">("choose");
  const [reasons, setReasons] = useState<NotBoughtReasonId[]>([]);
  const [otherText, setOtherText] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasons.length) {
      setError("اختار سبب، أو «مش عارف» لو العميل ما قالش.");
      return;
    }
    if (reasons.includes("other") && !otherText.trim()) {
      setError("اكتب السبب في خانة «أخرى».");
      return;
    }
    addNotBoughtRecord({
      leadId: lead.id,
      leadName: lead.name,
      branchId: lead.branchId,
      agentId,
      reasons,
      otherText: reasons.includes("other") ? otherText.trim() : undefined,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="dialog-backdrop" style={{ zIndex: 80 }}>
      <div
        className="panel"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="outcome-title"
        style={{ width: "min(520px,100%)", padding: 27, maxHeight: "92vh", overflowY: "auto" }}
      >
        <div className="page-heading">
          <div>
            <h2 id="outcome-title" style={{ fontSize: 20, fontWeight: 600 }}>
              اشترى ولا لسه؟
            </h2>
            <p>{lead.name}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        {step === "choose" ? (
          <div className="outcome-choice">
            <button
              type="button"
              className="is-bought"
              disabled={!canBook}
              title={canBook ? "" : "تسجيل التعاقد غير متاح لحسابك"}
              onClick={onBought}
            >
              اشترى
            </button>
            <button type="button" className="is-not-yet" onClick={() => setStep("reason")}>
              لسه
            </button>
          </div>
        ) : (
          <form onSubmit={save}>
            <div className="field">
              <span>
                ليه لسه؟ <em>اختار سبب أو اتنين</em>
              </span>
              <div className="reason-chips" role="group" aria-label="سبب عدم الشراء">
                {notBoughtReasons.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    className={`reason-chip ${r.id === "unknown" ? "is-unknown" : ""}`}
                    aria-pressed={reasons.includes(r.id)}
                    onClick={() => {
                      setReasons((cur) => toggleReason(cur, r.id));
                      setError("");
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {reasons.includes("other") && (
              <label className="field">
                <span>
                  السبب <em>مطلوب</em>
                </span>
                <input
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="اكتب السبب بكلمتين"
                />
              </label>
            )}
            {reasons.includes("unknown") && (
              <p className="table-secondary" style={{ marginBottom: 12 }}>
                مفيش مشكلة. هنجدول متابعة بعد يومين فيها سؤال جاهز للعميل عن السبب.
              </p>
            )}
            <div className="field">
              <span>
                ملاحظة <em className="optional-tag">اختياري</em>
              </span>
              <VoiceNoteField
                value={note}
                onChange={setNote}
                placeholder="اكتب أو اتكلم: إيه اللي حصل مع العميل؟"
                reasons={notBoughtReasons.filter((r) => r.id !== "unknown" && r.id !== "other")}
                onSuggestReason={(id) =>
                  setReasons((cur) =>
                    cur.length ? cur : toggleReason(cur, id as NotBoughtReasonId),
                  )
                }
              />
            </div>
            {error && (
              <p className="notice warning" role="alert" style={{ marginTop: 10 }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn-primary" type="submit">
                حفظ
              </button>
              <button className="btn-secondary" type="button" onClick={() => setStep("choose")}>
                رجوع
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
