import { CheckCircle2, CircleHelp, Hourglass } from "lucide-react";
import type { InvoiceLineItem } from "../../types/crm";
import { PurchaseCategorySelector } from "./PurchaseCategorySelector";
import { VoiceNoteField } from "./VoiceNoteField";
import { notBoughtReasons, toggleReason, type NotBoughtReasonId } from "../../lib/notBought";

export type OutcomeResult = "" | "bought" | "not_yet" | "inquiry";

export interface OutcomeState {
  result: OutcomeResult;
  items: InvoiceLineItem[];
  reasons: NotBoughtReasonId[];
  otherText: string;
  note: string;
}

export const emptyOutcome: OutcomeState = { result: "", items: [], reasons: [], otherText: "", note: "" };

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
    return "دوس على القسم اللي اشترى منه واكتب المبلغ.";
  if (o.result === "not_yet") {
    if (!o.reasons.length) return "اختار سبب إنه لسه ما اشترى، أو «مش عارف» لو العميل ما قالش.";
    if (o.reasons.includes("other") && !o.otherText.trim()) return "اكتب السبب في خانة «أخرى».";
  }
  return "";
}

const choices: { id: Exclude<OutcomeResult, "">; title: string; hint: string; Icon: typeof CheckCircle2 }[] = [
  { id: "bought", title: "اشترى", hint: "ونحدد من أنهي قسم", Icon: CheckCircle2 },
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
          <PurchaseCategorySelector
            items={value.items}
            onChange={(items) => set({ items })}
            title="اشترى من إيه؟"
            subtitle="دوس على القسم اللي اشترى منه واكتب دفع فيه كام بالجنيه"
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
              {notBoughtReasons.map((r) => (
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
          {value.reasons.includes("unknown") && (
            <p className="quiet-note">مفيش مشكلة. هنجدول متابعة بعد يومين فيها سؤال جاهز للعميل عن السبب.</p>
          )}
          <div className="field">
            <span>
              ملاحظة <em className="optional-tag">اختياري</em>
            </span>
            <VoiceNoteField
              value={value.note}
              onChange={(note) => set({ note })}
              placeholder="اكتب أو اتكلم: إيه اللي حصل مع العميل؟"
              reasons={notBoughtReasons.filter((r) => r.id !== "unknown" && r.id !== "other")}
              onSuggestReason={(id) => !value.reasons.length && set({ reasons: toggleReason(value.reasons, id as NotBoughtReasonId) })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
