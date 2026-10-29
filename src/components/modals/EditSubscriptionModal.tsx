import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Subscription, SubscriptionStatus, BillingCycle } from '../../types';
import { X, Pencil } from 'lucide-react';
import { ToolIcon } from '../shared/ToolIcon';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inputCls =
  'w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';

export const EditSubscriptionModal: React.FC = () => {
  const { selectedSubscriptionForEdit, setSelectedSubscriptionForEdit, updateSubscription, subscriptions, teams } = useApp();
  const [form, setForm] = useState<Subscription | null>(null);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    setForm(selectedSubscriptionForEdit ? { ...selectedSubscriptionForEdit, ownerEmail: selectedSubscriptionForEdit.ownerEmail || '' } : null);
    setEmailError('');
  }, [selectedSubscriptionForEdit]);

  if (!selectedSubscriptionForEdit || !form) return null;

  const knownAccounts = Array.from(new Set(subscriptions.map((s) => s.ownerEmail).filter((e): e is string => !!e)));
  const set = <K extends keyof Subscription>(key: K, value: Subscription[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const close = () => setSelectedSubscriptionForEdit(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const email = (form.ownerEmail || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setEmailError('اكتب إيميل الأكونت بشكل صحيح');
      return;
    }
    const team = teams.find((t) => t.id === form.teamId);
    updateSubscription(form.id, {
      planName: form.planName.trim() || selectedSubscriptionForEdit.planName,
      cost: Number(form.cost) || 0,
      currency: form.currency,
      billingCycle: form.billingCycle,
      startDate: form.startDate,
      renewalDate: form.renewalDate,
      status: form.status,
      ownerEmail: email,
      teamId: form.teamId,
      teamName: team?.name || form.teamName,
      licenseCode: form.licenseCode || '',
      paymentUrl: form.paymentUrl || '',
      autoRenewal: form.autoRenewal,
      notes: form.notes || '',
    });
    close();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <ToolIcon name={form.toolName} size={28} />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                تعديل الاشتراك
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{form.toolName} · {form.provider}</span>
            </div>
          </div>
          <button onClick={close} aria-label="إغلاق" className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Account */}
          <div>
            <label className={labelCls}>الأكونت / الإيميل المسجل عليه الاشتراك *</label>
            <input
              type="email"
              dir="ltr"
              list="edit-known-accounts"
              value={form.ownerEmail || ''}
              onChange={(e) => {
                set('ownerEmail', e.target.value);
                if (emailError) setEmailError('');
              }}
              aria-invalid={!!emailError}
              className={`${inputCls} font-mono font-bold ${emailError ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            <datalist id="edit-known-accounts">
              {knownAccounts.map((acc) => <option key={acc} value={acc} />)}
            </datalist>
            {emailError && <p className="text-[11px] font-bold text-red-600 mt-1">{emailError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>اسم الخطة</label>
              <input type="text" value={form.planName} onChange={(e) => set('planName', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>الحالة</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value as SubscriptionStatus)} className={`${inputCls} font-semibold`}>
                <option value="Active">نشط (Active)</option>
                <option value="Expiring Soon">ينتهي قريباً (Expiring Soon)</option>
                <option value="Expired">منتهي (Expired)</option>
                <option value="Archived">مؤرشف (Archived)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>التكلفة</label>
              <input type="number" min={0} step="0.01" value={form.cost} onChange={(e) => set('cost', Number(e.target.value))} className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>العملة</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className={`${inputCls} font-semibold`}>
                {Array.from(new Set(['$', 'ج.م', 'EUR', 'SAR', form.currency])).map((c) => (
                  <option key={c} value={c}>{c === '$' ? 'USD ($)' : c === 'ج.م' ? 'EGP (ج.م)' : c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>دورة الدفع</label>
              <select value={form.billingCycle} onChange={(e) => set('billingCycle', e.target.value as BillingCycle)} className={`${inputCls} font-semibold`}>
                <option value="Monthly">شهري</option>
                <option value="Yearly">سنوي</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>تاريخ البداية</label>
              <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>تاريخ التجديد / الانتهاء</label>
              <input type="date" value={form.renewalDate} onChange={(e) => set('renewalDate', e.target.value)} className={`${inputCls} font-mono`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>الفريق</label>
              <select value={form.teamId} onChange={(e) => set('teamId', e.target.value)} className={`${inputCls} font-semibold`}>
                {!teams.some((t) => t.id === form.teamId) && <option value={form.teamId}>{form.teamName || 'بدون فريق'}</option>}
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>كود الترخيص</label>
              <input type="text" dir="ltr" value={form.licenseCode || ''} onChange={(e) => set('licenseCode', e.target.value)} className={`${inputCls} font-mono`} />
            </div>
          </div>

          <div>
            <label className={labelCls}>رابط الدفع / الفاتورة</label>
            <input type="url" dir="ltr" value={form.paymentUrl || ''} onChange={(e) => set('paymentUrl', e.target.value)} placeholder="https://" className={`${inputCls} font-mono`} />
          </div>

          <div>
            <label className={labelCls}>ملاحظات</label>
            <textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} className={inputCls} />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.autoRenewal} onChange={(e) => set('autoRenewal', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            تجديد تلقائي
          </label>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button type="button" onClick={close} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors">
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
