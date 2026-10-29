import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, Calendar, DollarSign, Users, CreditCard, ExternalLink, 
  Archive, Plus, Bell, ShieldCheck, Mail, Sparkles, AlertCircle, Trash2, Pencil
} from 'lucide-react';
import { EgpHint } from '../shared/EgpHint';
import { formatMoney } from '../../utils/money';

export const SubscriptionDetailModal: React.FC = () => {
  const { 
    selectedSubscriptionForDetails, 
    setSelectedSubscriptionForDetails,
    setSelectedSubscriptionForAssign,
    updateSubscription,
    archiveSubscription,
    deleteSubscriptions,
    setSelectedSubscriptionForEdit,
    users,
    activities,
    t
  } = useApp();

  if (!selectedSubscriptionForDetails) return null;

  const sub = selectedSubscriptionForDetails;

  const assignedUsers = users.filter((u) => sub.assignedUserIds.includes(u.id));
  const subActivities = activities.filter((a) => a.target.toLowerCase().includes(sub.toolName.toLowerCase()));

  const handleArchive = () => {
    archiveSubscription(sub.id);
    setSelectedSubscriptionForDetails(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-extrabold shadow-md shadow-indigo-500/20 shrink-0">
              {sub.toolName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{sub.toolName}</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  {sub.planName} ({sub.planType || 'Team'})
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                  {sub.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                المزود: <strong className="text-slate-700 dark:text-slate-300">{sub.provider}</strong> · الفريق المسؤول: <strong className="text-slate-700 dark:text-slate-300">{sub.teamName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedSubscriptionForDetails(null)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 dark:text-slate-100">
          {/* Direct Payment Link & Owner Card */}
          <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
                <CreditCard className="w-4 h-4" />
                <span>حساب المالك ووسيلة الدفع</span>
              </div>
              <p className="text-sm font-bold text-white">
                {sub.ownerName} <span className="text-indigo-300 text-xs font-normal">({sub.ownerEmail || 'admin@company.ai'})</span>
              </p>
              <p className="text-xs text-slate-300 font-mono">
                {sub.paymentMethod}
              </p>
            </div>

            {sub.paymentUrl && (
              <a
                href={sub.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
              >
                <span>فتح رابط الدفع المباشر</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Key Overview Timeline */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              تفاصيل فترة الاشتراك، التكلفة، وكود الترخيص (Open Date → End Date)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">التكلفة والفوترة</span>
                <span className="text-sm font-mono font-extrabold text-slate-900 dark:text-white">
                  {formatMoney(sub.cost, sub.currency)} / {sub.billingCycle === 'Monthly' ? 'شهرياً' : 'سنوياً'}
                </span>
                <EgpHint amount={sub.cost} currency={sub.currency} className="block" />
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">تاريخ الفتح (Start Date)</span>
                <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                  {sub.startDate || '2026-09-01'}
                </span>
              </div>

              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block mb-1">تاريخ التجديد والانتهاء (End Date)</span>
                <input
                  type="date"
                  value={sub.renewalDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    updateSubscription(sub.id, { renewalDate: newDate });
                    setSelectedSubscriptionForDetails({ ...sub, renewalDate: newDate });
                  }}
                  className="w-full px-2 py-1 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-slate-900 rounded-lg border border-indigo-300 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">كود التفعيل / الخصم</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    {sub.licenseCode || 'LIC-98311'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Seat Utilization Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>إشغال المقاعد والتراخيص (Seats Utilization)</span>
              </span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                {sub.assignedUserIds.length} / {sub.purchasedSeats || 5} مقاعد مخصصة
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((sub.assignedUserIds.length / (sub.purchasedSeats || 5)) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>مقاعد مستخدمة فعلياً: {sub.assignedUserIds.length}</span>
              <span>مقاعد شاغرة متبقية: {Math.max(0, (sub.purchasedSeats || 5) - sub.assignedUserIds.length)}</span>
            </div>
          </div>

          {/* Reminders & Automation */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white block flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>جدول التنبيهات المدرسية المفعّلة لهذا الاشتراك</span>
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${sub.reminders?.d30 ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 text-slate-500'}`}>
                30 يوماً قبل
              </span>
              <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${sub.reminders?.d14 ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 text-slate-500'}`}>
                14 يوماً قبل
              </span>
              <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${sub.reminders?.d7 ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 text-slate-500'}`}>
                7 أيام قبل
              </span>
              <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border-2 border-amber-500 ${sub.reminders?.d2 !== false ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-slate-200 text-slate-500'}`}>
                🔔 يومين قبل التجديد (عاجل)
              </span>
              <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${sub.reminders?.d1 ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 text-slate-500'}`}>
                يوم واحد (غداً)
              </span>
            </div>
          </div>

          {/* Assigned Employees List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                الموظفون والمستخدمون المخصصون ({assignedUsers.length})
              </h3>
              <button
                onClick={() => {
                  setSelectedSubscriptionForDetails(null);
                  setSelectedSubscriptionForAssign(sub);
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة/تعديل المستخدمين</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assignedUsers.map((usr) => (
                <div key={usr.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
                  <img src={usr.avatar} alt={usr.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">{usr.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{usr.role} · {usr.teamName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              سجل الاستبعاد والأرشيف والنشاط
            </h3>
            <div className="space-y-2">
              {subActivities.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">لا توجد سجلات تغيير حديثة لهذا الاشتراك.</p>
              ) : (
                subActivities.map((act) => (
                  <div key={act.id} className="text-xs p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">{act.userName}</strong> {act.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{act.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <button
            onClick={handleArchive}
            className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Archive className="w-4 h-4" />
            <span>أرشفة الاشتراك</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm(`هل تريد حذف اشتراك "${sub.toolName} (${sub.planName})" نهائياً؟ لا يمكن التراجع عن الحذف.`)) {
                deleteSubscriptions([sub.id], `${sub.toolName} (${sub.planName})`);
              }
            }}
            className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-1.5 me-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف نهائي</span>
          </button>

          <button
            onClick={() => setSelectedSubscriptionForEdit(sub)}
            className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Pencil className="w-4 h-4" />
            <span>تعديل / تغيير الحساب</span>
          </button>

          <button
            onClick={() => setSelectedSubscriptionForDetails(null)}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
