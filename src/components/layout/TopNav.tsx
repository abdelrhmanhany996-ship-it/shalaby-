import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Bell, ArrowRight, Settings, LogOut } from 'lucide-react';

export const TopNav: React.FC = () => {
  const { 
    notifications, 
    markNotificationRead, 
    markAllNotificationsRead,
    setIsGlobalSearchOpen,
    currentUser,
    logout,
    setActiveTab,
    t 
  } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-3 z-30 w-full px-4 mb-1 pointer-events-auto">
      <div className="max-w-xl mx-auto h-12 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/50 dark:border-slate-800/50 shadow-2xl shadow-indigo-500/10 rounded-2xl px-3.5 flex items-center justify-between gap-3 transition-all duration-300 ease-out hover:shadow-indigo-500/20">
        
        {/* Search Input Trigger (Center-left) */}
        <button
          onClick={() => setIsGlobalSearchOpen(true)}
          className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-medium transition-all duration-300 border border-slate-200/40 dark:border-slate-700/40 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:scale-[1.01]"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate text-slate-400 dark:text-slate-400 text-xs">{t('searchPlaceholder')}</span>
          <kbd className="hidden sm:inline-flex ms-auto px-1.5 py-0.5 text-[9px] font-mono font-semibold text-slate-400 bg-white/80 dark:bg-slate-900/80 rounded border border-slate-200 dark:border-slate-700 shadow-xs">
            ⌘K
          </kbd>
        </button>

        {/* Right Controls: Notifications Bell & User Account Menu */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all duration-300 hover:scale-105 relative flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 shadow-xs"
              title={t('notifications')}
            >
              <Bell className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              <span className={`absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-extrabold font-mono rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-md ${
                unreadCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'
              }`}>
                {unreadCount}
              </span>
            </button>

            {/* Notifications Dropdown */}
            {notifOpen && (
              <div className="absolute -end-12 sm:end-0 mt-2 w-[min(24rem,calc(100vw-2rem))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('notifications')}</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium transition-colors"
                    >
                      {t('markAllRead')}
                    </button>
                  )}
                </div>

                <div className="py-2 max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">لا توجد إشعارات حالياً</p>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-3 rounded-xl transition-colors cursor-pointer my-1 ${
                          !n.read ? 'bg-indigo-50/50 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{n.date.split(' ')[1] || n.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => {
                    setNotifOpen(false);
                    setActiveTab('notifications');
                  }}
                  className="w-full mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1"
                >
                  <span>عرض كل الإشعارات</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* User Avatar & Account Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 p-0.5 rounded-full hover:scale-105 transition-all duration-300"
            >
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser?.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/40"
              />
            </button>

            {userMenuOpen && (
              <div className="absolute end-0 mt-2 w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser?.email}</p>
                </div>

                <div className="py-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setActiveTab('settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>{t('settings')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
