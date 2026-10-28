import { purchaseCategoryList } from "../../lib/purchases";
import React from "react";
import { InvoiceLineItem } from "../../types/crm";
import { Tag, Trash2, Calculator, Coins } from "lucide-react";

interface PurchaseCategorySelectorProps {
  items: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
  isOptional?: boolean;
  title?: string;
  subtitle?: string;
}

export const PurchaseCategorySelector: React.FC<
  PurchaseCategorySelectorProps
> = ({
  items,
  onChange,
  isOptional = true,
  title = "تحديد أقسام الشراء وأسعار المبيعات",
  subtitle = "اختر التصنيفات وادخل قيمة كل قسم بالجنيه المصري (ج.م / EGP)",
}) => {

  const totalAmount = items.reduce(
    (sum, i) => sum + (Number(i.amount) || 0),
    0,
  );

  const handleToggleCategory = (catId: string, catName: string) => {
    const existingIndex = items.findIndex((i) => i.categoryId === catId);
    if (existingIndex >= 0) {
      // Remove item
      const updated = items.filter((_, idx) => idx !== existingIndex);
      onChange(updated);
    } else {
      // Add item with default amount 0
      const updated = [
        ...items,
        { categoryId: catId, categoryName: catName, amount: 0 },
      ];
      onChange(updated);
    }
  };

  const handleAmountChange = (catId: string, value: number) => {
    const val = Math.max(0, value || 0);
    const updated = items.map((i) => {
      if (i.categoryId === catId) {
        return { ...i, amount: val };
      }
      return i;
    });
    onChange(updated);
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{title}</span>
            {isOptional && (
              <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-normal">
                اختياري
              </span>
            )}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>

      </div>

      {/* Categories Toggle Buttons (Standard 5 + Custom) */}
      <div className="space-y-2">
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
          اختر التصنيفات المراد تفعيلها:
        </label>
        <div className="flex flex-wrap gap-2">
          {purchaseCategoryList
            .map((cat) => {
              const isSelected = items.some((i) => i.categoryId === cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleToggleCategory(cat.id, cat.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                  {isSelected && (
                    <span className="text-[10px] bg-emerald-700 px-1.5 py-0.2 rounded-md">
                      مُفعل
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Price Inputs for Selected Categories */}
      {items.length > 0 && (
        <div className="space-y-3 pt-2">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
            أدخل قيمة الشراء/المبيعات لكل قسم:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <div
                key={item.categoryId}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {item.categoryName}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleCategory(item.categoryId, item.categoryName)
                    }
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    title="حذف التصنيف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount || ""}
                    onChange={(e) =>
                      handleAmountChange(
                        item.categoryId,
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    placeholder="0.00"
                    className="w-full pl-12 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono-numbers font-bold text-xs rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="absolute left-2 top-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 dir-ltr">
                    ج.م
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-calculated Total Banner */}
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
            الإجمالي التلقائي للمشتريات:
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm font-black font-mono-numbers text-emerald-700 dark:text-emerald-300">
          <Coins className="w-4 h-4 text-emerald-500" />
          <span>{totalAmount.toLocaleString("ar-EG")}</span>
          <span className="text-xs font-normal">جنيه مصري (EGP)</span>
        </div>
      </div>
    </div>
  );
};
