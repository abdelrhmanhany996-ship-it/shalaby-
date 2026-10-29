import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Ticket, Minus, Plus, ChevronDown, Check, Wallet } from 'lucide-react';
import { ToolIcon } from '../shared/ToolIcon';
import { colorFor } from '../../utils/avatar';
import { currencyCode, formatEgp, formatMoney, toEgp } from '../../utils/money';

const field = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-colors';
const label = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5';

// Suppliers the codes are usually bought from; "أخرى" lets you type any other name
export const SUPPLIERS = ['DRIFFLE', 'Z2U', 'MAADS'];
const OTHER = '__other__';

const PLANS = [
  { value: 'pro' as const, title: 'Google AI Pro', sub: 'عادي', accent: 'sky' },
  { value: 'plus' as const, title: 'Google AI Plus', sub: 'بلس', accent: 'purple' },
];

const CURRENCIES = [
  { value: 'ج.م', label: 'ج.م' },
  { value: '$', label: '$' },
  { value: 'EUR', label: '€' },
  { value: 'SAR', label: 'SAR' },
];

const Step: React.FC<{ n: number; title: string; hint?: string; children: React.ReactNode }> = ({ n, title, hint, children }) => (
  <section className="space-y-2.5">
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">{n}</span>
      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h4>
      {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
    </div>
    {children}
  </section>
);

export const AddGoogleCodesModal: React.FC = () => {
  const {
    isGoogleCodesModalOpen, setIsGoogleCodesModalOpen, addGoogleCodes, walletBalanceEgp, exchangeRates,
    editingGoogleCodes, setEditingGoogleCodes, updateGoogleCodeBatch, googleCodeBatches,
  } = useApp();
  const editing = editingGoogleCodes;

  const today = new Date().toISOString().substring(0, 10);
  const [plan, setPlan] = useState<'pro' | 'plus'>('pro');
  const [unitPrice, setUnitPrice] = useState('');
  const [currency, setCurrency] = useState('ج.م');
  const [quantity, setQuantity] = useState('1');
  const [supplier, setSupplier] = useState<string>('');   // one of SUPPLIERS, a name used before, or OTHER
  const [customSupplier, setCustomSupplier] = useState('');
  const [codesText, setCodesText] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [error, setError] = useState('');

  // Editing fills the form with the purchase's current values
  useEffect(() => {
    if (!editing) return;
    setPlan(editing.plan);
    setUnitPrice(String(editing.unitPrice));
    setCurrency(editing.currency);
    setQuantity(String(editing.quantity));
    setSupplier(editing.supplier || '');
    setCustomSupplier('');
    setCodesText(editing.codes.map((c) => c.code).join('\n'));
    setDate(editing.date);
    setNote(editing.note || '');
    setMoreOpen(editing.codes.length > 0 || !!editing.note);
    setError('');
  }, [editing]);

  if (!isGoogleCodesModalOpen && !editing) return null;

  // Names typed under "أخرى" before come back as one-tap choices
  const usedSuppliers = Array.from(new Set(googleCodeBatches.map((b) => b.supplier).filter((s): s is string => !!s && !SUPPLIERS.includes(s))));
  const supplierName = supplier === OTHER ? customSupplier.trim() : supplier;

  const pastedCodes = Array.from(new Set(codesText.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean)));
  // When codes are pasted, their number is the count
  const count = pastedCodes.length || Math.max(0, Math.floor(Number(quantity) || 0));
  const price = Number(unitPrice) || 0;
  const total = Math.round(price * count * 100) / 100;
  const totalEgp = toEgp(total, currency, exchangeRates);
  // When editing, the old charge comes back before the new one is taken
  const oldTotalEgp = editing ? toEgp(editing.unitPrice * editing.quantity, editing.currency, exchangeRates) : 0;
  // A purchase saved before charges were linked to it doesn't touch the wallet when edited
  const after = editing && !editing.walletEntryId ? walletBalanceEgp : walletBalanceEgp + oldTotalEgp - totalEgp;

  const close = () => {
    setIsGoogleCodesModalOpen(false);
    setEditingGoogleCodes(null);
    setSupplier('');
    setCustomSupplier('');
    setUnitPrice('');
    setQuantity('1');
    setCodesText('');
    setNote('');
    setMoreOpen(false);
    setError('');
  };

  const step = (delta: number) => {
    if (pastedCodes.length) return;
    setQuantity(String(Math.max(1, (Math.floor(Number(quantity)) || 1) + delta)));
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (price <= 0) return setError('اكتب سعر الكود');
    if (count <= 0) return setError('اكتب عدد الأكواد');
    // Older purchases were saved without a supplier, so editing one may leave it empty
    const supplierOptional = !!editing && !editing.supplier;
    if (!supplierName && !supplierOptional) return setError(supplier === OTHER ? 'اكتب اسم المورد' : 'اختار المورد اللي اشتريت منه');
    // Keep the "used" mark of codes that were already there
    const codes = pastedCodes.map((code) => editing?.codes.find((c) => c.code === code) || { code, used: false });
    const data = {
      plan, unitPrice: price, currency, quantity: count, codes, date: date || today, note: note.trim(),
      ...(supplierName ? { supplier: supplierName } : {}),
    };
    if (editing) updateGoogleCodeBatch(editing.id, data);
    else addGoogleCodes(data);
    close();
  };

  const chip = (selected: boolean) =>
    `flex items-center gap-2 ps-1.5 pe-3.5 py-1.5 rounded-full border text-xs font-extrabold transition-all ${
      selected
        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 ring-2 ring-indigo-600/25'
        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-900 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between gap-3 bg-gradient-to-l from-indigo-600 to-violet-600 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0"><Ticket className="w-5 h-5" /></span>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold leading-tight">{editing ? 'تعديل أكواد Google' : 'إضافة أكواد Google'}</h3>
              <p className="text-[11px] text-white/75">تمن الأكواد بيتخصم من محفظة الاشتراكات</p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="إغلاق" className="p-2 rounded-xl text-white/80 hover:bg-white/15 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* 1. Plan */}
          <Step n={1} title="نوع الكود">
            <div className="grid grid-cols-2 gap-3">
              {PLANS.map((p) => {
                const on = plan === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlan(p.value)}
                    aria-pressed={on}
                    className={`relative p-3.5 rounded-2xl border-2 flex items-center gap-3 text-start transition-all ${
                      on
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <span className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <ToolIcon name="Gemini" size={28} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">{p.title}</span>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${p.accent === 'purple' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'}`}>{p.sub}</span>
                    </span>
                    {on && <span className="absolute top-2 end-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></span>}
                  </button>
                );
              })}
            </div>
          </Step>

          {/* 2. Price and count */}
          <Step n={2} title="السعر والعدد">
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <label className={label}>سعر الكود الواحد *</label>
                <input
                  type="number" min="0" step="0.01" dir="ltr" inputMode="decimal" placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => { setUnitPrice(e.target.value); setError(''); }}
                  className={`${field} text-base font-mono font-extrabold`}
                />
              </div>
              <div className="col-span-2">
                <label className={label}>العدد *</label>
                <div className={`flex items-stretch rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 overflow-hidden ${pastedCodes.length ? 'opacity-60' : ''}`}>
                  <button type="button" onClick={() => step(-1)} disabled={!!pastedCodes.length} aria-label="تقليل العدد" className="px-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed"><Minus className="w-4 h-4" /></button>
                  <input
                    type="number" min="1" step="1" dir="ltr" inputMode="numeric"
                    value={pastedCodes.length ? pastedCodes.length : quantity}
                    disabled={!!pastedCodes.length}
                    onChange={(e) => { setQuantity(e.target.value); setError(''); }}
                    aria-label="عدد الأكواد"
                    className="w-full min-w-0 py-2.5 text-center text-base font-mono font-extrabold bg-transparent text-slate-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button type="button" onClick={() => step(1)} disabled={!!pastedCodes.length} aria-label="زيادة العدد" className="px-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            <div>
              <label className={label}>العملة</label>
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 gap-1" role="group" aria-label="العملة">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCurrency(c.value)}
                    aria-pressed={currency === c.value}
                    className={`min-w-[52px] px-3 py-1.5 rounded-lg text-xs font-extrabold font-mono transition-all ${
                      currency === c.value ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-200 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </Step>

          {/* 3. Supplier */}
          <Step n={3} title="اشتريت من مين؟" hint={editing && !editing.supplier ? '(اختياري)' : undefined}>
            <div className="flex flex-wrap gap-2">
              {[...SUPPLIERS, ...usedSuppliers].map((s) => (
                <button key={s} type="button" onClick={() => { setSupplier(s); setError(''); }} aria-pressed={supplier === s} className={chip(supplier === s)}>
                  <span className="w-6 h-6 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center shrink-0" style={{ backgroundColor: colorFor(s) }}>
                    {Array.from(s)[0].toUpperCase()}
                  </span>
                  <span className="font-mono">{s}</span>
                </button>
              ))}
              <button type="button" onClick={() => { setSupplier(OTHER); setError(''); }} aria-pressed={supplier === OTHER} className={chip(supplier === OTHER)}>
                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0"><Plus className="w-3.5 h-3.5" /></span>
                أخرى
              </button>
            </div>
            {supplier === OTHER && (
              <input
                type="text"
                autoFocus
                value={customSupplier}
                onChange={(e) => { setCustomSupplier(e.target.value); setError(''); }}
                placeholder="اكتب اسم المورد"
                aria-label="اسم المورد"
                className={`${field} font-bold`}
              />
            )}
          </Step>

          {/* Extra details, folded away until needed */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className="w-full px-4 py-3 flex items-center justify-between gap-2 text-start hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span>
                <span className="block text-sm font-extrabold text-slate-900 dark:text-white">تفاصيل إضافية</span>
                <span className="block text-[11px] text-slate-400">الأكواد نفسها، تاريخ الشراء، ملاحظة (اختياري)</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {pastedCodes.length > 0 && <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">{pastedCodes.length} كود</span>}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {moreOpen && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800">
                <div className="pt-3">
                  <label className={label}>الأكواد نفسها</label>
                  <textarea
                    rows={4}
                    dir="ltr"
                    value={codesText}
                    onChange={(e) => setCodesText(e.target.value)}
                    placeholder={'كود في كل سطر\nABCD-1234-EFGH\nIJKL-5678-MNOP'}
                    className={`${field} font-mono text-xs`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {pastedCodes.length ? `${pastedCodes.length} كود — العدد اتحسب من الأكواد` : 'لو لصقت الأكواد، العدد هيتحسب لوحده.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>تاريخ الشراء</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} font-mono`} />
                  </div>
                  <div>
                    <label className={label}>ملاحظة</label>
                    <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" className={field} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer: what it costs and what is left */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-5 pt-3 pb-4 space-y-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {error && <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-[11px] text-slate-400">الإجمالي ({count} × {formatMoney(price, currency)})</span>
              <span className="block text-lg font-extrabold font-mono text-slate-900 dark:text-white leading-tight">{formatMoney(total, currency)}</span>
              {currencyCode(currency) !== 'EGP' && <span className="block text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">= {formatEgp(totalEgp)}</span>}
            </div>
            <div className="text-end shrink-0">
              <span className="flex items-center justify-end gap-1 text-[11px] text-slate-400"><Wallet className="w-3.5 h-3.5" /> الرصيد بعد الخصم</span>
              <span className={`block text-sm font-extrabold font-mono ${after < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatEgp(after)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={close} className="px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition-colors">إلغاء</button>
            <button type="submit" className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-extrabold rounded-xl shadow-lg shadow-indigo-600/25 transition-all">
              {editing ? 'حفظ التعديل' : 'حفظ وخصم من المحفظة'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
