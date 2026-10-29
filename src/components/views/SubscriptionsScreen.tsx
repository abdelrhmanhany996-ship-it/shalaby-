import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Plus, Search, Eye, Users as UsersIcon, 
  Archive, ChevronLeft, ChevronRight, Download, Trash2, Pencil
} from 'lucide-react';
import { ExportReportModal } from '../modals/ExportReportModal';
import { ToolIcon } from '../shared/ToolIcon';
import { EgpHint } from '../shared/EgpHint';
import { formatMoney } from '../../utils/money';

export const SubscriptionsScreen: React.FC = () => {
  const { 
    subscriptions,
    users,
    setIsAddWizardOpen,
    setSelectedSubscriptionForDetails, 
    setSelectedSubscriptionForAssign,
    setSelectedSubscriptionForEdit,
    archiveSubscription,
    deleteSubscriptions,
    t,
    dir 
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const pageSize = 5;

  const filtered = subscriptions.filter((sub) => {
    const matchesSearch = 
      sub.toolName.toLowerCase().includes(search.toLowerCase()) ||
      sub.planName.toLowerCase().includes(search.toLowerCase()) ||
      sub.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      sub.teamName.toLowerCase().includes(search.toLowerCase());

    if (filterStatus === 'All') return matchesSearch;
    if (filterStatus === 'Monthly' || filterStatus === 'Yearly') return matchesSearch && sub.billingCycle === filterStatus;
    return matchesSearch && sub.status === filterStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('subscriptions')}
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة وتتبع كل اشتراكات وتكاليف خدمات الذكاء الاصطناعي للمؤسسة. اضغط على أي أداة لفتح صفحة التفاصيل الكاملة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs lg:text-sm rounded-xl border border-slate-200/80 dark:border-slate-700 transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>تصدير البيانات (CSV / PDF)</span>
          </button>

          <button
            onClick={() => setIsAddWizardOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs lg:text-sm rounded-xl shadow-xs transition-all hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{t('quickAdd')}</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 hover:shadow-[0_0_25px_rgba(99,102,241,0.22)] hover:scale-[1.01] transition-all duration-300 ease-out">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="البحث بالأداة، الخطة، المالك أو الفريق..."
              className="w-full ps-10 pe-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Filter Segmented Controls */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Active', 'Expiring Soon', 'Expired', 'Monthly', 'Yearly'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setFilterStatus(st);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                  filterStatus === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {st === 'All' ? 'الكل' :
                 st === 'Active' ? 'نشط' :
                 st === 'Expiring Soon' ? 'ينتهي قريباً' :
                 st === 'Expired' ? 'منتهي' :
                 st === 'Monthly' ? 'شهري' : 'سنوي'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden hover:shadow-[0_0_25px_rgba(99,102,241,0.22)] hover:scale-[1.01] transition-all duration-300 ease-out">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4 text-start">{t('colTool')}</th>
                <th className="p-4 text-start">{t('colPlan')}</th>
                <th className="p-4 text-start">{t('colOwner')}</th>
                <th className="p-4 text-center">{t('colUsers')}</th>
                <th className="p-4 text-start">{t('colBilling')}</th>
                <th className="p-4 text-start">{t('colCost')}</th>
                <th className="p-4 text-start">{t('colRenewal')}</th>
                <th className="p-4 text-center">{t('colStatus')}</th>
                <th className="p-4 text-end">{t('colActions')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    لا توجد اشتراكات تطابق معايير البحث الحالية.
                  </td>
                </tr>
              ) : (
                paginated.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Tool */}
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedSubscriptionForDetails(sub)}
                        className="flex items-center gap-3 text-start hover:opacity-80 transition-opacity"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-800 dark:text-white text-sm">
                          <ToolIcon name={sub.toolName} size={22} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            {sub.toolName}
                          </span>
                          <span className="text-[10px] text-slate-400">{sub.provider}</span>
                        </div>
                      </button>
                    </td>

                    {/* Plan */}
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                      {sub.planName} <span className="text-[10px] text-slate-400">({sub.planType || 'Team'})</span>
                    </td>

                    {/* Owner */}
                    <td className="p-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{sub.ownerName}</span>
                      <span className="text-[10px] text-slate-400">{sub.teamName}</span>
                    </td>

                    {/* Users */}
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                        <UsersIcon className="w-3 h-3 text-slate-400" />
                        <span>{sub.assignedUserIds.filter((id) => users.some((u) => u.id === id)).length} مستخدمين</span>
                      </span>
                    </td>

                    {/* Billing */}
                    <td className="p-4">{sub.billingCycle === 'Monthly' ? 'شهري' : 'سنوي'}</td>

                    {/* Cost */}
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      {formatMoney(sub.cost, sub.currency)}
                      <EgpHint amount={sub.cost} currency={sub.currency} className="block" />
                    </td>

                    {/* Renewal */}
                    <td className="p-4 font-mono text-slate-700 dark:text-slate-300">{sub.renewalDate}</td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'Active'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : sub.status === 'Expiring Soon'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : sub.status === 'Expired'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-end">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setSelectedSubscriptionForDetails(sub)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                          title={t('view')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedSubscriptionForEdit(sub)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                          title="تعديل الاشتراك والحساب"
                          aria-label={`تعديل الاشتراك ${sub.toolName} ${sub.planName}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedSubscriptionForAssign(sub)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
                          title={t('assignUsers')}
                        >
                          <UsersIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => archiveSubscription(sub.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title={t('archive')}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`هل تريد حذف اشتراك "${sub.toolName} (${sub.planName})" نهائياً؟ لا يمكن التراجع عن الحذف.`)) {
                              deleteSubscriptions([sub.id], `${sub.toolName} (${sub.planName})`);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="حذف الاشتراك نهائياً"
                          aria-label={`حذف الاشتراك ${sub.toolName} ${sub.planName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/40">
          <span>عرض {paginated.length} من أصل {filtered.length} اشتراك</span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="font-bold text-slate-900 dark:text-white font-mono">{currentPage} / {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
