import { Plus, Trash2 } from "lucide-react";
import type { PurchaseLine } from "../../types/crm";
import { grandTotal, lineTotal } from "../../lib/purchaseLines";

interface Props {
  lines: PurchaseLine[];
  /** The total typed directly, used while there are no lines. */
  direct: string;
  onChange: (next: { lines: PurchaseLine[]; direct: string }) => void;
  /** Wording and behaviour for other uses of the same editor (a price quote). */
  heading?: string;
  hint?: string;
  totalLabel?: string;
  /** Items only: no direct total when there are no lines, and the heading is not marked optional. */
  itemsOnly?: boolean;
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const parse = (v: string) => Math.max(0, parseFloat(v) || 0);

/**
 * What the customer bought. The details are optional: the salesperson types each item by hand (name, price of one,
 * pieces) and the line total is worked out, or types the line total directly. Without any items the total is typed
 * on its own. The overall total is always shown last.
 */
export function PurchaseDetails({ lines, direct, onChange, heading = "تفاصيل الشراء", hint, totalLabel = "إجمالي الشراء", itemsOnly = false }: Props) {
  const set = (i: number, patch: Partial<PurchaseLine>) =>
    onChange({ lines: lines.map((l, k) => (k === i ? { ...l, ...patch } : l)), direct });
  const total = lines.length ? grandTotal(lines) : parse(direct);

  return (
    <div className="purchase-details">
      <div className="field">
        <span>
          {heading} {!itemsOnly && <em className="optional-tag">اختياري</em>}
        </span>
        <small className="table-secondary">{hint ?? "اكتب كل صنف اشتراه: الاسم وسعر القطعة والعدد، والإجمالي بيتحسب لوحده. أو اكتب إجمالي الصنف مباشرة. التفاصيل بتساعد شلبي في تحليل العميل والتقارير."}</small>
      </div>

      {lines.map((l, i) => {
        const auto = !!(l.price && l.qty);
        return (
          <div className="purchase-line" key={i}>
            <input
              aria-label={`اسم الصنف ${i + 1}`}
              placeholder="اسم الصنف"
              value={l.name}
              maxLength={120}
              onChange={(e) => set(i, { name: e.target.value })}
            />
            <input
              aria-label={`سعر القطعة ${i + 1}`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              dir="ltr"
              placeholder="سعر القطعة"
              value={l.price ?? ""}
              onChange={(e) => set(i, { price: parse(e.target.value) || undefined })}
            />
            <input
              aria-label={`عدد القطع ${i + 1}`}
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              dir="ltr"
              placeholder="العدد"
              value={l.qty ?? ""}
              onChange={(e) => set(i, { qty: parse(e.target.value) || undefined })}
            />
            <input
              aria-label={`إجمالي الصنف ${i + 1}`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              dir="ltr"
              placeholder="الإجمالي"
              readOnly={auto}
              value={auto ? lineTotal(l) : l.total || ""}
              onChange={(e) => set(i, { total: parse(e.target.value) })}
            />
            <button type="button" className="icon-button" aria-label={`حذف الصنف ${i + 1}`} onClick={() => onChange({ lines: lines.filter((_, k) => k !== i), direct })}>
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}

      <button type="button" className="btn-secondary" onClick={() => onChange({ lines: [...lines, { name: "", total: 0 }], direct })}>
        <Plus size={14} />
        أضف صنف
      </button>

      {lines.length === 0 && !itemsOnly && (
        <label className="field" style={{ marginTop: 12 }}>
          <span>
            إجمالي الشراء (ج.م) <em>مطلوب</em>
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            dir="ltr"
            placeholder="0"
            aria-label="إجمالي الشراء"
            value={direct}
            onChange={(e) => onChange({ lines, direct: e.target.value })}
          />
        </label>
      )}

      <div className="purchase-total" aria-live="polite">
        <span>{totalLabel}</span>
        <strong>{fmt(total)} ج.م</strong>
      </div>
    </div>
  );
}
