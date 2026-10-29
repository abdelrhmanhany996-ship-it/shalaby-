import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Subscription } from '../../types';
import { 
  AtSign, Search, Plus, Mail, ShieldCheck, Users, 
  CreditCard, Sparkles, ExternalLink, Calendar, CheckCircle2, AlertCircle, Trash2, Pencil, X
} from 'lucide-react';
import { EgpHint } from '../shared/EgpHint';
import { formatMoney } from '../../utils/money';

export const AccountsScreen: React.FC = () => {
  const { 
    subscriptions, 
    users, 
    setSelectedSubscriptionForAssign, 
    setIsAddWizardOpen,
    setSelectedSubscriptionForDetails,
    deleteSubscriptions,
    renameAccount,
    t
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingAccount, setEditingAccount] = useState<{ email: string; ids: string[] } | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const openAccountEdit = (email: string, subsList: Subscription[]) => {
    setEditingAccount({ email, ids: subsList.map((s) => s.id) });
    setNewEmail(email);
    setEmailError('');
  };

  const saveAccountEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('اكتب إيميل صحيح');
      return;
    }
    if (email !== editingAccount.email.toLowerCase()) {
      renameAccount(editingAccount.ids, editingAccount.email, email);
    }
    setEditingAccount(null);
  };

  // Group subscriptions by Account Email (ownerEmail)
  const accountGroups = subscriptions.reduce<Record<string, Subscription[]>>((acc, sub) => {
    const email = sub.ownerEmail || `${sub.provider.toLowerCase()}@sabergroup.ai`;
    if (!acc[email]) {
      acc[email] = [];
    }
    acc[email].push(sub);
    return acc;
  }, {});

  const accountEmails = Object.keys(accountGroups).filter((email) =>
    email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    accountGroups[email].some((s) => s.toolName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalAccountsCount = Object.keys(accountGroups).length;
  const totalCostAllAccounts = subscriptions.reduce((sum, s) => sum + s.cost, 0);

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <AtSign className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>حسابات الاشتراكات (Subscription Accounts)</span>
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            دليل كامل بكافة الإيميلات والحسابات الإلكترونية التي تمتلك اشتراكات البرامج وأدوات الذكاء الاصطناعي.
          </p>
        </div>

        <button
          onClick={() => setIsAddWizardOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة اشتراك لحساب جديد</span>
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الحسابات المفعلة</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 block font-mono">
            {totalAccountsCount}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المصاريف عبر الحسابات</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 block font-mono">
            ${totalCostAllAccounts.toLocaleString()}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي البرامج المربوطة</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 block font-mono">
            {subscriptions.length}
          </span>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بالإيميل، اسم الحساب، أو أداة الذكاء الاصطناعي..."
          className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
        />
      </div>

      {/* Accounts List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {accountEmails.length === 0 ? (
          <div className="col-span-2 p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">لا توجد حسابات مطابقة</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">جرّب تغيير كلمات البحث أو أضف اشتراك جديد</p>
          </div>
        ) : (
          accountEmails.map((email) => {
            const subsList = accountGroups[email];
            const totalAccountCost = subsList.reduce((sum, s) => sum + s.cost, 0);
            const allUserIds = Array.from(new Set(subsList.flatMap((s) => s.assignedUserIds)));
            const assignedUsers = users.filter((u) => allUserIds.includes(u.id));

            return (
              <div
                key={email}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out"
              >
                {/* Account Top Info */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-mono dir-ltr text-start">
                        {email}
                      </h3>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
                        حساب مالك / مرخص رسمي
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>نشط</span>
                  </span>
                </div>

                {/* Subscriptions in this Account */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                    البرامج والاشتراكات المربوطة بهذا الحساب ({subsList.length}):
                  </span>

                  <div className="space-y-2">
                    {subsList.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSubscriptionForDetails(sub)}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                              {sub.toolName} ({sub.planName})
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              كود الترخيص: <code className="font-mono">{sub.licenseCode}</code>
                            </span>
                          </div>
                        </div>

                        <div className="text-end">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono block">
                            {formatMoney(sub.cost, sub.currency)}
                          </span>
                          <EgpHint amount={sub.cost} currency={sub.currency} className="block" />
                          <span className="text-[10px] text-slate-400">
                            تجديد: {sub.renewalDate}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users assigned */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      الموظفون المستفيدون ({assignedUsers.length}):
                    </span>
                  </div>

                  <div className="flex -space-x-1.5 space-x-reverse">
                    {assignedUsers.slice(0, 4).map((usr) => (
                      <img
                        key={usr.id}
                        src={usr.avatar}
                        alt={usr.name}
                        title={`${usr.name} (${usr.jobTitle || usr.role})`}
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
                      />
                    ))}
                    {assignedUsers.length > 4 && (
                      <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                        +{assignedUsers.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Total & Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">إجمالي التكلفة الحسابية</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                      ${totalAccountCost} / شهرياً
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAccountEdit(email, subsList)}
                      className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                      aria-label={`تعديل الحساب ${email}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>تعديل الحساب</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`هل تريد حذف الحساب ${email} نهائياً؟ سيتم حذف ${subsList.length} اشتراك مرتبط به ولا يمكن التراجع.`)) {
                          deleteSubscriptions(subsList.map((s) => s.id), email);
                        }
                      }}
                      className="px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                      aria-label={`حذف الحساب ${email}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الحساب</span>
                    </button>
                    <button
                      onClick={() => setSelectedSubscriptionForAssign(subsList[0])}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>إدارة الموظفين</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={saveAccountEdit} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                تعديل / تغيير الحساب
              </h3>
              <button type="button" onClick={() => setEditingAccount(null)} aria-label="إغلاق" className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                الحساب الحالي: <code className="font-mono font-bold text-slate-800 dark:text-slate-200">{editingAccount.email}</code>
                <br />
                سيتم نقل {editingAccount.ids.length} اشتراك للإيميل الجديد.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الإيميل الجديد للحساب *</label>
                <input
                  type="email"
                  dir="ltr"
                  autoFocus
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  aria-invalid={!!emailError}
                  className={`w-full px-3.5 py-2.5 text-xs border bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-bold font-mono ${
                    emailError ? 'border-red-500' : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600'
                  }`}
                />
                {emailError && <p className="text-[11px] font-bold text-red-600 mt-1">{emailError}</p>}
              </div>
              <p className="text-[10px] text-slate-400">لو كتبت إيميل حساب موجود، الاشتراكات هتتضم له.</p>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-950/60">
              <button type="button" onClick={() => setEditingAccount(null)} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                إلغاء
              </button>
              <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs">
                حفظ الحساب
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
