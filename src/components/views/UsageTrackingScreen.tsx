import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Activity, Users, Filter, BarChart3, Clock, AlertTriangle } from 'lucide-react';

export const UsageTrackingScreen: React.FC = () => {
  const { usageRecords, subscriptions, t } = useApp();
  const [filterTool, setFilterTool] = useState('All');

  const filtered = usageRecords.filter(u => filterTool === 'All' || u.toolName === filterTool);

  const activeCount = usageRecords.filter(u => u.status === 'active').length;
  const lowUsageCount = usageRecords.filter(u => u.status === 'low_usage').length;
  const inactiveCount = usageRecords.filter(u => u.status === 'inactive').length;
  const utilizationRate = Math.round((activeCount / (usageRecords.length || 1)) * 100);

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div>
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          تتبع الاستهلاك والاستخدام (Usage Tracking)
        </h1>
        <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
          رصد نشاط الموظفين والفرق على أدوات الذكاء الاصطناعي لحساب متوسط التكلفة ومعدلات التفاعل الفعلية.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">معدل الاستخدام الفعلي (Utilization)</span>
          <span className="text-2xl font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{utilizationRate}%</span>
          <span className="text-[11px] text-emerald-600 block mt-1">{activeCount} موظف نشط يومياً</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">المستخدمون النشطون</span>
          <span className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{activeCount}</span>
          <span className="text-[11px] text-slate-400 block mt-1">تفاعل مستمر خلال 30 يوماً</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">استخدام منخفض (Low Usage)</span>
          <span className="text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400">{lowUsageCount}</span>
          <span className="text-[11px] text-amber-600 block mt-1">أقل من 5 تفاعلات شهرياً</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">تراخيص خاملة (Inactive)</span>
          <span className="text-2xl font-mono font-extrabold text-rose-600 dark:text-rose-400">{inactiveCount}</span>
          <span className="text-[11px] text-rose-600 block mt-1">لم يتم الدخول منذ 30 يوماً</span>
        </div>
      </div>

      {/* Table & Data */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">سجل استهلاك أدوات الذكاء الاصطناعي حسب الموظف</h3>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">الأداة:</span>
            <select
              value={filterTool}
              onChange={(e) => setFilterTool(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              <option value="All">جميع الأدوات</option>
              <option value="ChatGPT">ChatGPT</option>
              <option value="Cursor">Cursor</option>
              <option value="Gemini">Gemini</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px]">
              <tr>
                <th className="p-3 text-start">المستخدم</th>
                <th className="p-3 text-start">الأداة والفريق</th>
                <th className="p-3 text-center">أيام النشاط (30d)</th>
                <th className="p-3 text-center">عدد الأوامر (Prompts)</th>
                <th className="p-3 text-center">نوع البيانات</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{u.userName}</td>
                  <td className="p-3">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 block">{u.toolName}</span>
                    <span className="text-[10px] text-slate-400">{u.teamName}</span>
                  </td>
                  <td className="p-3 text-center font-mono font-bold">{u.activeDaysLast30Days} يوماً</td>
                  <td className="p-3 text-center font-mono font-bold">{u.promptsCount} أمر</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {u.dataType}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' :
                      u.status === 'low_usage' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' :
                      'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                    }`}>
                      {u.status === 'active' ? 'نشط' : u.status === 'low_usage' ? 'استخدام منخفض' : 'غير مستخدم'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
