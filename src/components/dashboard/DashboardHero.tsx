import React from 'react';
import { useApp } from '../../context/AppContext';
import { Wifi, ArrowUpLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { formatEgp } from '../../utils/money';
import { useCountUp } from '../../utils/useCountUp';
import { WalletEntry } from '../../types';

// ---------- small building blocks ----------

const Sparkline: React.FC<{ values: number[]; color: string; id: string }> = ({ values, color, id }) => {
  const W = 96, H = 34, pad = 3;
  // With fewer than two real points draw a calm, flat line instead of a broken chart
  const data = values.length >= 2 ? values : [1, 1, 1, 1, 1, 1];
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    pad + (i * (W - pad * 2)) / (data.length - 1),
    values.length >= 2 ? H - pad - ((v - min) / span) * (H - pad * 2) : H / 2,
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="overflow-visible w-[52px] sm:w-24 h-auto shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} className="anim-fade" />
      {/* pathLength=1 lets one animation draw any line from start to end */}
      <path d={line} pathLength={1} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="anim-draw" />
    </svg>
  );
};

// Isometric blocks in golden and orange, bobbing gently like the reference banner
const BlocksIllustration: React.FC = () => (
  <svg viewBox="0 0 220 150" className="w-full h-full" aria-hidden="true">
    <defs>
      <linearGradient id="blkBlueTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fcd34d" /><stop offset="1" stopColor="#f59e0b" /></linearGradient>
      <linearGradient id="blkYellowTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde047" /><stop offset="1" stopColor="#facc15" /></linearGradient>
    </defs>
    <ellipse cx="112" cy="138" rx="86" ry="9" fill="#000" opacity="0.25" />
    <g className="anim-float" style={{ animationDelay: '0.2s' }}>
      <polygon points="70,60 104,42 138,60 104,78" fill="url(#blkBlueTop)" />
      <polygon points="70,60 104,78 104,116 70,98" fill="#d97706" />
      <polygon points="104,78 138,60 138,98 104,116" fill="#b45309" />
    </g>
    <g className="anim-float" style={{ animationDelay: '1.1s' }}>
      <polygon points="118,88 152,70 186,88 152,106" fill="url(#blkYellowTop)" />
      <polygon points="118,88 152,106 152,134 118,116" fill="#eab308" />
      <polygon points="152,106 186,88 186,116 152,134" fill="#ca8a04" />
    </g>
    <g className="anim-float" style={{ animationDelay: '2s' }}>
      <polygon points="22,92 52,77 82,92 52,107" fill="url(#blkBlueTop)" />
      <polygon points="22,92 52,107 52,132 22,117" fill="#d97706" />
      <polygon points="52,107 82,92 82,117 52,132" fill="#b45309" />
    </g>
    <g className="anim-float" style={{ animationDelay: '0.7s', animationDuration: '3.6s' }}>
      <ellipse cx="104" cy="30" rx="20" ry="8" fill="#fde047" />
      <rect x="84" y="22" width="40" height="8" fill="#eab308" />
      <ellipse cx="104" cy="22" rx="20" ry="8" fill="#fef08a" />
      <ellipse cx="104" cy="22" rx="12" ry="4.5" fill="none" stroke="#ca8a04" strokeWidth="1.5" opacity="0.7" />
    </g>
    <g className="anim-float" style={{ animationDelay: '1.6s', animationDuration: '5.2s' }}>
      <circle cx="170" cy="48" r="13" fill="none" stroke="#fde68a" strokeWidth="7" />
      <circle cx="170" cy="48" r="13" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="8 70" strokeLinecap="round" />
    </g>
  </svg>
);

const CurrencyDot: React.FC<{ label: string; bg: string }> = ({ label, bg }) => (
  <span className={`w-6 h-6 rounded-full ${bg} text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 -ms-1.5 first:ms-0`}>{label}</span>
);

// ---------- month maths for the two stat cards ----------

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const sumMonth = (entries: WalletEntry[], type: WalletEntry['type'], key: string) =>
  entries.filter((e) => e.type === type && e.date.startsWith(key)).reduce((s, e) => s + e.amountEgp, 0);

const series = (entries: WalletEntry[], type: WalletEntry['type']) =>
  entries
    .filter((e) => e.type === type)
    .sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt))
    .slice(-8)
    .map((e) => e.amountEgp);

const pctChange = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

const usdText = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface StatCardProps {
  title: string; egp: number; rate: number; change: number | null; color: string; good: 'up' | 'down';
  id: string; values: number[]; month: string; delay: number; onOpen: () => void; dots: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, egp, rate, change, color, good, id, values, month, delay, onOpen, dots }) => {
  const shownEgp = useCountUp(egp);
  const up = (change ?? 0) >= 0;
  return (
    <button
      onClick={onOpen}
      style={{ animationDelay: `${delay}s` }}
      className="anim-panel-in text-start p-4 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 shadow-sm dark:shadow-black/30 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-black/50 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-slate-600 dark:text-slate-200 min-w-0 truncate">{title}</span>
        <Sparkline values={values} color={color} id={id} />
      </div>
      <div className="mt-1 flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{usdText(shownEgp / (rate || 1))}</span>
        {change !== null ? (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold font-mono ${up === (good === 'up') ? 'text-emerald-500' : 'text-rose-500'}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        ) : (
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">أول شهر</span>
        )}
      </div>
      <span className="block text-[11px] font-mono font-bold text-slate-500 dark:text-slate-300 mt-0.5">= {formatEgp(shownEgp)}</span>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{month}</span>
        <span className="flex items-center">{dots}</span>
      </div>
    </button>
  );
};

export const DashboardHero: React.FC = () => {
  const {
    currentUser, setActiveTab, walletEntries, walletBalanceEgp, walletBalanceUsd, exchangeRates,
  } = useApp();

  const firstName = (currentUser?.name || '').split(' ')[0];
  const rate = exchangeRates.USD || 1;

  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const curKey = monthKey(now), prevKey = monthKey(prev);
  const monthName = now.toLocaleDateString('ar-EG', { month: 'long' });

  const inNow = sumMonth(walletEntries, 'deposit', curKey);
  const outNow = sumMonth(walletEntries, 'charge', curKey);
  const inChange = pctChange(inNow, sumMonth(walletEntries, 'deposit', prevKey));
  const outChange = pctChange(outNow, sumMonth(walletEntries, 'charge', prevKey));

  const balanceUsd = useCountUp(walletBalanceUsd, 1100);
  const balanceEgp = useCountUp(walletBalanceEgp, 1100);

  return (
    <div className="space-y-5">
      {/* Greeting and title (profile and bell are already in the top bar) */}
      <div className="min-w-0">
        <p className="text-sm text-slate-600 dark:text-slate-300 truncate">أهلاً، {firstName || 'بيك'}</p>
        <h1 className="text-slate-900 dark:text-white">لوحة التحكم</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Promotional banner */}
        <div className="relative overflow-hidden rounded-[28px] p-5 min-h-[168px] flex items-center bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-[#2a2e31] border border-slate-200/80 dark:border-white/5 shadow-sm dark:shadow-black/30">
          <div className="absolute -top-16 -start-10 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl anim-drift" aria-hidden="true" />
          <div className="relative z-10 max-w-[52%]">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">راقب مصروفاتك</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">كل اشتراك وكل جنيه في مكانه</p>
            <button
              onClick={() => setActiveTab('expenses')}
              className="mt-4 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-extrabold shadow-lg shadow-amber-500/30 hover:-translate-y-0.5 hover:shadow-amber-500/50 transition-all"
            >
              افتح
            </button>
          </div>
          <div className="absolute inset-y-0 end-0 w-[52%] flex items-center justify-center p-2">
            <BlocksIllustration />
          </div>
        </div>

        {/* Wallet card with the glass balance panel overlapping its bottom */}
        <div className="relative pb-[88px]">
          <div className="absolute -top-6 end-6 w-36 h-36 rounded-full bg-amber-300/50 dark:bg-amber-300/40 anim-drift" aria-hidden="true" />
          <div className="absolute top-14 start-3 w-32 h-32 rounded-full bg-amber-500/85 anim-drift" style={{ animationDelay: '-4s' }} aria-hidden="true" />

          <div className="anim-card-in relative sheen rounded-[26px] p-5 min-h-[168px] overflow-hidden border border-white/40 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 backdrop-blur-xl shadow-xl shadow-amber-600/30">
            <div className="flex items-start justify-between">
              <span className="text-lg font-extrabold italic tracking-wide text-amber-950">SABER</span>
              <Wifi className="w-6 h-6 text-amber-950/80 rotate-90" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-bold text-amber-950">محفظة الاشتراكات</p>
            <p className="mt-1 text-xs font-extrabold tracking-[0.25em] uppercase text-amber-950/90 truncate" dir="ltr">{currentUser?.name || 'SABER GROUP'}</p>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-xs font-extrabold text-amber-950" dir="ltr">1$ = {exchangeRates.USD} EGP</span>
              <button
                onClick={() => setActiveTab('wallet')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-950/15 hover:bg-amber-950/25 text-xs font-extrabold text-amber-950 transition-colors"
              >
                فتح المحفظة
              </button>
            </div>
          </div>

          <div className="anim-panel-in absolute inset-x-3 bottom-0 rounded-[24px] p-4 flex items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-white/10 shadow-2xl shadow-black/30">
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">الرصيد</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="anim-pop w-7 h-7 rounded-full bg-yellow-400 text-yellow-900 text-sm font-extrabold flex items-center justify-center shrink-0 shadow-inner" style={{ animationDelay: '0.9s' }}>$</span>
                <span className={`text-2xl font-extrabold font-mono truncate ${walletBalanceEgp < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                  {balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span className="block text-[11px] font-mono font-bold text-slate-500 dark:text-slate-300 mt-0.5">= {formatEgp(balanceEgp)}</span>
            </div>
            <button
              onClick={() => setActiveTab('wallet')}
              className="anim-ring shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-extrabold flex items-center gap-1 shadow-lg shadow-amber-500/30 transition-all"
            >
              عرض المزيد
              <ArrowUpLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Added vs. spent this month */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="المضاف" egp={inNow} rate={rate} change={inChange} color="#22c55e" good="up" id="sparkIn"
          values={series(walletEntries, 'deposit')} month={monthName} delay={0.65} onOpen={() => setActiveTab('wallet')}
          dots={(<><CurrencyDot label="$" bg="bg-emerald-500" /><CurrencyDot label="€" bg="bg-orange-500" /><CurrencyDot label="ج" bg="bg-amber-500" /></>)}
        />
        <StatCard
          title="المخصوم" egp={outNow} rate={rate} change={outChange} color="#ef4444" good="down" id="sparkOut"
          values={series(walletEntries, 'charge')} month={monthName} delay={0.78} onOpen={() => setActiveTab('expenses')}
          dots={(<><CurrencyDot label="$" bg="bg-rose-500" /><CurrencyDot label="€" bg="bg-violet-500" /><CurrencyDot label="ج" bg="bg-orange-500" /></>)}
        />
      </div>
    </div>
  );
};



