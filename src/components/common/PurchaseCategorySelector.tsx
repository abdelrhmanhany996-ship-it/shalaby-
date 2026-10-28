import React from "react";
import { InvoiceLineItem } from "../../types/crm";

interface PurchaseCategorySelectorProps {
  items: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
  isOptional?: boolean;
  title?: string;
  subtitle?: string;
}

/**
 * The value of a sale. The CRM no longer splits a sale across business categories, so this is one amount.
 * It is stored as the single "misc" line the purchase records always understood, so old records keep working.
 */
export const SALE_CATEGORY = { id: "cat-misc", name: "عملية بيع" } as const;

export const PurchaseCategorySelector: React.FC<PurchaseCategorySelectorProps> = ({
  items,
  onChange,
  title = "قيمة البيع",
  subtitle = "اكتب المبلغ اللي دفعه العميل بالجنيه",
}) => {
  const amount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  return (
    <label className="field">
      <span>
        {title} <em>مطلوب</em>
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        dir="ltr"
        placeholder="0"
        aria-label={title}
        value={amount || ""}
        onChange={(e) => {
          const v = Math.max(0, parseFloat(e.target.value) || 0);
          onChange(v > 0 ? [{ categoryId: SALE_CATEGORY.id, categoryName: SALE_CATEGORY.name, amount: v }] : []);
        }}
      />
      <small className="table-secondary">{subtitle}</small>
    </label>
  );
};
