import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Team } from '../../types';
import { 
  Plus, Users, Sparkles, DollarSign, ChevronRight, X, Eye, 
  Check, Mail, Briefcase, CreditCard, AtSign, Search, Trash2, Pencil
} from 'lucide-react';
import { EditTeamModal } from '../modals/EditTeamModal';

export const TeamsScreen: React.FC = () => {
  const { 
    teams, 
    users, 
    aiTools, 
    subscriptions, 
    addTeam,
    deleteTeam,
    updateUser,
    assignUsersToSubscription,
    setSelectedTeamForDetails, 
    t 
  } = useApp();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Team Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  
  // Step 2 & 3: Role & Employees Filter
  const [targetRoleFilter, setTargetRoleFilter] = useState<string>('All');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Step 4, 5, 6: AI Tool, Subscription & Account
  // Empty = create the team now and attach a program later
  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string>('');

  // Derived filtered users based on target role
  const availableUsers = users.filter((u) => {
    if (targetRoleFilter === 'All') return true;
    return u.jobTitle === targetRoleFilter || u.role === targetRoleFilter;
  });

  // Derived subscriptions for selected tool
  const currentToolObj = aiTools.find((t) => t.id === selectedToolId);
  const matchingSubscriptions = currentToolObj
    ? subscriptions.filter((s) => s.toolId === selectedToolId || s.toolName.toLowerCase() === currentToolObj.name.toLowerCase())
    : [];

  // Unique accounts for selected tool/subs
  const matchingAccounts = Array.from(
    new Set(matchingSubscriptions.map((s) => s.ownerEmail).filter((e): e is string => !!e))
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    // A subscription is linked only when a program was actually chosen
    const chosenSub = currentToolObj
      ? subscriptions.find((s) => s.id === selectedSubId) || matchingSubscriptions[0]
      : undefined;

    const newTeamData = {
      name,
      description: description || 'فريق عمل متخصص لمشروعات الذكاء الاصطناعي',
      memberCount: selectedUserIds.length,
      toolCount: currentToolObj ? 1 : 0,
      monthlyCost: chosenSub ? chosenSub.cost : 0,
      monthlyBudget: 500,
      color,
      targetRole: targetRoleFilter,
      assignedUserIds: selectedUserIds,
      selectedToolId: currentToolObj?.id || '',
      selectedToolName: currentToolObj?.name || '',
      selectedSubscriptionId: chosenSub?.id || '',
      selectedAccountEmail: currentToolObj ? selectedAccountEmail || chosenSub?.ownerEmail || '' : ''
    };

    const teamId = addTeam(newTeamData);

    // Update selected users' team
    selectedUserIds.forEach((uId) => {
      updateUser(uId, { teamId, teamName: name });
    });

    // Assign users to chosen subscription if selected
    if (chosenSub && selectedUserIds.length > 0) {
      assignUsersToSubscription(chosenSub.id, selectedUserIds);
    }

    setIsCreateOpen(false);
    setName('');
    setDescription('');
    setSelectedUserIds([]);
    setSelectedToolId('');
    setSelectedSubId('');
    setSelectedAccountEmail('');
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('teams')}
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تنظيم المستخدمين، تخصيص الأدوار، وحسابات الاشتراكات الموزعة حسب الأقسام.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs lg:text-sm rounded-xl shadow-xs transition-all hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{t('createTeam')}</span>
        </button>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teams.map((tm) => {
          const teamMembers = users.filter((u) => u.teamId === tm.id || u.teamName === tm.name);
          const teamSubs = subscriptions.filter((s) => s.teamId === tm.id || s.teamName === tm.name);
          const totalCost = teamSubs.reduce((acc, s) => acc + s.cost, 0) || tm.monthlyCost;

          return (
            <div
              key={tm.id}
              onClick={() => setSelectedTeamForDetails(tm)}
              className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs"
                    style={{ backgroundColor: tm.color }}
                  >
                    {tm.name[0]}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg">
                      ${totalCost}/شهرياً
                    </span>
                    <button
                      type="button"
                      title="تعديل الفريق"
                      aria-label={`تعديل الفريق ${tm.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTeam(tm);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="حذف الفريق"
                      aria-label={`حذف الفريق ${tm.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`هل تريد حذف فريق "${tm.name}"؟ سيتم فصل ${teamMembers.length} عضو عن الفريق.`)) {
                          deleteTeam(tm.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {tm.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {tm.description}
                </p>

                {/* Additional team settings details if available */}
                {(tm.selectedToolName || tm.selectedAccountEmail) && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1 text-[11px]">
                    {tm.selectedToolName && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">البرنامج المستخدم:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{tm.selectedToolName}</span>
                      </div>
                    )}
                    {tm.selectedAccountEmail && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">حساب الاشتراك:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 font-mono truncate max-w-[150px]">
                          {tm.selectedAccountEmail}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{teamMembers.length} أعضاء</span>
                </span>

                <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{teamSubs.length || (tm.selectedToolName ? 1 : 0)} اشتراك</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {editingTeam && <EditTeamModal team={editingTeam} onClose={() => setEditingTeam(null)} />}

      {/* Enhanced Create Team Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">إنشاء فريق وتخصيص الحسابات</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* 1. Basic Team Details */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  1. بيانات الفريق الأساسية
                </label>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الفريق *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: Product Design, Sales Team, Data Analytics"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الوصف لنشاط الفريق</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="موجز عن المهام التي يتولاها الفريق والبرامج المطلوبة..."
                    rows={2}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">لون التمييز للفريق</label>
                  <div className="flex gap-2">
                    {['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          color === c ? 'scale-110 ring-2 ring-indigo-600 ring-offset-2' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              {/* 2 & 3: Target Role & Employee Checkbox List */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  2. اختيار الوظيفة والموظفين (Chat / Selection Box)
                </label>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تصفية حسب الوظيفة / التخصص (Target Role)</label>
                  <select
                    value={targetRoleFilter}
                    onChange={(e) => setTargetRoleFilter(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-semibold"
                  >
                    <option value="All">جميع الوظائف (All Employees)</option>
                    <option value="Manager">Manager</option>
                    <option value="Sales">Sales</option>
                    <option value="Developer">Developer</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Designer">Designer</option>
                  </select>
                </div>

                {/* Employees Checkbox Chat/Selection List */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      حدد الموظفين المنضمين لهذا الجروب ({selectedUserIds.length} محدد):
                    </label>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 max-h-48 overflow-y-auto space-y-1">
                    {availableUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 p-3 text-center">لا يوجد موظفون بهذه الوظيفة المحددة</p>
                    ) : (
                      availableUsers.map((usr) => {
                        const isSelected = selectedUserIds.includes(usr.id);
                        return (
                          <div
                            key={usr.id}
                            onClick={() => toggleUserSelection(usr.id)}
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
                                  {usr.jobTitle || usr.role} ({usr.email})
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
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              {/* 4, 5, 6: AI Tool, Subscription & Account Email */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  3. البرنامج والاشتراك والحساب <span className="text-slate-400 normal-case font-semibold">(اختياري — ممكن تختاره بعدين)</span>
                </label>

                {/* 4. Select AI Tool */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اختيار البرنامج المراد استخدامه (AI Tool)</label>
                  <select
                    value={selectedToolId}
                    onChange={(e) => {
                      setSelectedToolId(e.target.value);
                      const matching = subscriptions.filter(s => s.toolId === e.target.value);
                      setSelectedSubId(matching[0]?.id || '');
                      setSelectedAccountEmail(matching[0]?.ownerEmail || '');
                    }}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-bold"
                  >
                    <option value="">بدون برنامج الآن</option>
                    {aiTools.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.name} ({tl.provider}) - {tl.category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Select Subscription Plan */}
                {currentToolObj && (<>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اختيار خطة الاشتراك للبرنامج</label>
                  <select
                    value={selectedSubId}
                    onChange={(e) => {
                      setSelectedSubId(e.target.value);
                      const sub = subscriptions.find(s => s.id === e.target.value);
                      if (sub) setSelectedAccountEmail(sub.ownerEmail || '');
                    }}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-bold"
                  >
                    {matchingSubscriptions.length === 0 ? (
                      <option value="">لا يوجد اشتراك مسجل حالياً لهذه الأداة (سيتم إنشاء خطة جديدة)</option>
                    ) : (
                      matchingSubscriptions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.planName} - ${sub.cost} {sub.currency} (تجديد: {sub.renewalDate})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 6. Select Subscription Account */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اختيار حساب الاشتراك (Account Email)</label>
                  <select
                    value={selectedAccountEmail}
                    onChange={(e) => setSelectedAccountEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-bold font-mono"
                  >
                    {matchingAccounts.length === 0 ? (
                      <option value="">لا يوجد حساب مسجل لهذا البرنامج</option>
                    ) : (
                      matchingAccounts.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                </>)}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  إنشاء الفريق وتعيين الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
