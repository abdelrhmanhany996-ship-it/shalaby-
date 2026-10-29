import { CheckCircle2, CircleHelp, Hourglass } from "lucide-react";
import type { InvoiceLineItem, PurchaseLine } from "../../types/crm";
import { PurchaseDetails } from "./PurchaseDetails";
import { SALE_CATEGORY } from "./PurchaseCategorySelector";
import { grandTotal } from "../../lib/purchaseLines";
import { VoiceNoteField } from "./VoiceNoteField";
import { selectableReasons, toggleReason, type NotBoughtReasonId } from "../../lib/notBought";

export type OutcomeResult = "" | "bought" | "not_yet" | "inquiry";

export interface OutcomeState {
  result: OutcomeResult;
  /** The sale as one amount (kept in the shape purchase records always used). */
  items: InvoiceLineItem[];
  /** Optional typed items, and the total typed directly while there are none. */
  lines: PurchaseLine[];
  direct: string;
  reasons: NotBoughtReasonId[];
  otherText: string;
  note: string;
}

export const emptyOutcome: OutcomeState = { result: "", items: [], lines: [], direct: "", reasons: [], otherText: "", note: "" };

/** What the visit list and the customer file show for each result. */
export const outcomeLabel: Record<Exclude<OutcomeResult, "">, string> = {
  bought: "تم الشراء",
  not_yet: "لسه",
  inquiry: "استفسار فقط",
};

/** An empty string means the outcome is complete (or skipped when it is optional). */
export function outcomeError(o: OutcomeState, required: boolean): string {
  if (!o.result) return required ? "اختار نتيجة الزيارة: اشترى، لسه، أو استفسار فقط." : "";
  if (o.result === "bought" && (!o.items.length || o.items.some((i) => !(Number(i.amount) > 0))))
    return "اكتب إجمالي الشراء (أكبر من صفر).";
  if (o.result === "not_yet") {
    if (!o.reasons.length) return "اختار سبب إنه لسه ما اشترى، أو «مش عارف» لو العميل ما قالش.";
    if (o.reasons.includes("other") && !o.otherText.trim()) return "اكتب السبب في خانة «أخرى».";
  }
  return "";
}

const choices: { id: Exclude<OutcomeResult, "">; title: string; hint: string; Icon: typeof CheckCircle2 }[] = [
  { id: "bought", title: "اشترى", hint: "ونسجل إجمالي الشراء", Icon: CheckCircle2 },
  { id: "not_yet", title: "لسه ما اشترى", hint: "ونسجل السبب دلوقتي", Icon: Hourglass },
  { id: "inquiry", title: "استفسار فقط", hint: "من غير سبب", Icon: CircleHelp },
];

/** The result of this visit (or of the registration): bought from which departments, or not yet and why. */
export function OutcomeSection({
  value,
  onChange,
  required = false,
  boughtHint,
}: {
  value: OutcomeState;
  onChange: (v: OutcomeState) => void;
  required?: boolean;
  boughtHint?: string;
}) {
  const set = (patch: Partial<OutcomeState>) => onChange({ ...value, ...patch });
  return (
    <div className="outcome-section">
      <div className="outcome-tiles" role="group" aria-label="نتيجة الزيارة">
        {choices.map(({ id, title, hint, Icon }) => (
          <button
            type="button"
            key={id}
            className={`outcome-tile is-${id}`}
            aria-pressed={value.result === id}
            onClick={() => set({ result: !required && value.result === id ? "" : id })}
          >
            <Icon size={20} />
            <strong>{title}</strong>
            <small>{hint}</small>
          </button>
        ))}
      </div>

      {value.result === "bought" && (
        <>
          {boughtHint && <p className="quiet-note">{boughtHint}</p>}
          <PurchaseDetails
            lines={value.lines}
            direct={value.direct}
            onChange={({ lines, direct }) => {
              const amount = lines.length ? grandTotal(lines) : Math.max(0, parseFloat(direct) || 0);
              set({ lines, direct, items: amount > 0 ? [{ categoryId: SALE_CATEGORY.id, categoryName: SALE_CATEGORY.name, amount }] : [] });
            }}
          />
        </>
      )}

      {value.result === "not_yet" && (
        <div style={{ marginTop: 14 }}>
          <div className="field">
            <span>
              ليه لسه؟ <em>اختار سبب أو اتنين</em>
            </span>
            <div className="reason-chips" role="group" aria-label="سبب عدم الشراء">
              {selectableReasons.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  className={`reason-chip ${r.id === "unknown" ? "is-unknown" : ""}`}
                  aria-pressed={value.reasons.includes(r.id)}
                  onClick={() => set({ reasons: toggleReason(value.reasons, r.id) })}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {value.reasons.includes("other") && (
            <label className="field">
              <span>
                السبب <em>مطلوب</em>
              </span>
              <input value={value.otherText} onChange={(e) => set({ otherText: e.target.value })} placeholder="اكتب السبب بكلمتين" />
            </label>
          )}
          <div className="field">
            <span>
              ملاحظة <em className="optional-tag">اختياري</em>
            </span>
            <VoiceNoteField
              value={value.note}
              onChange={(note) => set({ note })}
              placeholder="اكتب أو اتكلم: إيه اللي حصل مع العميل؟"
              reasons={selectableReasons.filter((r) => r.id !== "unknown" && r.id !== "other")}
              onSuggestReason={(id) => !value.reasons.length && set({ reasons: toggleReason(value.reasons, id as NotBoughtReasonId) })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
