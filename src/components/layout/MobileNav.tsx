import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NavTab } from '../../types';
import { LayoutDashboard, CreditCard, Wallet, Plus, Menu, X, Ticket, Sun, Moon, LogOut } from 'lucide-react';
import { useNavItems } from './navItems';
import { formatEgp } from '../../utils/money';

export const MobileNav: React.FC = () => {
  const {
    activeTab, setActiveTab, setIsAddWizardOpen, setIsGoogleCodesModalOpen,
    walletBalanceEgp, walletBalanceUsd, currentUser, logout, isDarkMode, toggleDarkMode, t,
  } = useApp();
  const navItems = useNavItems();
  const [moreOpen, setMoreOpen] = useState(false);

  // Don't let the page scroll behind the open menu
  useEffect(() => {
    document.body.style.overflow = moreOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [moreOpen]);

  const go = (id: NavTab) => {
    setActiveTab(id);
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  };

  const barTabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'subscriptions', label: t('subscriptions'), icon: <CreditCard className="w-5 h-5" /> },
  ];
  const inBar = new Set<NavTab>(['dashboard', 'subscriptions', 'wallet']);
  const moreActive = !inBar.has(activeTab);
  const unread = navItems.find((i) => i.id === 'notifications')?.badge || 0;

  const tabButton = (id: NavTab, label: string, icon: React.ReactNode) => (
    <button
      key={id}
      onClick={() => go(id)}
      className={`nav-tab flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${
        activeTab === id ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 dark:text-slate-500'
      }`}
    >
      <span className={activeTab === id ? 'nav-ico-active text-amber-500' : 'nav-ico'}>{icon}</span>
      <span className="text-[10px] leading-tight truncate max-w-full px-1">{label}</span>
    </button>
  );

  return (
    <>
      {/* Bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-t-[28px] border-t border-slate-200 dark:border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.25)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center px-2 h-16">
          {barTabs.map((tab) => tabButton(tab.id, tab.label, tab.icon))}

          {/* Add subscription */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => setIsAddWizardOpen(true)}
              aria-label={t('quickAdd')}
              className="anim-ring -mt-7 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 flex items-center justify-center shadow-lg shadow-amber-500/40 ring-[6px] ring-white dark:ring-slate-950 active:scale-95 transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {tabButton('wallet', 'المحفظة', <Wallet className="w-5 h-5" />)}

          <button
            onClick={() => setMoreOpen(true)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl relative ${moreActive ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] leading-tight">المزيد</span>
            {unread > 0 && <span className="absolute top-1 end-1/4 w-2 h-2 rounded-full bg-rose-500" />}
          </button>
        </div>
      </nav>

      {/* "More" sheet with every page */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in" onClick={() => setMoreOpen(false)} />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 max-h-[88vh] flex flex-col animate-in slide-in-from-bottom"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            role="dialog"
            aria-label="كل الصفحات"
          >
            <div className="flex justify-center pt-2"><span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" /></div>

            {/* User + close */}
            <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={currentUser?.avatar} alt={currentUser?.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                <div className="min-w-0">
                  <span className="block text-sm font-extrabold text-slate-900 dark:text-white truncate">{currentUser?.name}</span>
                  <span className="block text-[11px] text-slate-400 truncate">{currentUser?.email}</span>
                </div>
              </div>
              <button onClick={() => setMoreOpen(false)} aria-label="إغلاق" className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-3 space-y-4">
              {/* Balance + quick actions */}
              <button
                onClick={() => go('wallet')}
                className="w-full flex items-center justify-between gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60"
              >
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <Wallet className="w-4 h-4" /> رصيد الاشتراكات
                </span>
                <span className="text-end leading-tight">
                  <span className={`block text-base font-extrabold font-mono ${walletBalanceEgp < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ${walletBalanceUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="block text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400">{formatEgp(walletBalanceEgp)}</span>
                </span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setMoreOpen(false); setIsAddWizardOpen(true); }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                >
                  <Plus className="w-4 h-4" /> {t('quickAdd')}
                </button>
                <button
                  onClick={() => { setMoreOpen(false); setIsGoogleCodesModalOpen(true); }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl"
                >
                  <Ticket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> إضافة أكواد
                </button>
              </div>

              {/* All pages */}
              <div className="grid grid-cols-3 gap-2">
                {navItems.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.id)}
                      className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-center transition-colors ${
                        active
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className={active ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}>{item.icon}</span>
                      <span className="text-[11px] font-bold leading-tight">{item.label}</span>
                      {item.badge ? (
                        <span className="absolute top-1.5 end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{item.badge}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Theme + logout */}
              <div className="grid grid-cols-2 gap-2 pb-2">
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-amber-300"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
                </button>
                <button
                  onClick={() => { setMoreOpen(false); logout(); }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400"
                >
                  <LogOut className="w-4 h-4" /> {t('logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};



