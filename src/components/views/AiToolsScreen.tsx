import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, Plus, Search, Eye, ExternalLink, CreditCard, Trash2 } from 'lucide-react';
import { ToolIcon } from '../shared/ToolIcon';

export const AiToolsScreen: React.FC = () => {
  const { aiTools, subscriptions, setSelectedSubscriptionForDetails, setIsAddWizardOpen, deleteAiTool, t } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const categories = ['All', 'Chat & Writing', 'Coding', 'Image & Video', 'Workflow & Agents', 'Search & Knowledge'];

  const filtered = aiTools.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase()) || tool.provider.toLowerCase().includes(search.toLowerCase());
    if (selectedCategory === 'All') return matchesSearch;
    return matchesSearch && tool.category === selectedCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('aiTools')}
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('aiToolsDescription')}
          </p>
        </div>

        <button
          onClick={() => setIsAddWizardOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs lg:text-sm rounded-xl shadow-xs transition-all hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{t('quickAdd')}</span>
        </button>
      </div>

      {/* Toolbar & Category Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث باسم الخدمة أو المزود..."
              className="w-full ps-10 pe-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                  selectedCategory === cat ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat === 'All' ? 'جميع التصنيفات' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Tools Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
          <Sparkles className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">لا توجد أدوات ذكاء اصطناعي مسجلة</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            القائمة فارغة حالياً. يمكنك إضافة أول اشتراك أو ترخيص جديد وتصنيفه حسب الخدمة.
          </p>
          <button
            onClick={() => setIsAddWizardOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أداة جديدة</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tool) => {
            const toolSub = subscriptions.find(s => s.toolId === tool.id || s.toolName.toLowerCase().includes(tool.name.toLowerCase()));
            const toolSubs = subscriptions.filter(s => s.toolId === tool.id || s.toolName.toLowerCase().includes(tool.name.toLowerCase()));
            const totalCost = toolSubs.reduce((acc, s) => acc + s.cost, 0) || tool.monthlySpending;

            return (
              <div
                key={tool.id}
                onClick={() => {
                  if (toolSub) {
                    setSelectedSubscriptionForDetails(toolSub);
                  }
                }}
                className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out flex flex-col justify-between space-y-4 group cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 inline-flex">
                        <ToolIcon name={tool.name} fallback={tool.logo} size={32} />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {tool.name}
                        </h3>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{tool.provider}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {tool.category}
                      </span>
                      <button
                        type="button"
                        title="حذف الأداة"
                        aria-label={`حذف الأداة ${tool.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const subsNote = toolSubs.length
                            ? ` الاشتراكات المرتبطة بها (${toolSubs.length}) لن تُحذف، ويمكنك حذفها من صفحة الاشتراكات.`
                            : '';
                          if (window.confirm(`هل تريد حذف أداة "${tool.name}"؟${subsNote}`)) {
                            deleteAiTool(tool.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                {/* Stats Bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center bg-slate-50/60 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('subscriptionsCountLabel')}</span>
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">{toolSubs.length || tool.subscriptionsCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('usersCountLabel')}</span>
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">{tool.usersCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">الإنفاق الشهري</span>
                    <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">${totalCost}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
