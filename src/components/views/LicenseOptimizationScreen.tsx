import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, TrendingDown, ShieldAlert, Check, ArrowRight } from 'lucide-react';

export const LicenseOptimizationScreen: React.FC = () => {
  const { optimizations, subscriptions, applyOptimization, t } = useApp();

  const totalPotentialSavings = optimizations
    .filter(o => o.status === 'pending')
    .reduce((acc, o) => acc + o.potentialSavingsMonthly, 0);

  const totalPurchasedSeats = subscriptions.reduce((acc, s) => acc + (s.purchasedSeats || 5), 0);
  const totalAssignedSeats = subscriptions.reduce((acc, s) => acc + (s.assignedSeats || s.assignedUserIds.length), 0);
  const unusedSeats = totalPurchasedSeats - totalAssignedSeats;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div>
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          تحسين وترشيد التراخيص (License Optimization)
        </h1>
        <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
          اكتشاف المقاعد المشتراة غير المستغلة والأدوات المكررة لتوفير الميزانية وتحسين كفاءة استخدام الذكاء الاصطناعي.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-lg">
          <span className="text-xs text-indigo-300 block mb-1">إجمالي التوفير الشهري المحتمل</span>
          <span className="text-2xl font-mono font-extrabold text-emerald-400">${totalPotentialSavings}/mo</span>
          <span className="text-[11px] text-slate-300 block mt-1">${totalPotentialSavings * 12} وفر سنوي محتمل</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">المقاعد المشتراة (Purchased Seats)</span>
          <span className="text-2xl font-mono font-extrabold text-slate-900 dark:text-white">{totalPurchasedSeats} مقعداً</span>
          <span className="text-[11px] text-slate-400 block mt-1">إجمالي التراخيص المدفوعة</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">المقاعد المخصصة للموظفين</span>
          <span className="text-2xl font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{totalAssignedSeats} مقعداً</span>
          <span className="text-[11px] text-slate-400 block mt-1">المستخدمين الفعليين الحالية</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">المقاعد الفائضة وغير المستخدمة</span>
          <span className="text-2xl font-mono font-extrabold text-rose-600 dark:text-rose-400">{unusedSeats} مقاعد</span>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 block mt-1">تتطلب إعادة تخصيص أو إلغاء</span>
        </div>
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">فرص التوفير والتوصيات المكتشفة تلقائياً</h3>

        <div className="space-y-3">
          {optimizations.map((opt) => (
            <div
              key={opt.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                opt.status === 'applied'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-75'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-400'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                    opt.severity === 'high' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                    opt.severity === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                    'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                  }`}>
                    {opt.severity === 'high' ? 'عالية الأهمية' : opt.severity === 'medium' ? 'متوسطة' : 'منخفضة'}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{opt.title}</h4>
                </div>

                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  💡 التوصية: {opt.recommendation}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  سبب التوليد: {opt.reason}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 sm:border-s border-slate-100 dark:border-slate-800 pt-3 sm:pt-0 sm:ps-4 w-full sm:w-auto justify-between sm:justify-start">
                <div className="text-end">
                  <span className="text-[10px] text-slate-400 block">التوفير الشهري</span>
                  <span className="text-base font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    +${opt.potentialSavingsMonthly}/mo
                  </span>
                </div>

                {opt.status === 'pending' ? (
                  <button
                    onClick={() => applyOptimization(opt.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>تطبيق التوصية</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>تم تطبيق التوفير</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
