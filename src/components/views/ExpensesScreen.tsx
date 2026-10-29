import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { monthlySpendingHistory } from '../../data/mockData';
import { 
  TrendingUp, DollarSign, Users, Award, Download, 
  Filter, Calendar, FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { ExportReportModal } from '../modals/ExportReportModal';
import { costStats, formatUsd, isBilled, monthlyCost } from '../../utils/costs';
import { EgpHint } from '../shared/EgpHint';

export const ExpensesScreen: React.FC = () => {
  const { subscriptions, users, teams, aiTools, addToast, t } = useApp();

  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const activeSubs = subscriptions.filter(isBilled);
  const stats = costStats(subscriptions, users);
  const usdSubs = activeSubs.filter((s) => s.currency === '$' || s.currency === 'USD');

  // Spending by AI Tool Data for Donut Chart
  const COLORS = ['#f59e0b', '#ec4899', '#10b981', '#f59e0b', '#f59e0b', '#8b5cf6', '#64748b'];

  const toolSpendingData = aiTools.map((tool) => {
    const cost = usdSubs
      .filter((s) => s.toolId === tool.id || s.toolName.toLowerCase().includes(tool.name.toLowerCase()))
      .reduce((acc, s) => acc + monthlyCost(s), 0);
    return { name: tool.name, value: Math.round(cost * 100) / 100 };
  });

  // Team Spending Data
  const teamSpendingData = teams.map((tm) => {
    const cost = usdSubs
      .filter((s) => s.teamId === tm.id || s.teamName === tm.name)
      .reduce((acc, s) => acc + monthlyCost(s), 0);
    return { name: tm.name, cost: Math.round(cost * 100) / 100 };
  });
  const topTeam = [...teamSpendingData].sort((a, b) => b.cost - a.cost)[0];
  const topTeamShare = topTeam && stats.monthlyTotal ? Math.round((topTeam.cost / stats.monthlyTotal) * 100) : 0;

  const handleExportCSV = () => {
    const headers = 'Tool,Plan,Team,Cost,RenewalDate,Status\n';
    const rows = activeSubs
      .map((s) => `"${s.toolName}","${s.planName}","${s.teamName}",${s.cost},"${s.renewalDate}","${s.status}"`)
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Resource_Expenses_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();

    addToast('تم التصدير', 'تم تصدير تقرير المصروفات بصيغة CSV بنجاح');
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('expenses')}
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تحليل وتتبع مصروفات الذكاء الاصطناعي والتوقعات الميزانية.
          </p>
        </div>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs lg:text-sm rounded-xl shadow-xs transition-all hover:shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>تصدير التقرير (CSV / PDF)</span>
        </button>
      </div>

      {/* TOP STATISTICS (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">إجمالي الإنفاق الشهري</span>
          <span className="text-2xl lg:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">{formatUsd(stats.monthlyTotal)}</span>
          <EgpHint amount={stats.monthlyTotal} className="block text-xs" />
          <span className="text-[11px] text-slate-400 block mt-1">
            {stats.otherCurrencyCount > 0
              ? `بالدولار فقط · ${stats.otherCurrencyCount} اشتراك بعملة أخرى غير محسوب`
              : 'محدث بناءً على الاشتراكات النشطة'}
          </span>
        </div>

        <div className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">{t('totalYearlyProjection')}</span>
          <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{formatUsd(stats.yearlyTotal)}</span>
          <EgpHint amount={stats.yearlyTotal} className="block text-xs" />
          <span className="text-[11px] text-slate-400 block mt-1">توقع التكلفة السنوية المباشرة</span>
        </div>

        <div className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">{t('avgCostPerUser')}</span>
          <span className="text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.avgPerUser === null ? '—' : formatUsd(stats.avgPerUser)}
          </span>
          {stats.avgPerUser !== null && <EgpHint amount={stats.avgPerUser} className="block text-xs" />}
          <span className="text-[11px] text-slate-400 block mt-1">
            {stats.payingUsers
              ? `شهرياً · مقسوم على ${stats.payingUsers} مستخدم نشط عليه اشتراكات`
              : 'لا يوجد مستخدمون معيّنون على اشتراكات'}
          </span>
        </div>

        <div className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">{t('highestSpendingTeam')}</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white block truncate">
            {topTeam && topTeam.cost > 0 ? topTeam.name : '—'}
          </span>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-1">
            {topTeam && topTeam.cost > 0 ? `${formatUsd(topTeam.cost)}/شهرياً (${topTeamShare}%)` : 'لا يوجد إنفاق مسجل على الفرق'}
          </span>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spending Trend */}
        <div className="lg:col-span-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:scale-[1.01] transition-all duration-300 ease-out">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">مسار الإنفاق التاريخي</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">حركة التكاليف والمصروفات خلال الأشهر السابقة</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpendingHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip formatter={(val) => [`$${val}`, 'التكلفة']} />
                <Area type="monotone" dataKey="spending" stroke="#d97706" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart Spending By Tool */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 dark:bg-slate-900 dark:border-slate-800">
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('spendingByTool')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">توزيع ميزانية الذكاء الاصطناعي حسب الأداة</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={toolSpendingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {toolSpendingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`$${val}`, 'الإنفاق']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cost Per User Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4 dark:bg-slate-900 dark:border-slate-800">
        <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">تكلفة الذكاء الاصطناعي لكل مستخدم</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">حساب متوسط تكلفة الموارد المخصصة لكل موظف في المؤسسة</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-700 font-bold uppercase text-[11px] dark:bg-slate-950/60 dark:border-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3 text-start">المستخدم</th>
                <th className="p-3 text-start">الفريق</th>
                <th className="p-3 text-center">عدد الأدوات</th>
                <th className="p-3 text-end">التكلفة الشهرية المقدرة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium dark:divide-slate-800">
              {users.map((usr) => {
                const uSubs = activeSubs.filter(s => s.assignedUserIds.includes(usr.id));
                // Split each subscription only between users that actually exist
                const est = uSubs
                  .filter((s) => usdSubs.includes(s))
                  .reduce((acc, s) => acc + monthlyCost(s) / (s.assignedUserIds.filter((id) => users.some((u) => u.id === id)).length || 1), 0);

                return (
                  <tr key={usr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img src={usr.avatar} alt={usr.name} className="w-7 h-7 rounded-full object-cover" />
                        <span className="font-bold text-slate-900 dark:text-white">{usr.name}</span>
                      </div>
                    </td>
                    <td className="p-3">{usr.teamName}</td>
                    <td className="p-3 text-center font-mono font-bold">{uSubs.length}</td>
                    <td className="p-3 text-end font-mono font-bold text-indigo-600">{formatUsd(Math.round(est * 100) / 100)}/mo</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

