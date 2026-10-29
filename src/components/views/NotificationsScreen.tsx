import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const NotificationsScreen: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead, t } = useApp();
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');

  const filtered = notifications.filter((n) => (filter === 'Unread' ? !n.read : true));

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight dark:text-white">
            {t('notifications')}
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1 dark:text-slate-400">
            مركز التنبيهات والتذكيرات التلقائية بمواعيد تجديد اشتراكات الذكاء الاصطناعي.
          </p>
        </div>

        <button
          onClick={markAllNotificationsRead}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors dark:hover:bg-slate-700"
        >
          <CheckCheck className="w-4 h-4" />
          <span>{t('markAllRead')}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-200/80 w-fit dark:bg-slate-900 dark:border-slate-800">
        <button
          onClick={() => setFilter('All')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            filter === 'All' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          الكل ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('Unread')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            filter === 'Unread' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          غير مقروء ({notifications.filter(n => !n.read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            لا توجد إشعارات تطابق التصفية الحالية.
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={`p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                !n.read ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
              }`}
            >
              <div className="mt-0.5">
                {n.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
                {n.type === 'info' && <Info className="w-5 h-5 text-sky-500 shrink-0" />}
                {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                {n.type === 'alert' && <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</span>
                  <span className="text-[10px] font-mono text-slate-400">{n.date}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed dark:text-slate-400">{n.message}</p>
              </div>

              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
