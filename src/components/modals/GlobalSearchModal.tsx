import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, CreditCard, Users, UsersRound, Sparkles, Activity } from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const { 
    isGlobalSearchOpen, 
    setIsGlobalSearchOpen, 
    searchQuery, 
    setSearchQuery,
    subscriptions,
    users,
    teams,
    aiTools,
    activities,
    setSelectedSubscriptionForDetails,
    setSelectedUserForProfile,
    setSelectedTeamForDetails,
    setActiveTab,
    t
  } = useApp();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      } else if (e.key === 'Escape' && isGlobalSearchOpen) {
        setIsGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobalSearchOpen, setIsGlobalSearchOpen]);

  useEffect(() => {
    if (isGlobalSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isGlobalSearchOpen]);

  if (!isGlobalSearchOpen) return null;

  const q = searchQuery.toLowerCase().trim();

  const filteredSubs = q 
    ? subscriptions.filter(s => s.toolName.toLowerCase().includes(q) || s.planName.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q))
    : subscriptions.slice(0, 3);

  const filteredUsers = q
    ? users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.teamName.toLowerCase().includes(q))
    : users.slice(0, 3);

  const filteredTeams = q
    ? teams.filter(tm => tm.name.toLowerCase().includes(q) || tm.description.toLowerCase().includes(q))
    : teams.slice(0, 3);

  const filteredTools = q
    ? aiTools.filter(t => t.name.toLowerCase().includes(q) || t.provider.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    : aiTools.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 px-4 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] dark:bg-slate-900 dark:border-slate-800">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-transparent text-slate-900 text-sm focus:outline-none placeholder:text-slate-400 font-medium dark:text-white"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsGlobalSearchOpen(false)}
            className="text-xs font-semibold px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors dark:bg-slate-700 dark:text-slate-300"
          >
            ESC
          </button>
        </div>

        {/* Search Results Container */}
        <div className="p-4 overflow-y-auto space-y-6 flex-1">
          {/* Subscriptions */}
          {filteredSubs.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                <span>الاشتراكات ({filteredSubs.length})</span>
              </h4>
              <div className="space-y-1">
                {filteredSubs.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setIsGlobalSearchOpen(false);
                      setSelectedSubscriptionForDetails(sub);
                    }}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-indigo-50/60 rounded-xl transition-colors text-start group"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white">
                        {sub.toolName} — {sub.planName}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">المالك: {sub.ownerName} · {sub.teamName}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">${sub.cost}/mo</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {filteredUsers.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>المستخدمون ({filteredUsers.length})</span>
              </h4>
              <div className="space-y-1">
                {filteredUsers.map((usr) => (
                  <button
                    key={usr.id}
                    onClick={() => {
                      setIsGlobalSearchOpen(false);
                      setSelectedUserForProfile(usr);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-indigo-50/60 rounded-xl transition-colors text-start group"
                  >
                    <img src={usr.avatar} alt={usr.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white">
                        {usr.name}
                      </span>
                      <p className="text-[11px] text-slate-500 truncate dark:text-slate-400">{usr.role} · {usr.teamName}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teams */}
          {filteredTeams.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UsersRound className="w-3.5 h-3.5 text-indigo-500" />
                <span>الفرق ({filteredTeams.length})</span>
              </h4>
              <div className="space-y-1">
                {filteredTeams.map((tm) => (
                  <button
                    key={tm.id}
                    onClick={() => {
                      setIsGlobalSearchOpen(false);
                      setSelectedTeamForDetails(tm);
                    }}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-indigo-50/60 rounded-xl transition-colors text-start group"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white">
                        {tm.name}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{tm.memberCount} أعضاء · {tm.toolCount} أدوات</p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">${tm.monthlyCost}/mo</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Tools */}
          {filteredTools.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>أدوات الذكاء الاصطناعي ({filteredTools.length})</span>
              </h4>
              <div className="space-y-1">
                {filteredTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setIsGlobalSearchOpen(false);
                      setActiveTab('ai-tools');
                    }}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-indigo-50/60 rounded-xl transition-colors text-start group"
                  >
                    <span className="text-lg shrink-0">{tool.logo}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white">
                        {tool.name} ({tool.provider})
                      </span>
                      <p className="text-[11px] text-slate-500 truncate dark:text-slate-400">{tool.category}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">${tool.monthlySpending}/mo</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
