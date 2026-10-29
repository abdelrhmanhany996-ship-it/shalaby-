import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Role } from '../../types';
import { Plus, Search, Eye, Trash2, Edit3, X, UserCheck } from 'lucide-react';
export const UsersScreen: React.FC = () => {
  const { 
    users, 
    teams, 
    subscriptions, 
    addUser, 
    updateUser,
    deleteUser,
    currentUser,
    setSelectedUserForProfile,
    t 
  } = useApp();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Add user form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<Role>('User');
  // Empty = no team yet
  const [teamId, setTeamId] = useState('');

  const filteredUsers = users.filter((u) => {
    const matches = u.name.toLowerCase().includes(search.toLowerCase()) || 
                    u.email.toLowerCase().includes(search.toLowerCase()) ||
                    (u.jobTitle && u.jobTitle.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter === 'All') return matches;
    return matches && u.role === roleFilter;
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      const tm = teams.find(t => t.id === teamId);
      addUser({
        name,
        email,
        jobTitle: jobTitle.trim() || 'AI Specialist',
        avatar: '',
        role,
        teamId: tm?.id || '',
        teamName: tm?.name || '',
        status: 'Active'
      });
      setIsAddUserOpen(false);
      setName('');
      setEmail('');
      setJobTitle('');
      setTeamId('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('users')}
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة أفراد الفريق والتعيينات التابعة لموارد الذكاء الاصطناعي.
          </p>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs lg:text-sm rounded-xl shadow-xs transition-all hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addUser')}</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 justify-between hover:shadow-[0_0_25px_rgba(99,102,241,0.22)] hover:scale-[1.01] transition-all duration-300 ease-out">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث باسم المستخدم أو البريد..."
            className="w-full ps-10 pe-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {['All', 'Super Admin', 'Manager', 'Team Leader', 'User'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                roleFilter === r ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {r === 'All' ? 'الكل' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden hover:shadow-[0_0_25px_rgba(99,102,241,0.22)] hover:scale-[1.01] transition-all duration-300 ease-out">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4 text-start">المستخدم</th>
                <th className="p-4 text-start">{t('colRole')}</th>
                <th className="p-4 text-start">{t('colTeam')}</th>
                <th className="p-4 text-center">{t('colToolsCount')}</th>
                <th className="p-4 text-start">{t('colCost')}</th>
                <th className="p-4 text-center">{t('colStatus')}</th>
                <th className="p-4 text-end">{t('colActions')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredUsers.map((usr) => {
                const userSubs = subscriptions.filter(s => s.assignedUserIds.includes(usr.id));
                const estCost = userSubs.reduce((acc, s) => acc + (s.cost / (s.assignedUserIds.length || 1)), 0);

                return (
                  <tr key={usr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={usr.avatar} alt={usr.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{usr.name}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400">{usr.email}</span>
                            {usr.jobTitle && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                {usr.jobTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {usr.role}
                      </span>
                    </td>

                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                      {usr.teamName || <span className="text-slate-400 font-normal">بدون فريق</span>}
                    </td>

                    <td className="p-4 text-center font-bold font-mono text-slate-900 dark:text-white">
                      {userSubs.length} أدوات
                    </td>

                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      ${estCost.toFixed(0)}/mo
                    </td>

                    <td className="p-4 text-center">
                      <select
                        value={usr.status || 'Active'}
                        onChange={(e) => updateUser(usr.id, { status: e.target.value as any })}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border focus:outline-none cursor-pointer ${
                          usr.status === 'Active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : usr.status === 'Archived' || usr.status === 'On Leave'
                            ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <option value="Active">نشط (Active)</option>
                        <option value="Archived">مؤرشف / إجازة (On Leave)</option>
                        <option value="Inactive">غير نشط (Inactive)</option>
                      </select>
                    </td>

                    <td className="p-4 text-end">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => updateUser(usr.id, { status: usr.status === 'Archived' ? 'Active' : 'Archived' })}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                            usr.status === 'Archived'
                              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                              : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                          }`}
                          title={usr.status === 'Archived' ? 'إعادة تنشيط المستخدم' : 'وضع المستخدم في الأرشيف / إجازة'}
                        >
                          {usr.status === 'Archived' ? 'تنشيط' : 'أرشفة (إجازة)'}
                        </button>
                        <button
                          onClick={() => setSelectedUserForProfile(usr)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                          title={t('view')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`هل تريد حذف المستخدم "${usr.name}" نهائياً؟ سيتم إلغاء تعيينه من ${userSubs.length} اشتراك.`)) {
                              deleteUser(usr.id);
                            }
                          }}
                          disabled={currentUser?.id === usr.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          title={currentUser?.id === usr.id ? 'لا يمكنك حذف حسابك الحالي' : 'حذف المستخدم'}
                          aria-label={`حذف المستخدم ${usr.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('addUser')}</h3>
              <button onClick={() => setIsAddUserOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: كريم عبد العزيز"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@company.ai"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الوظيفة / التخصص (شغال ايه) *</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="مثال: Developer, Manager, Sales Lead, UI Designer, Trainer"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('colRole')}</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-semibold"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Team Leader">Team Leader</option>
                    <option value="User">User</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('colTeam')}</label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-semibold"
                  >
                    <option value="">بدون فريق</option>
                    {teams.map((tm) => (
                      <option key={tm.id} value={tm.id}>{tm.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-indigo-700"
                >
                  حفظ المستخدم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
