import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { monthlySpendingHistory } from '../../data/mockData';
import {
  CreditCard, DollarSign, CalendarClock, Users,
  Plus, ArrowUpRight, Eye
} from 'lucide-react';
import { DashboardHero } from '../dashboard/DashboardHero';
import { costStats } from '../../utils/costs';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { KpiDetailModal, KpiModalType } from '../modals/KpiDetailModal';

export const DashboardScreen: React.FC = () => {
  const { 
    subscriptions, 
    users, 
    teams, 
    activities,
    setIsAddWizardOpen,
    setSelectedSubscriptionForDetails,
    setActiveTab, 
    t 
  } = useApp();

  const [spendingFilter, setSpendingFilter] = useState<'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [selectedKpiModal, setSelectedKpiModal] = useState<KpiModalType>(null);

  // Active Subscriptions Calculation
  const activeSubs = subscriptions.filter(s => s.status !== 'Archived');
  // Same figure as the expenses page: dollars only, per month, billed subscriptions only
  const totalCost = costStats(subscriptions, users).monthlyTotal;

  // Dynamic Chart Datasets calculated directly from subscriptions
  const monthlySpendingHistory = [
    { label: 'يناير', spending: 0 },
    { label: 'فبراير', spending: 0 },
    { label: 'مارس', spending: 0 },
    { label: 'أبريل', spending: 0 },
    { label: 'مايو', spending: 0 },
    { label: 'يونيو', spending: 0 },
    { label: 'يوليو', spending: 0 },
    { label: 'أغسطس', spending: 0 },
    { label: 'سبتمبر', spending: totalCost }
  ];

  const quarterlySpendingHistory = [
    { label: 'الربع الأول (Q1)', spending: 0 },
    { label: 'الربع الثاني (Q2)', spending: 0 },
    { label: 'الربع الثالث (Q3)', spending: totalCost },
    { label: 'الربع الرابع (Q4)', spending: totalCost },
  ];

  const yearlySpendingHistory = [
    { label: 'عام 2024', spending: 0 },
    { label: 'عام 2025', spending: 0 },
    { label: '2026 (الحالي)', spending: totalCost * 12 },
    { label: '2027 (المتوقع)', spending: totalCost * 12 },
  ];

  const currentChartData = spendingFilter === 'Monthly' 
    ? monthlySpendingHistory
    : spendingFilter === 'Quarterly'
    ? quarterlySpendingHistory
    : yearlySpendingHistory;

  const chartSub = spendingFilter === 'Monthly'
    ? 'تطور حجم الإنفاق الشهري للذكاء الاصطناعي على مدار الأشهر'
    : spendingFilter === 'Quarterly'
    ? 'إجمالي التكاليف والميزانية الموزعة على الأرباع السنوية (Q1 - Q4)'
    : 'مسار النمو السنوي والتوقع المباشر للسنوات القادمة';
  
  // Upcoming Renewals
  const upcomingRenewals = activeSubs
    .filter(s => s.status === 'Active' || s.status === 'Expiring Soon')
    .slice(0, 3);

  // Cost by Team Data
  const teamCostData = teams.length === 0 ? [] : teams.map(tm => ({
    name: tm.name,
    cost: activeSubs.filter(s => s.teamId === tm.id || s.teamName === tm.name).reduce((acc, s) => acc + s.cost, 0)
  }));

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Greeting, banner, wallet card and this month's added/spent */}
      <DashboardHero />

      {/* TOP STATISTICS (4 KPI CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Subscriptions */}
        <div
          onClick={() => setSelectedKpiModal('SUBSCRIPTIONS')}
          className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer group"
          title="اضغط لعرض تفاصيل الاشتراكات"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              {t('totalSubscriptions')}
            </span>
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white font-mono group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {activeSubs.length}
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block mt-1">
              {t('addedThisMonth')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Monthly Cost */}
        <div
          onClick={() => setSelectedKpiModal('COST')}
          className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer group"
          title="اضغط لعرض تفاصيل وتوزيع المصروفات"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              {t('monthlyCost')}
            </span>
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white font-mono group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              ${totalCost}
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block mt-1">
              {t('fromLastMonth')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Upcoming Renewals */}
        <div
          onClick={() => setSelectedKpiModal('RENEWALS')}
          className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer group"
          title="اضغط لعرض تفاصيل التجديدات القادمة"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              {t('upcomingRenewals')}
            </span>
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white font-mono group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {upcomingRenewals.length}
            </span>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block mt-1">
              {t('nextRenewalIn')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <CalendarClock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Total Users */}
        <div
          onClick={() => setSelectedKpiModal('USERS')}
          className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer group"
          title="اضغط لعرض تفاصيل توزيع الموظفين والفرق"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              {t('totalUsers')}
            </span>
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white font-mono group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {users.length}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-1">
              {t('acrossTeams')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* UPCOMING RENEWALS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upcoming Renewals Panel */}
        <div className="lg:col-span-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-[0_0_25px_rgba(99,102,241,0.22)] hover:scale-[1.01] transition-all duration-300 ease-out">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('upcomingRenewals')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">الاشتراكات المقرر تجديدها خلال هذا الشهر</p>
            </div>
            <button
              onClick={() => setActiveTab('renewals')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors flex items-center gap-1"
            >
              <span>{t('viewAllRenewals')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcomingRenewals.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">لا توجد تجديدات مسجلة حالياً.</p>
                <button
                  onClick={() => setIsAddWizardOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة أول اشتراك</span>
                </button>
              </div>
            ) : (
              upcomingRenewals.map((s) => (
                <div key={s.id} className="py-3 px-2 rounded-xl flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 hover:scale-[1.01] hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-800 dark:text-white shrink-0">
                      {s.toolName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedSubscriptionForDetails(s)}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-start"
                        >
                          {s.toolName}
                        </button>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {s.planName}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        التجديد: <strong className="font-mono text-slate-700 dark:text-slate-300">{s.renewalDate}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">${s.cost}/شهرياً</span>
                    <button
                      onClick={() => setSelectedSubscriptionForDetails(s)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                      title={t('view')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 hover:shadow-[0_0_25px_rgba(99,102,241,0.22)] hover:scale-[1.01] transition-all duration-300 ease-out">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('recentActivityTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">آخر التغييرات التي تمت داخل المنصة</p>
          </div>

          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">لا توجد نشاطات أو تغييرات مسجلة بعد.</p>
            ) : (
              activities.slice(0, 4).map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs p-2 rounded-xl hover:bg-slate-50/80 dark:hover:bg-slate-800/60 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
                  <img src={act.userAvatar} alt={act.userName} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white">{act.userName}</span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">{act.action}</span>
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{act.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MONTHLY SPENDING & COST BY TEAM CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Spending Chart */}
        <div className="lg:col-span-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 hover:shadow-[0_0_25px_rgba(99,102,241,0.22)] hover:scale-[1.01] transition-all duration-300 ease-out">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {spendingFilter === 'Monthly' && 'مسار الإنفاق الشهري'}
                {spendingFilter === 'Quarterly' && 'مسار الإنفاق الربعي (Q1 - Q4)'}
                {spendingFilter === 'Yearly' && 'مسار النمو والتوقعات السنوية'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{chartSub}</p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-slate-700/80">
              {(['Monthly', 'Quarterly', 'Yearly'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSpendingFilter(filter)}
                  className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 font-extrabold ${
                    spendingFilter === filter
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {filter === 'Monthly' ? 'شهري' : filter === 'Quarterly' ? 'ربعي' : 'سنوي'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(value) => [`$${value}`, 'التكلفة / الإنفاق']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="spending" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorSpending)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost By Team Bar Chart */}
        <div className="lg:col-span-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 hover:shadow-[0_0_25px_rgba(99,102,241,0.22)] hover:scale-[1.01] transition-all duration-300 ease-out">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('costByTeamTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">معدل استهلاك كل فريق لميزانية الذكاء الاصطناعي</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamCostData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(value) => [`$${value}`, 'التكلفة']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="cost" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* KPI DETAIL BREAKDOWN MODAL */}
      <KpiDetailModal
        type={selectedKpiModal}
        onClose={() => setSelectedKpiModal(null)}
      />
    </div>
  );
};

