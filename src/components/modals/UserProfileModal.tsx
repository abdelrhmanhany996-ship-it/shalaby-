import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Sparkles, DollarSign, Shield, Users } from 'lucide-react';

export const UserProfileModal: React.FC = () => {
  const { selectedUserForProfile, setSelectedUserForProfile, subscriptions, t } = useApp();

  if (!selectedUserForProfile) return null;

  const usr = selectedUserForProfile;

  // Calculate assigned subscriptions
  const userSubs = subscriptions.filter(s => s.assignedUserIds.includes(usr.id));
  const totalCost = userSubs.reduce((acc, s) => acc + (s.cost / (s.assignedUserIds.length || 1)), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ملف المستخدم</span>
          <button
            onClick={() => setSelectedUserForProfile(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="flex items-center gap-4">
            <img
              src={usr.avatar}
              alt={usr.name}
              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-50 dark:ring-indigo-950 shadow-md"
            />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{usr.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{usr.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {usr.role}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {usr.teamName}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">أدوات الذكاء الاصطناعي</span>
              <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">{userSubs.length} أدوات</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">التكلفة الشهرية المقدرة</span>
              <span className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">${totalCost.toFixed(1)}/mo</span>
            </div>
          </div>

          {/* Assigned Tools */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
              الأدوات والاشتراكات المخصصة ({userSubs.length})
            </h4>

            <div className="space-y-2">
              {userSubs.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">لا توجد أدوات مخصصة لهذا المستخدم حالياً.</p>
              ) : (
                userSubs.map((s) => (
                  <div key={s.id} className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{s.toolName} ({s.planName})</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">ينتهي: {s.renewalDate}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">${s.cost}/mo</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-950/60">
          <button
            onClick={() => setSelectedUserForProfile(null)}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
