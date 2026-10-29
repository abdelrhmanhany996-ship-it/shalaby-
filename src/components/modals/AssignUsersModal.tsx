import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Check, Search } from 'lucide-react';

export const AssignUsersModal: React.FC = () => {
  const { 
    selectedSubscriptionForAssign, 
    setSelectedSubscriptionForAssign, 
    users, 
    assignUsersToSubscription,
    t
  } = useApp();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // Sync selectedIds whenever selectedSubscriptionForAssign changes
  useEffect(() => {
    if (selectedSubscriptionForAssign) {
      setSelectedIds(selectedSubscriptionForAssign.assignedUserIds || []);
      setSearch('');
    }
  }, [selectedSubscriptionForAssign]);

  if (!selectedSubscriptionForAssign) return null;

  const sub = selectedSubscriptionForAssign;

  const toggleUser = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSave = () => {
    assignUsersToSubscription(sub.id, selectedIds);
    setSelectedSubscriptionForAssign(null);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.teamName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('assignUsers')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub.toolName} ({sub.planName})</p>
          </div>
          <button
            onClick={() => setSelectedSubscriptionForAssign(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث عن مستخدم..."
              className="bg-transparent w-full text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* User List */}
        <div className="p-3 overflow-y-auto space-y-1 flex-1">
          {filteredUsers.map((usr) => {
            const isChecked = selectedIds.includes(usr.id);
            return (
              <div
                key={usr.id}
                onClick={() => toggleUser(usr.id)}
                className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                  isChecked ? 'bg-indigo-50/70 dark:bg-indigo-950/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={usr.avatar} alt={usr.name} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">{usr.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{usr.role} · {usr.teamName}</span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{selectedIds.length} مستخدمين محددين</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedSubscriptionForAssign(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              حفظ التعيينات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
