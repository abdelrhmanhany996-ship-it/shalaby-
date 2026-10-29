import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GoogleCodeBatch } from '../../types';
import { Ticket, Plus, Trash2, Copy, Check, Search, Pencil, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ToolIcon } from '../shared/ToolIcon';
import { EgpHint } from '../shared/EgpHint';
import { formatEgp, formatMoney, toEgp } from '../../utils/money';

const card = 'p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs';
const PAGE_SIZE = 8;

const planName = (b: GoogleCodeBatch) => (b.plan === 'plus' ? 'Google AI Plus' : 'Google AI Pro');

const PlanBadge: React.FC<{ plan: GoogleCodeBatch['plan'] }> = ({ plan }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${plan === 'plus' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'}`}>
    {plan === 'plus' ? 'بلس' : 'عادي'}
  </span>
);

export const GoogleCodesScreen: React.FC = () => {
  const {
    googleCodeBatches, updateGoogleCodes, deleteGoogleCodes, setIsGoogleCodesModalOpen, setEditingGoogleCodes, exchangeRates, dir,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pro' | 'plus' | 'unused'>('all');
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [copied, setCopied] = useState('');

  const viewing = googleCodeBatches.find((b) => b.id === viewingId) || null;

  const totalCodes = googleCodeBatches.reduce((s, b) => s + b.quantity, 0);
  const usedCodes = googleCodeBatches.reduce((s, b) => s + b.codes.filter((c) => c.used).length, 0);
  const totalEgp = googleCodeBatches.reduce((s, b) => s + toEgp(b.unitPrice * b.quantity, b.currency, exchangeRates), 0);
  const count = (plan: 'pro' | 'plus') => googleCodeBatches.filter((b) => b.plan === plan).reduce((s, b) => s + b.quantity, 0);

  const q = search.trim().toLowerCase();
  const filtered = googleCodeBatches.filter((b) => {
    const matches = !q || planName(b).toLowerCase().includes(q) || (b.note || '').toLowerCase().includes(q)
      || (b.supplier || '').toLowerCase().includes(q)
      || b.date.includes(q) || b.codes.some((c) => c.code.toLowerCase().includes(q));
    if (!matches) return false;
    if (filter === 'pro' || filter === 'plus') return b.plan === filter;
    if (filter === 'unused') return b.codes.some((c) => !c.used);
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      // Clipboard blocked: the code is still visible to copy by hand
    }
  };

  const remove = (b: GoogleCodeBatch) => {
    if (!window.confirm(`هل تريد حذف ${b.quantity} كود ${planName(b)} (${b.date})؟`)) return;
    const refund = !!b.walletEntryId && window.confirm(
      `ترجّع تمنهم للمحفظة؟\n${formatMoney(b.unitPrice * b.quantity, b.currency)}\n\nموافق = يرجع للرصيد · إلغاء = يفضل مخصوم`
    );
    deleteGoogleCodes(b.id, refund);
    if (viewingId === b.id) setViewingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            أكواد Google
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة أكواد Google AI Pro و Plus: السعر والعدد والأكواد نفسها، وتمنها بيتخصم من محفظة الاشتراكات.
          </p>
        </div>
        <button
          onClick={() => setIsGoogleCodesModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs lg:text-sm rounded-xl shadow-xs transition-all hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          إضافة أكواد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={card}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">إجمالي الأكواد</span>
          <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{totalCodes}</span>
        </div>
        <div className={card}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Pro عادي / Plus</span>
          <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{count('pro')} / {count('plus')}</span>
        </div>
        <div className={card}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">المستخدم من الأكواد المسجلة</span>
          <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{usedCodes}</span>
        </div>
        <div className={card}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">إجمالي التكلفة</span>
          <span className="text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-400">{formatEgp(totalEgp)}</span>
          <span className="block text-[11px] text-slate-400 font-mono">≈ ${(totalEgp / (exchangeRates.USD || 1)).toFixed(2)}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث بالكود، الملاحظة أو التاريخ..."
            className="w-full ps-10 pe-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {([['all', 'الكل'], ['pro', 'Pro عادي'], ['plus', 'Plus'], ['unused', 'فيها أكواد متاحة']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => { setFilter(value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                filter === value ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
              <tr>
                <th className="p-4 text-start">النوع</th>
                <th className="p-4 text-start">المورد</th>
                <th className="p-4 text-start">سعر الكود</th>
                <th className="p-4 text-center">العدد</th>
                <th className="p-4 text-start">الإجمالي</th>
                <th className="p-4 text-center">المستخدم</th>
                <th className="p-4 text-start">تاريخ الشراء</th>
                <th className="p-4 text-start">ملاحظة</th>
                <th className="p-4 text-end">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {googleCodeBatches.length === 0 ? 'لسه مفيش أكواد. اضغط "إضافة أكواد".' : 'مفيش نتائج مطابقة للبحث.'}
                  </td>
                </tr>
              ) : rows.map((b) => {
                const total = b.unitPrice * b.quantity;
                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <button onClick={() => setViewingId(b.id)} className="flex items-center gap-3 text-start hover:opacity-80">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <ToolIcon name="Gemini" size={22} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{planName(b)}</span>
                          <PlanBadge plan={b.plan} />
                        </div>
                      </button>
                    </td>
                    <td className="p-4">
                      {b.supplier ? (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-extrabold font-mono">{b.supplier}</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      {formatMoney(b.unitPrice, b.currency)}
                      <EgpHint amount={b.unitPrice} currency={b.currency} className="block" />
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-slate-900 dark:text-white">{b.quantity}</td>
                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {formatMoney(total, b.currency)}
                      <EgpHint amount={total} currency={b.currency} className="block" />
                    </td>
                    <td className="p-4 text-center font-mono">
                      {b.codes.length ? `${b.codes.filter((c) => c.used).length} / ${b.codes.length}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="p-4 font-mono whitespace-nowrap">{b.date}</td>
                    <td className="p-4 max-w-[180px] truncate" title={b.note}>{b.note || <span className="text-slate-400">—</span>}</td>
                    <td className="p-4 text-end">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setViewingId(b.id)}
                          title="عرض الأكواد"
                          aria-label={`عرض أكواد ${planName(b)} ${b.date}`}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingGoogleCodes(b)}
                          title="تعديل"
                          aria-label={`تعديل أكواد ${planName(b)} ${b.date}`}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(b)}
                          title="حذف"
                          aria-label={`حذف أكواد ${planName(b)} ${b.date}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/40">
          <span>عرض {rows.length} من أصل {filtered.length} عملية شراء</span>
          <div className="flex items-center gap-2">
            <button
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
              aria-label="الصفحة السابقة"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="font-bold text-slate-900 dark:text-white font-mono">{current} / {totalPages}</span>
            <button
              disabled={current === totalPages}
              onClick={() => setPage(current + 1)}
              aria-label="الصفحة التالية"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Codes of one purchase */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <ToolIcon name="Gemini" size={28} />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">{planName(viewing)} <PlanBadge plan={viewing.plan} /></h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {viewing.date} · {viewing.quantity} × {formatMoney(viewing.unitPrice, viewing.currency)}
                    {viewing.supplier && <span> · {viewing.supplier}</span>}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewingId(null)} aria-label="إغلاق" className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-2">
              {viewing.codes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">الأكواد نفسها مش متسجلة. اضغط "تعديل" والصقها.</p>
              ) : viewing.codes.map((c, i) => (
                <div key={c.code + i} className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${c.used ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                  <code dir="ltr" className={`text-xs font-mono font-bold truncate ${c.used ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>{c.code}</code>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => copy(c.code)} aria-label={`نسخ الكود ${c.code}`} title="نسخ" className="p-1 text-slate-400 hover:text-indigo-600 rounded-md">
                      {copied === c.code ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.used}
                        onChange={(e) => updateGoogleCodes(viewing.id, viewing.codes.map((x, j) => (j === i ? { ...x, used: e.target.checked } : x)))}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      اتستخدم
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between bg-slate-50 dark:bg-slate-950/60">
              <button
                onClick={() => { setEditingGoogleCodes(viewing); setViewingId(null); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Pencil className="w-4 h-4" /> تعديل
              </button>
              <button onClick={() => setViewingId(null)} className="px-5 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
