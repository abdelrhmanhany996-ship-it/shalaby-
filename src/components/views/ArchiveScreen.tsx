import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Archive, Users, CreditCard, RefreshCw, Eye, Search, AlertCircle, CheckCircle2, UserCheck, Trash2 } from 'lucide-react';

export const ArchiveScreen: React.FC = () => {
  const { 
    users, 
    subscriptions, 
    updateUser, 
    updateSubscription, 
    setSelectedUserForProfile, 
    setSelectedSubscriptionForDetails,
    deleteSubscriptions,
    addToast,
    t 
  } = useApp();

  const [filterType, setFilterType] = useState<'all' | 'users' | 'subscriptions'>('all');
  const [search, setSearch] = useState('');

  // Archived Users (status === 'Archived' or 'On Leave')
  const archivedUsers = users.filter((u) => 
    u.status === 'Archived' || u.status === 'On Leave'
  );

  // Archived Subscriptions (status === 'Archived' or 'Expired')
  const archivedSubs = subscriptions.filter((s) => 
    s.status === 'Archived' || s.status === 'Expired'
  );

  const filteredUsers = archivedUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.jobTitle && u.jobTitle.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSubs = archivedSubs.filter((s) =>
    s.toolName.toLowerCase().includes(search.toLowerCase()) ||
    s.planName.toLowerCase().includes(search.toLowerCase()) ||
    (s.ownerEmail && s.ownerEmail.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Archive className="w-6 h-6 text-amber-500" />
            <span>سجل الأرشيف والمحفوظات (Archive Catalog)</span>
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة الموظفين المتواجدين في إجازات أو أرشفة، بالإضافة إلى الاشتراكات الموقوفة أو السابقة.
          </p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">الموظفون في إجازة / أرشفة</span>
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {archivedUsers.length} موظف
            </span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">الاشتراكات المؤرشفة والمغلقة</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {archivedSubs.length} اشتراك
            </span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-1 hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:scale-[1.02] transition-all duration-300 ease-out">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">إجمالي الحالات المؤرشفة</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {archivedUsers.length + archivedSubs.length}
            </span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl">
            <Archive className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Tabs Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث بالمستخدم، الإيميل، أو اسم البرنامج..."
            className="w-full ps-10 pe-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'users', label: `الموظفون في إجازة (${archivedUsers.length})` },
            { id: 'subscriptions', label: `الاشتراكات المؤرشفة (${archivedSubs.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Archived Users Section */}
      {(filterType === 'all' || filterType === 'users') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>الموظفون في إجازة أو الأرشفة ({filteredUsers.length})</span>
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-slate-400 p-8 text-center">لا يوجد موظفون في الأرشيف أو الإجازة حالياً</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((usr) => (
                  <div key={usr.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={usr.avatar} alt={usr.name} className="w-10 h-10 rounded-full object-cover shrink-0 grayscale" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{usr.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            مؤرشف (في إجازة)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                          {usr.jobTitle || usr.role} • {usr.email} • {usr.teamName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          updateUser(usr.id, { status: 'Active' });
                          addToast('تمت استعادة المستخدم', `تم تنشيط حساب الموظف ${usr.name} بنجاح`);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>إعادة تنشيط الموظف</span>
                      </button>

                      <button
                        onClick={() => setSelectedUserForProfile(usr)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archived Subscriptions Section */}
      {(filterType === 'all' || filterType === 'subscriptions') && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <span>الاشتراكات والخطط المؤرشفة والمغلقة ({filteredSubs.length})</span>
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {filteredSubs.length === 0 ? (
              <p className="text-xs text-slate-400 p-8 text-center">لا توجد اشتراكات مؤرشفة حالياً</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSubs.map((sub) => (
                  <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{sub.toolName} ({sub.planName})</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {sub.status === 'Archived' ? 'مؤرشف' : 'منتهي'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block font-mono">
                          الحساب: {sub.ownerEmail} • التكلفة: ${sub.cost}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          updateSubscription(sub.id, { status: 'Active' });
                          addToast('تمت استعادة الاشتراك', `تمت تفعيل خطة ${sub.toolName} بنجاح`);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>استعادة الاشتراك</span>
                      </button>

                      <button
                        onClick={() => setSelectedSubscriptionForDetails(sub)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`هل تريد حذف اشتراك "${sub.toolName} (${sub.planName})" نهائياً؟ لا يمكن التراجع عن الحذف.`)) {
                            deleteSubscriptions([sub.id], `${sub.toolName} (${sub.planName})`);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl"
                        title="حذف الاشتراك نهائياً"
                        aria-label={`حذف الاشتراك ${sub.toolName} ${sub.planName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
