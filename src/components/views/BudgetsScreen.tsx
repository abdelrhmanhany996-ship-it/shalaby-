import React from 'react';
import { useApp } from '../../context/AppContext';
import { DollarSign, AlertCircle, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';

export const BudgetsScreen: React.FC = () => {
  const { budgets, subscriptions, t } = useApp();

  const totalBudget = budgets.reduce((acc, b) => acc + b.monthlyBudget, 0);
  const totalSpent = subscriptions.reduce((acc, s) => acc + s.cost, 0);
  const remaining = totalBudget - totalSpent;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div>
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          إدارة الميزانيات والنفقات (Budgets & Expenses)
        </h1>
        <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
          تخصيص الميزانيات الشهرية والسنوية للمؤسسة والفرق مع التنبيه الفوري عند اقتراب حدود الاستهلاك.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">إجمالي الميزانية الشهرية</span>
          <span className="text-2xl font-mono font-extrabold text-slate-900 dark:text-white">${totalBudget}</span>
          <span className="text-[11px] text-slate-400 block mt-1">${totalBudget * 12} سنوياً</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">الإنفاق الحالي الفعلي</span>
          <span className="text-2xl font-mono font-extrabold text-indigo-600 dark:text-indigo-400">${totalSpent}</span>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block mt-1">مُحدث تلقائياً</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">المتبقي من الميزانية</span>
          <span className={`text-2xl font-mono font-extrabold ${remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            ${remaining}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">المبلغ المتاح للتعيين</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">نسبة الاستهلاك الإجمالية</span>
          <span className="text-2xl font-mono font-extrabold text-slate-900 dark:text-white">
            {Math.round((totalSpent / (totalBudget || 1)) * 100)}%
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-1">ضمن الحدود الآمنة</span>
        </div>
      </div>

      {/* Budget Entries List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">تفاصيل ميزانية الفرق والأقسام وتنبيهات الاستهلاك</h3>

        <div className="space-y-4">
          {budgets.map((b) => {
            const usagePercent = Math.round((b.spentMonthly / (b.monthlyBudget || 1)) * 100);
            return (
              <div
                key={b.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{b.entityName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      الميزانية الشهرية: <strong className="font-mono text-slate-800 dark:text-slate-200">${b.monthlyBudget}</strong> · التقدير السنوي: <strong className="font-mono text-slate-800 dark:text-slate-200">${b.yearlyBudget}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <span className="text-[10px] text-slate-400 block">المصروف الفعلي</span>
                      <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">${b.spentMonthly}</span>
                    </div>

                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      usagePercent >= 90 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                      usagePercent >= 75 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {usagePercent}% مستهلك
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 75 ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <span>تنبيه الحد: عند الوصول لـ {b.alertThresholdPercent}% من الميزانية</span>
                  <span>الضريبة التقديرية (Tax): ${b.taxAmount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
