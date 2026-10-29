import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CreditCard, DollarSign, CalendarClock, Users, X, 
  ArrowRight, ExternalLink, RefreshCw, Mail, CheckCircle2,
  PieChart, ShieldAlert, Sparkles, Building2
} from 'lucide-react';
import { Subscription, User } from '../../types';
import { costStats, formatUsd, isBilled, monthlyCost } from '../../utils/costs';

export type KpiModalType = 'SUBSCRIPTIONS' | 'COST' | 'RENEWALS' | 'USERS' | null;

interface KpiDetailModalProps {
  type: KpiModalType;
  onClose: () => void;
}

export const KpiDetailModal: React.FC<KpiDetailModalProps> = ({ type, onClose }) => {
  const { 
    subscriptions, users, teams, aiTools, 
    setSelectedSubscriptionForDetails, setActiveTab, addToast 
  } = useApp();

  if (!type) return null;

  const activeSubs = subscriptions.filter(s => s.status !== 'Archived');
  const stats = costStats(subscriptions, users);

  // Helper to calculate days remaining until renewal
  const getDaysUntilRenewal = (renewalDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const renewalDate = new Date(renewalDateStr);
    renewalDate.setHours(0, 0, 0, 0);
    const diffTime = renewalDate.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(days) ? 10 : days;
  };

  const upcomingRenewals = activeSubs.filter(s => getDaysUntilRenewal(s.renewalDate) <= 30);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            {type === 'SUBSCRIPTIONS' && (
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
            )}
            {type === 'COST' && (
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            )}
            {type === 'RENEWALS' && (
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <CalendarClock className="w-5 h-5" />
              </div>
            )}
            {type === 'USERS' && (
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            )}

            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {type === 'SUBSCRIPTIONS' && 'تفاصيل إجمالي الاشتراكات النشطة'}
                {type === 'COST' && 'تفاصيل وتوزيع المصروفات والتكاليف'}
                {type === 'RENEWALS' && 'تفاصيل التجديدات القادمة والاستحقاقات'}
                {type === 'USERS' && 'تفاصيل المستخدمين والأقسام المسندة'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {type === 'SUBSCRIPTIONS' && 'عرض شامل لجميع البرامج والتراخيص المفعلة بالمنظمة.'}
                {type === 'COST' && 'تحليل التكاليف الشهرية والسنوية والتوزع حسب الأقسام.'}
                {type === 'RENEWALS' && 'مواعيد انتهاء الاشتراكات والإجراءات المتاحة.'}
                {type === 'USERS' && 'قائمة أفراد الفريق والتراخيص المسندة لكل منهم.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* KPI TYPE 1: SUBSCRIPTIONS BREAKDOWN */}
          {type === 'SUBSCRIPTIONS' && (
            <div className="space-y-5">
              {/* Stat Summary Boxes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">الاشتراكات النشطة</span>
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {activeSubs.filter(s => s.status === 'Active').length} اشتراك
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">تنتهي قريباً</span>
                  <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {activeSubs.filter(s => s.status === 'Expiring Soon').length} اشتراك
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">إجمالي التكلفة</span>
                  <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {formatUsd(stats.monthlyTotal)}/mo
                  </span>
                </div>
              </div>

              {/* Subscriptions Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="p-3 text-start">الأداة والخطة</th>
                      <th className="p-3 text-start">المالك / الفريق</th>
                      <th className="p-3 text-center">التكلفة</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-end">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {activeSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{sub.toolName}</span>
                          <span className="text-[10px] text-slate-500">{sub.planName}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold block text-slate-800 dark:text-slate-200">{sub.ownerName}</span>
                          <span className="text-[10px] text-slate-500">{sub.teamName}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">${sub.cost}/mo</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.status === 'Active'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-3 text-end">
                          <button
                            onClick={() => {
                              onClose();
                              setSelectedSubscriptionForDetails(sub);
                            }}
                            className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            عرض التفاصيل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* KPI TYPE 2: COST BREAKDOWN */}
          {type === 'COST' && (
            <div className="space-y-5">
              {/* Stat Summary Boxes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">الإنفاق الشهري الحالي</span>
                  <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{formatUsd(stats.monthlyTotal)}</span>
                </div>

                <div className="p-4 bg-indigo-500/10 dark:bg-indigo-950/40 rounded-2xl border border-indigo-500/30">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">التوقع السنوي</span>
                  <span className="text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">{formatUsd(stats.yearlyTotal)}</span>
                </div>

                <div className="p-4 bg-purple-500/10 dark:bg-purple-950/40 rounded-2xl border border-purple-500/30">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">متوسط التكلفة/المستخدم</span>
                  <span className="text-2xl font-extrabold font-mono text-purple-600 dark:text-purple-400">
                    {stats.avgPerUser === null ? '—' : formatUsd(stats.avgPerUser)}
                  </span>
                </div>
              </div>

              {/* Spending By Team List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  توزيع الإنفاق حسب الفرق والمشروعات:
                </h4>

                <div className="space-y-2">
                  {teams.map((tm) => {
                    const teamSubs = activeSubs.filter(s => isBilled(s) && (s.currency === '$' || s.currency === 'USD') && (s.teamId === tm.id || s.teamName === tm.name));
                    const teamSpent = Math.round(teamSubs.reduce((sum, s) => sum + monthlyCost(s), 0) * 100) / 100;
                    const percent = Math.round((teamSpent / (stats.monthlyTotal || 1)) * 100);

                    return (
                      <div key={tm.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tm.color }} />
                            <span className="text-slate-900 dark:text-white">{tm.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({teamSubs.length} اشتراك)</span>
                          </div>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">${teamSpent}/mo ({percent}%)</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: tm.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* KPI TYPE 3: RENEWALS BREAKDOWN */}
          {type === 'RENEWALS' && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-500/10 dark:bg-amber-950/40 rounded-2xl border border-amber-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-amber-800 dark:text-amber-300">
                    الاشتراكات القريبة من التجديد خلال 30 يوماً
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    إجمالي التكلفة المطلوبة لتجديد هذه البرامج: <strong className="font-mono">${upcomingRenewals.reduce((sum, s) => sum + s.cost, 0)}</strong>
                  </p>
                </div>

                <span className="px-3 py-1 bg-amber-500 text-white text-xs font-extrabold rounded-xl">
                  {upcomingRenewals.length} اشتراكات
                </span>
              </div>

              {/* Renewals Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="p-3 text-start">الأداة</th>
                      <th className="p-3 text-start">المالك</th>
                      <th className="p-3 text-center">تاريخ التجديد</th>
                      <th className="p-3 text-center">المتبقي</th>
                      <th className="p-3 text-end">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {upcomingRenewals.map((sub) => {
                      const daysLeft = getDaysUntilRenewal(sub.renewalDate);

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {sub.toolName} ({sub.planName})
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">{sub.ownerName}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">{sub.renewalDate}</td>
                          <td className="p-3 text-center font-bold">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              {daysLeft <= 0 ? 'اليوم!' : `باقي ${daysLeft} يوماً`}
                            </span>
                          </td>
                          <td className="p-3 text-end">
                            <button
                              onClick={() => {
                                addToast('تم التجديد بنجاح 🔄', `تم تجديد اشتراك ${sub.toolName}`);
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              تجديد الآن
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* KPI TYPE 4: USERS BREAKDOWN */}
          {type === 'USERS' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-purple-500/10 dark:bg-purple-950/40 rounded-2xl border border-purple-500/30">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">إجمالي الموظفين</span>
                  <span className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">{users.length} مستخدم</span>
                </div>

                <div className="p-4 bg-indigo-500/10 dark:bg-indigo-950/40 rounded-2xl border border-indigo-500/30">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">الفرق والأقسام</span>
                  <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{teams.length} فرق</span>
                </div>

                <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">الرخص الموزعة</span>
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">14 ترخيص</span>
                </div>
              </div>

              {/* Users List Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  قائمة الموظفين والأدوار:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {users.map((usr) => (
                    <div key={usr.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={usr.avatar} alt={usr.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white block">{usr.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{usr.role} · {usr.teamName}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
                        {usr.email}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            إغلاق النافذة
          </button>

          <button
            onClick={() => {
              onClose();
              if (type === 'SUBSCRIPTIONS') setActiveTab('subscriptions');
              if (type === 'COST') setActiveTab('expenses');
              if (type === 'RENEWALS') setActiveTab('renewals');
              if (type === 'USERS') setActiveTab('users');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>انتقل إلى الشاشة الكاملة</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
