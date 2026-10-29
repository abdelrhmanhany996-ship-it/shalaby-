import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, XCircle, Clock, Plus, FileText, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { BillingCycle } from '../../types';

export const ApprovalsScreen: React.FC = () => {
  const { approvals, addApprovalRequest, updateApprovalStatus, currentUser, t } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toolName, setToolName] = useState('');
  const [planName, setPlanName] = useState('Pro');
  const [cost, setCost] = useState(25);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('Monthly');
  const [reason, setReason] = useState('');
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [requiredPeriod, setRequiredPeriod] = useState('6 أشهر');
  const [licenseCodeRequested, setLicenseCodeRequested] = useState(true);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (toolName && reason) {
      addApprovalRequest({
        toolName,
        planName,
        cost: Number(cost),
        currency: 'USD',
        billingCycle,
        requesterId: currentUser?.id || 'usr-ahmed',
        requesterName: currentUser?.name || 'Ahmed Hassan',
        teamId: currentUser?.teamId || 'team-dev',
        teamName: currentUser?.teamName || 'Development',
        reason,
        businessPurpose: businessPurpose || 'زيادة إنتاجية الفريق واستغلال الذكاء الاصطناعي',
        requiredPeriod,
        licenseCodeRequested
      });
      setIsModalOpen(false);
      setToolName('');
      setReason('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            سلسلة طلبات الموافقة (Approval Workflow)
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تقديم وادارة طلبات شراء أو ترقية أدوات الذكاء الاصطناعي عبر سلسلة الاعتماد الإداري والمالي.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs lg:text-sm rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>تقديم طلب أداة جديدة</span>
        </button>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {approvals.map((appr) => (
          <div
            key={appr.id}
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{appr.toolName} ({appr.planName})</h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    ${appr.cost}/{appr.billingCycle === 'Monthly' ? 'شهرياً' : 'سنوياً'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  المُقدِم: <strong className="text-slate-700 dark:text-slate-300">{appr.requesterName}</strong> · الفريق: <strong className="text-slate-700 dark:text-slate-300">{appr.teamName}</strong> · التاريخ: {appr.createdAt}
                </p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                appr.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' :
                appr.status === 'rejected' ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300' :
                'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
              }`}>
                {appr.status === 'approved' ? 'مقبول ومعتمد' : appr.status === 'rejected' ? 'مرفوض' : `قيد الاعتماد (${appr.currentStepRole})`}
              </span>
            </div>

            {/* Reasons */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1">
              <p className="text-slate-800 dark:text-slate-200"><strong>سبب الطلب:</strong> {appr.reason}</p>
              <p className="text-slate-600 dark:text-slate-400"><strong>الجدوى التجارية:</strong> {appr.businessPurpose}</p>
            </div>

            {/* Approval Chain Progress */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-2">سلسلة الاعتماد والموافقات (Approval Chain)</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {appr.chain.map((c, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-center font-semibold ${
                      c.status === 'approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : c.status === 'rejected'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold">{c.role}</span>
                    <span className="block text-xs mt-0.5">{c.status === 'approved' ? '✓ موافقة' : c.status === 'rejected' ? '✕ رفض' : 'انتظار'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons for Managers */}
            {appr.status === 'pending' && (
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => updateApprovalStatus(appr.id, 'rejected', 'غير مطابق للميزانية الحالية')}
                  className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl hover:bg-rose-100 transition-colors"
                >
                  رفض الطلب
                </button>
                <button
                  onClick={() => updateApprovalStatus(appr.id, 'approved', 'تم الاعتماد والشراء')}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  اعتماد وموافقة
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">تقديم طلب أداة ذكاء اصطناعي جديدة</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">اسم الأداة أو الخدمة *</label>
                <input
                  type="text"
                  required
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  placeholder="مثال: ElevenLabs, DeepSeek Pro, Midjourney"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1">الخطة المطلوبة</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1">التكلفة المتوقعة ($)</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">سبب الاحتياج والمبرر الفني *</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اشرح لماذا يستلزم عمل الفريق هذه الأداة..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">العائد والجدوى التجارية (Business Purpose)</label>
                <input
                  type="text"
                  value={businessPurpose}
                  onChange={(e) => setBusinessPurpose(e.target.value)}
                  placeholder="مثال: تسريع التسليم بنسبة 30%"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-semibold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-indigo-700"
                >
                  رفع الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
