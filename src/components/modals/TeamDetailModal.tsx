import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Users, CreditCard, Sparkles, DollarSign, Trash2, Pencil } from 'lucide-react';
import { EditTeamModal } from './EditTeamModal';

export const TeamDetailModal: React.FC = () => {
  const { selectedTeamForDetails, setSelectedTeamForDetails, deleteTeam, users, subscriptions, t } = useApp();
  const [isEditing, setIsEditing] = useState(false);

  if (!selectedTeamForDetails) return null;

  const team = selectedTeamForDetails;
  const teamMembers = users.filter((u) => u.teamId === team.id || u.teamName === team.name);
  const teamSubs = subscriptions.filter((s) => s.teamId === team.id || s.teamName === team.name);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm"
              style={{ backgroundColor: team.color }}
            >
              {team.name[0]}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{team.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{team.description}</p>
            </div>
          </div>

          <button
            onClick={() => setSelectedTeamForDetails(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center dark:bg-slate-950/60 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 block dark:text-slate-400">الأعضاء</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">{teamMembers.length} أعضاء</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block dark:text-slate-400">الأدوات المستعملة</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">{teamSubs.length} أدوات</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block dark:text-slate-400">التكلفة الشهرية</span>
              <span className="text-base font-mono font-bold text-indigo-600">${team.monthlyCost}/mo</span>
            </div>
          </div>

          {/* Members List */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              {t('teamMembers')} ({teamMembers.length})
            </h4>
            <div className="space-y-2">
              {teamMembers.map((m) => (
                <div key={m.id} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block dark:text-white">{m.name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{m.role}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscriptions & Cost Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              {t('assignedSubscriptions')} والتكلفة
            </h4>
            <div className="space-y-2">
              {teamSubs.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">لا توجد اشتراكات مباشرة مخصصة لهذا الفريق.</p>
              ) : (
                teamSubs.map((s) => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between dark:bg-slate-950/60 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block dark:text-white">{s.toolName} ({s.planName})</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">المالك: {s.ownerName}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-600">${s.cost}/mo</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
          <button
            onClick={() => {
              if (window.confirm(`هل تريد حذف فريق "${team.name}"؟ سيتم فصل ${teamMembers.length} عضو عن الفريق.`)) {
                deleteTeam(team.id);
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-red-600 text-xs font-bold rounded-xl hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            حذف الفريق
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              تعديل الفريق
            </button>
            <button
              onClick={() => setSelectedTeamForDetails(null)}
              className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors dark:hover:bg-slate-700"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {isEditing && <EditTeamModal team={team} onClose={() => setIsEditing(false)} />}
    </div>
  );
};
