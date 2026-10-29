import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CalendarClock, AlertTriangle, RefreshCw, Eye, Mail, Send, 
  CheckCircle2, Clock, ShieldAlert, Sparkles, X, Filter, MailCheck
} from 'lucide-react';
import { Subscription } from '../../types';

export const RenewalsScreen: React.FC = () => {
  const { subscriptions, setSelectedSubscriptionForDetails, addToast, t } = useApp();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'EXPIRING_30' | 'URGENT'>('ALL');
  const [emailModalSub, setEmailModalSub] = useState<Subscription | null>(null);
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState<boolean>(false);
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  const activeSubs = subscriptions.filter(s => s.status !== 'Archived');

  // Helper to calculate days remaining until renewal
  const getDaysUntilRenewal = (renewalDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Support YYYY-MM-DD or DD-MM-YYYY formats
    const parts = renewalDateStr.split('-');
    let renewalDate: Date;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        renewalDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        renewalDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    } else {
      renewalDate = new Date(renewalDateStr);
    }

    if (isNaN(renewalDate.getTime())) {
      return 15; // fallback standard estimate if date format varies
    }

    renewalDate.setHours(0, 0, 0, 0);
    const diffTime = renewalDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Subscriptions expiring within < 30 days
  const expiringIn30Days = activeSubs.filter(s => {
    const days = getDaysUntilRenewal(s.renewalDate);
    return days >= 0 && days <= 30;
  });

  const expiringTotalCost = expiringIn30Days.reduce((sum, s) => sum + s.cost, 0);

  // Grouping logic based on filter
  const filteredSubs = activeSubs.filter(s => {
    const days = getDaysUntilRenewal(s.renewalDate);
    if (activeFilter === 'EXPIRING_30') return days >= 0 && days <= 30;
    if (activeFilter === 'URGENT') return days >= 0 && days <= 7;
    return true;
  });

  // Timeline groups
  const todayAndUrgent = filteredSubs.filter(s => getDaysUntilRenewal(s.renewalDate) <= 7);
  const thisMonthList = filteredSubs.filter(s => {
    const days = getDaysUntilRenewal(s.renewalDate);
    return days > 7 && days <= 30;
  });
  const laterList = filteredSubs.filter(s => getDaysUntilRenewal(s.renewalDate) > 30);

  // Open single subscription email modal
  const handleOpenEmailModal = (sub: Subscription) => {
    const daysLeft = getDaysUntilRenewal(sub.renewalDate);
    setEmailModalSub(sub);
    setEmailSubject(`[تذكير عاجل] موعد تجديد اشتراك أداة ${sub.toolName} - Saber Group`);
    setEmailBody(
      `عزيزي/عزيزتي ${sub.ownerName}،\n\nنود إفادتك بأن اشتراك أداة (${sub.toolName} - ${sub.planName}) التابع لفريق (${sub.teamName}) سينتهي خلال ${daysLeft} يوماً (بتاريخ ${sub.renewalDate}).\n\nقيمة التجديد المقررة: $${sub.cost} شهرياً.\n\nيرجى تأكيد الموافقة على التجديد الضمني ومراجعة الأعضاء المسندين لتفادي أي انقطاع في الخدمة.\n\nمع تحيات،\nإدارة الموارد والاشتراكات - Saber Group Subscriptions`
    );
  };

  // Send Email Action (Single)
  const handleSendEmail = () => {
    if (!emailModalSub) return;
    setIsSendingEmail(true);

    setTimeout(() => {
      setIsSendingEmail(false);
      addToast(
        'تم إرسال التذكير بالبريد بنجاح 📧',
        `تم إرسال التنبيه الإلكتروني إلى ${emailModalSub.ownerName} (${emailModalSub.ownerEmail || 'المالك'}) بنجاح.`
      );
      setEmailModalSub(null);
    }, 800);
  };

  // Send Email Action (Bulk)
  const handleSendBulkEmail = () => {
    setIsSendingEmail(true);

    setTimeout(() => {
      setIsSendingEmail(false);
      setIsBulkEmailModalOpen(false);
      addToast(
        'تم إرسال التذكيرات الجماعية 📧',
        `تم إرسال تنبيهات البريد الإلكتروني لجميع مالكي الاشتراكات الـ (${expiringIn30Days.length}) القريبة من الانتهاء بنجاح.`
      );
    }, 1000);
  };

  const renderCard = (sub: Subscription) => {
    const daysLeft = getDaysUntilRenewal(sub.renewalDate);
    const isUrgent = daysLeft <= 7;
    const is30DaysAlert = daysLeft <= 30;

    return (
      <div
        key={sub.id}
        className={`p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border shadow-xs transition-all duration-300 ease-out space-y-3.5 ${
          isUrgent
            ? 'border-rose-500/60 dark:border-rose-500/50 hover:shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:scale-[1.02]'
            : is30DaysAlert
            ? 'border-amber-500/50 dark:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:scale-[1.02]'
            : 'border-slate-200/80 dark:border-slate-800 hover:shadow-[0_0_25px_rgba(99,102,241,0.2)] hover:scale-[1.02]'
        }`}
      >
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-xs ${
              isUrgent
                ? 'bg-rose-500 text-white'
                : is30DaysAlert
                ? 'bg-amber-500 text-white'
                : 'bg-indigo-600 text-white'
            }`}>
              {sub.toolName[0]}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                {sub.toolName} ({sub.planName})
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                المالك: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{sub.ownerName}</strong> ({sub.teamName})
              </span>
            </div>
          </div>

          {/* Days Remaining Pill */}
          {is30DaysAlert ? (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0 ${
              isUrgent
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 animate-pulse border border-rose-300 dark:border-rose-800'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}>
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{daysLeft <= 0 ? 'ينتهي اليوم!' : `ينتهي خلال ${daysLeft} يوماً`}</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {sub.status}
            </span>
          )}
        </div>

        {/* Date & Cost Details Box */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
          is30DaysAlert
            ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/50'
            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/60'
        }`}>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-300 text-[11px]">تاريخ التجديد:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{sub.renewalDate}</span>
          </div>
          <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">${sub.cost}/شهرياً</span>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between pt-1 gap-2">
          {/* Email Reminder Button */}
          <button
            onClick={() => handleOpenEmailModal(sub)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              is30DaysAlert
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:shadow-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title="إرسال بريد إلكتروني تذكيري لمالك الاشتراك"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>تذكير بالبريد</span>
          </button>

          <div className="flex items-center gap-1.5">
            {/* Immediate Renew Button */}
            <button
              onClick={() => {
                addToast('تم تجديد الاشتراك بنجاح 🔄', `تم تجديد اشتراك ${sub.toolName} لـ 30 يوماً إضافية.`);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs hover:shadow-indigo-500/30"
              title="تجديد الاشتراك الآن"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تجديد الآن</span>
            </button>

            {/* Details View Button */}
            <button
              onClick={() => setSelectedSubscriptionForDetails(sub)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="عرض التفاصيل الكاملة"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CalendarClock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>جدول التجديدات والتنبيهات الذكية (Renewals & Alerts)</span>
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            متابعة مواعيد تجديد تراخيص الذكاء الاصطناعي، وتنبيهات الاستحقاق المبكر خلال 30 يوماً.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              activeFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            كل الاشتراكات ({activeSubs.length})
          </button>

          <button
            onClick={() => setActiveFilter('EXPIRING_30')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeFilter === 'EXPIRING_30'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>تنتهي قريباً (&lt; 30 يوماً) ({expiringIn30Days.length})</span>
          </button>
        </div>
      </div>

      {/* SMART ALERT BANNER (IF ANY SUB EXPIRING IN < 30 DAYS) */}
      {expiringIn30Days.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-indigo-500/15 dark:from-amber-950/60 dark:via-rose-950/40 dark:to-indigo-950/60 border border-amber-500/30 dark:border-amber-500/40 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/30 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  🚨 نظام التنبيهات الذكي: تم رصد ({expiringIn30Days.length}) اشتراكات تنتهي صلاحيتها خلال أقل من 30 يوماً!
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                إجمالي التكلفة المتوقعة للتجديد: <strong className="font-mono text-amber-700 dark:text-amber-300 font-bold">${expiringTotalCost}</strong> — 
                يمكنك إرسال إشعارات وتذكيرات إلكترونية مباشرة لمالكي الاشتراكات لمنع توقف خدمات الشركة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsBulkEmailModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2"
            >
              <MailCheck className="w-4 h-4" />
              <span>إرسال تذكير جماعي بالبريد</span>
            </button>
          </div>
        </div>
      )}

      {/* RENEWALS SECTIONS GRID */}
      {activeFilter === 'ALL' ? (
        <div className="space-y-8">
          {todayAndUrgent.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  عاجل وحرج: ينتهي خلال هذا الأسبوع (&lt; 7 أيام) ({todayAndUrgent.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayAndUrgent.map(renderCard)}
              </div>
            </div>
          )}

          {thisMonthList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  تنبيه متوسط: ينتهي خلال 30 يوماً ({thisMonthList.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {thisMonthList.map(renderCard)}
              </div>
            </div>
          )}

          {laterList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  تجديدات قادمة لاحقاً (&gt; 30 يوماً) ({laterList.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {laterList.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              الاشتراكات المفلترة ({filteredSubs.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubs.map(renderCard)}
          </div>
        </div>
      )}

      {/* SINGLE EMAIL REMINDER MODAL */}
      {emailModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    إرسال تذكير إلكتروني باقتراب تجديد الاشتراك
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    سيتم إرسال هذا التنبيه مباشرة لحساب المالك المعتمد.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEmailModalSub(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Details */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">المستلم (المالك):</span>
                <span className="font-bold text-slate-900 dark:text-white">{emailModalSub.ownerName}</span>
              </div>
              <div className="text-end font-mono">
                <span className="text-slate-400 block text-[10px]">البريد الإلكتروني:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{emailModalSub.ownerEmail || 'owner@sabergroup.com'}</span>
              </div>
            </div>

            {/* Email Subject Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                عنوان الرسالة (Subject):
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Email Content Body */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                نص الرسالة التذكيرية:
              </label>
              <textarea
                rows={6}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full p-3 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEmailModalSub(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                إلغاء
              </button>

              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال البريد الإلكتروني الان</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK EMAIL REMINDER MODAL */}
      {isBulkEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-500/30">
                  <MailCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    إرسال تذكيرات بريد إلكتروني جماعية
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    سيتم إرسال إشعار تذكيري لمالكي الاشتراكات الـ ({expiringIn30Days.length}) القريبة من الانتهاء.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBulkEmailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                قائمة مالكي الاشتراكات المستهدفين بالرسالة:
              </span>
              <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto font-mono">
                {expiringIn30Days.map((sub) => (
                  <li key={sub.id} className="flex items-center justify-between py-1 border-b border-amber-200/50 dark:border-amber-800/50 last:border-0">
                    <span className="font-bold">{sub.toolName} ({sub.planName})</span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">{sub.ownerName}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsBulkEmailModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                إلغاء
              </button>

              <button
                onClick={handleSendBulkEmail}
                disabled={isSendingEmail}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال التنبيهات...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>تأكيد وإرسال للجميع الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
