import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Team } from '../../types';
import { X, Pencil, Check, Search } from 'lucide-react';

const TEAM_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1'];

export const EditTeamModal: React.FC<{ team: Team; onClose: () => void }> = ({ team, onClose }) => {
  const { users, saveTeam } = useApp();

  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || '');
  const [color, setColor] = useState(team.color);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(team.monthlyBudget || 0);
  const [memberIds, setMemberIds] = useState<string[]>(
    users.filter((u) => u.teamId === team.id || u.teamName === team.name).map((u) => u.id)
  );
  const [search, setSearch] = useState('');

  const visibleUsers = users.filter((u) =>
    `${u.name} ${u.email} ${u.jobTitle || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveTeam(team.id, { name: name.trim(), description, color, monthlyBudget }, memberIds);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">تعديل الفريق</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الفريق *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الميزانية الشهرية ($)</label>
              <input
                type="number"
                min={0}
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">لون التمييز</label>
              <div className="flex gap-2 pt-1">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`اللون ${c}`}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-indigo-600 ring-offset-2' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              أعضاء الفريق ({memberIds.length} محدد)
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن موظف..."
                className="w-full ps-9 pe-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 max-h-56 overflow-y-auto space-y-1">
              {visibleUsers.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 text-center">لا يوجد موظفون مطابقون</p>
              ) : (
                visibleUsers.map((usr) => {
                  const isSelected = memberIds.includes(usr.id);
                  const otherTeam = !isSelected && usr.teamName && usr.teamId !== team.id ? usr.teamName : '';
                  return (
                    <div
                      key={usr.id}
                      onClick={() => toggleMember(usr.id)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800'
                          : 'hover:bg-white dark:hover:bg-slate-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={usr.avatar} alt={usr.name} className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">{usr.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {usr.jobTitle || usr.role}
                            {otherTeam && ` · حالياً في: ${otherTeam}`}
                          </span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">إضافة موظف من فريق آخر ستنقله لهذا الفريق.</p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
