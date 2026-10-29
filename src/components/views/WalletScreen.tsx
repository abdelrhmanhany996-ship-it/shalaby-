import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw, Trash2, Save, Pencil, X, SlidersHorizontal } from 'lucide-react';
import { currencyCode, formatEgp, formatMoney, toEgp } from '../../utils/money';

const CURRENCIES = [
  { value: 'ج.م', label: 'جنيه مصري (ج.م)' },
  { value: '$', label: 'دولار ($)' },
  { value: 'EUR', label: 'يورو (EUR)' },
  { value: 'SAR', label: 'ريال سعودي (SAR)' },
];

const card = 'p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs';
const input = 'w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600';
const label = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';

export const WalletScreen: React.FC = () => {
  const {
    walletEntries, walletBalanceEgp, walletBalanceUsd, exchangeRates,
    addDeposit, deleteWalletEntry, saveExchangeRates, refreshExchangeRates, setWalletBalance,
  } = useApp();

  // Edit-balance form
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceTarget, setBalanceTarget] = useState('');
  const [balanceCurrency, setBalanceCurrency] = useState('$');
  const [balanceNote, setBalanceNote] = useState('');
  const openBalanceEdit = () => {
    setBalanceCurrency('$');
    setBalanceTarget(String(walletBalanceUsd));
    setBalanceNote('');
    setIsEditingBalance(true);
  };
  const saveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(balanceTarget);
    if (balanceTarget.trim() === '' || isNaN(value)) return;
    setWalletBalance(value, balanceCurrency, balanceNote);
    setIsEditingBalance(false);
  };

  const today = new Date().toISOString().substring(0, 10);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ج.م');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const [rates, setRates] = useState({ USD: exchangeRates.USD, EUR: exchangeRates.EUR, SAR: exchangeRates.SAR });
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    setRates({ USD: exchangeRates.USD, EUR: exchangeRates.EUR, SAR: exchangeRates.SAR });
  }, [exchangeRates]);

  const deposits = walletEntries.filter((e) => e.type === 'deposit');
  const charges = walletEntries.filter((e) => e.type === 'charge');
  const adjustments = walletEntries.filter((e) => e.type === 'adjust');
  const totalIn = deposits.reduce((s, e) => s + e.amountEgp, 0);
  const totalOut = charges.reduce((s, e) => s + e.amountEgp, 0);
  const usd = (egp: number) => `$${(egp / (exchangeRates.USD || 1)).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  const preview = toEgp(Number(amount) || 0, currency, exchangeRates);

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      setError('اكتب مبلغ أكبر من صفر');
      return;
    }
    addDeposit(value, currency, note, date || today);
    setAmount('');
    setNote('');
    setError('');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshExchangeRates();
    setRefreshing(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div>
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Wallet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          محفظة الاشتراكات
        </h1>
        <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
          سجّل كل مبلغ بتحطه للاشتراكات، وكل اشتراك جديد بيتخصم من الرصيد تلقائياً.
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={card}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">الرصيد الحالي</span>
            <button
              onClick={openBalanceEdit}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
            >
              <Pencil className="w-3.5 h-3.5" /> تعديل الرصيد
            </button>
          </div>
          <span className={`text-2xl lg:text-3xl font-extrabold font-mono block ${walletBalanceEgp < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {usd(walletBalanceEgp)}
          </span>
          <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300 block mt-0.5">
            = {formatEgp(walletBalanceEgp)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            بسعر 1$ = {exchangeRates.USD} ج.م
            {walletBalanceEgp < 0 && <span className="font-bold text-red-500"> · الرصيد بالسالب</span>}
          </span>
        </div>
        <div className={card}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">إجمالي المبالغ المضافة</span>
          <span className="text-2xl lg:text-3xl font-extrabold font-mono text-slate-900 dark:text-white block">{usd(totalIn)}</span>
          <span className="text-sm font-bold font-mono text-slate-500 dark:text-slate-400 block mt-0.5">= {formatEgp(totalIn)}</span>
          <span className="text-[11px] text-slate-400 block mt-1">{deposits.length} إيداع{adjustments.length > 0 && ` · ${adjustments.length} تعديل رصيد`}</span>
        </div>
        <div className={card}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">إجمالي المخصوم للاشتراكات</span>
          <span className="text-2xl lg:text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400 block">{usd(totalOut)}</span>
          <span className="text-sm font-bold font-mono text-slate-500 dark:text-slate-400 block mt-0.5">= {formatEgp(totalOut)}</span>
          <span className="text-[11px] text-slate-400 block mt-1">{charges.length} عملية خصم</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Add money */}
        <form onSubmit={handleDeposit} className={`${card} lg:col-span-2 space-y-3`}>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            إضافة مبلغ للاشتراكات
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={label}>المبلغ *</label>
              <input
                type="number" min="0" step="0.01" dir="ltr" value={amount}
                onChange={(e) => { setAmount(e.target.value); if (error) setError(''); }}
                aria-invalid={!!error}
                className={`${input} font-mono font-bold ${error ? 'border-red-500' : ''}`}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={label}>العملة</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${input} font-semibold`}>
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={label}>التاريخ</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${input} font-mono`} />
            </div>
          </div>
          <div>
            <label className={label}>ملاحظة</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: تحويل من الخزنة، فيزا الشركة..." className={input} />
          </div>
          {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {currencyCode(currency) !== 'EGP' && Number(amount) > 0 && <>يساوي <b className="font-mono text-slate-800 dark:text-slate-200">{formatEgp(preview)}</b> · </>}
              الرصيد بعد الإضافة: <b className="font-mono text-emerald-600 dark:text-emerald-400">{formatEgp(walletBalanceEgp + preview)}</b>
            </span>
            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              إضافة للرصيد
            </button>
          </div>
        </form>

        {/* Exchange rates */}
        <div className={`${card} space-y-3`}>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">سعر الصرف (بالجنيه)</h3>
          {(['USD', 'EUR', 'SAR'] as const).map((code) => (
            <div key={code} className="flex items-center gap-2">
              <span className="w-14 text-xs font-bold font-mono text-slate-600 dark:text-slate-300">1 {code}</span>
              <input
                type="number" min="0" step="0.01" dir="ltr" value={rates[code]}
                onChange={(e) => setRates((r) => ({ ...r, [code]: Number(e.target.value) }))}
                aria-label={`سعر ${code} بالجنيه`}
                className={`${input} font-mono`}
              />
              <span className="text-xs text-slate-400">ج.م</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => saveExchangeRates(rates)}
              className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> حفظ
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> السعر الحالي
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            {exchangeRates.updatedAt
              ? `آخر تحديث: ${new Date(exchangeRates.updatedAt).toLocaleString('ar-EG')}`
              : 'سعر تقريبي — اضغط "السعر الحالي" أو اكتبه بنفسك'}
            . الحركات القديمة بتفضل بسعر يومها.
          </p>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">سجل الحركات ({walletEntries.length})</h3>
        </div>
        {walletEntries.length === 0 ? (
          <p className="p-10 text-center text-xs text-slate-400">لسه مفيش حركات. ضيف أول مبلغ من فوق.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                <tr>
                  <th className="p-3 text-start">التاريخ</th>
                  <th className="p-3 text-start">النوع</th>
                  <th className="p-3 text-start">البيان</th>
                  <th className="p-3 text-start">المبلغ</th>
                  <th className="p-3 text-start">بالجنيه</th>
                  <th className="p-3 text-end"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {walletEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono whitespace-nowrap">{e.date}</td>
                    <td className="p-3">
                      {e.type === 'deposit' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          <ArrowDownCircle className="w-3 h-3" /> إضافة
                        </span>
                      ) : e.type === 'adjust' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                          <SlidersHorizontal className="w-3 h-3" /> تعديل رصيد
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                          <ArrowUpCircle className="w-3 h-3" /> خصم اشتراك
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-slate-900 dark:text-white font-semibold">{e.note}</span>
                      {e.createdBy && <span className="block text-[10px] text-slate-400">بواسطة {e.createdBy}</span>}
                    </td>
                    <td className="p-3 font-mono whitespace-nowrap">{formatMoney(Math.abs(e.amount), e.currency)}</td>
                    <td className={`p-3 font-mono font-bold whitespace-nowrap ${(e.type === 'charge' ? -e.amountEgp : e.amountEgp) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {(e.type === 'charge' ? -e.amountEgp : e.amountEgp) >= 0 ? '+' : '−'}{formatEgp(Math.abs(e.amountEgp))}
                      {currencyCode(e.currency) !== 'EGP' && <span className="block text-[10px] font-normal text-slate-400">بسعر {e.rate}</span>}
                    </td>
                    <td className="p-3 text-end">
                      <button
                        onClick={() => {
                          const what = e.type === 'deposit' ? 'المبلغ ده من الرصيد' : e.type === 'adjust' ? 'تعديل الرصيد ده (الرصيد هيرجع زي ما كان قبله)' : 'الخصم ده (المبلغ هيرجع للرصيد)';
                          if (window.confirm(`هل تريد حذف ${what}؟\n${e.note} — ${e.amount} ${e.currency}`)) deleteWalletEntry(e.id);
                        }}
                        aria-label={`حذف الحركة ${e.note}`}
                        title="حذف الحركة"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit balance */}
      {isEditingBalance && (() => {
        const targetEgp = toEgp(Number(balanceTarget) || 0, balanceCurrency, exchangeRates);
        const diff = Math.round((targetEgp - walletBalanceEgp) * 100) / 100;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <form onSubmit={saveBalance} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> تعديل الرصيد الحالي
                </h3>
                <button type="button" onClick={() => setIsEditingBalance(false)} aria-label="إغلاق" className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  الرصيد دلوقتي: <b className="font-mono text-slate-800 dark:text-slate-200">{usd(walletBalanceEgp)} = {formatEgp(walletBalanceEgp)}</b>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className={label}>الرصيد الصحيح *</label>
                    <input
                      type="number" step="0.01" dir="ltr" autoFocus value={balanceTarget}
                      onChange={(e) => setBalanceTarget(e.target.value)}
                      aria-label="الرصيد الصحيح"
                      className={`${input} font-mono font-bold`}
                    />
                  </div>
                  <div>
                    <label className={label}>العملة</label>
                    <select
                      value={balanceCurrency}
                      onChange={(e) => {
                        const next = e.target.value;
                        // Convert the typed figure so switching currency doesn't change the meaning
                        const egp = toEgp(Number(balanceTarget) || 0, balanceCurrency, exchangeRates);
                        const rate = next === 'ج.م' ? 1 : exchangeRates.USD || 1;
                        setBalanceTarget(String(Math.round((egp / rate) * 100) / 100));
                        setBalanceCurrency(next);
                      }}
                      className={`${input} font-semibold`}
                    >
                      <option value="$">دولار ($)</option>
                      <option value="ج.م">جنيه (ج.م)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={label}>السبب</label>
                  <input type="text" value={balanceNote} onChange={(e) => setBalanceNote(e.target.value)} placeholder="مثال: مطابقة مع كشف الحساب" className={input} />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  {balanceCurrency !== 'ج.م' && (
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">يساوي بالجنيه</span><b className="font-mono text-slate-900 dark:text-white">{formatEgp(targetEgp)}</b></div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">الفرق اللي هيتسجل</span>
                    <b className={`font-mono ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{diff >= 0 ? '+' : '−'}{formatEgp(Math.abs(diff))}</b>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">الفرق بيتسجل كحركة "تعديل رصيد" في السجل، ولو حذفتها الرصيد يرجع زي ما كان.</p>
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-950/60">
                <button type="button" onClick={() => setIsEditingBalance(false)} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">إلغاء</button>
                <button type="submit" disabled={diff === 0} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50">حفظ الرصيد</button>
              </div>
            </form>
          </div>
        );
      })()}
    </div>
  );
};
