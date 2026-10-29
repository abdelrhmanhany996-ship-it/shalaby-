import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  User, Building2, ShieldCheck, Bell, Palette, 
  Check, Save, Globe, Lock, Sun, Moon, Copy 
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { currentUser, currentLanguage, setLanguage, addToast, clearAllData, loadDemoData, isDarkMode, toggleDarkMode, t } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'org' | 'roles' | 'notifications' | 'appearance'>('profile');

  // Form State
  const [userName, setUserName] = useState(currentUser?.name || 'Ahmed Hassan');
  const [orgName, setOrgName] = useState('AI Enterprise Tech');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('تم الحفظ', 'تمت تحديث إعدادات الملف الشخصي بنجاح');
  };

  const permissions = [
    { name: 'إدارة الاشتراكات والتكاليف', admin: true, manager: true, leader: false, user: false },
    { name: 'إضافة وحذف المستخدمين', admin: true, manager: true, leader: false, user: false },
    { name: 'إنشاء الفرق وتحديد الميزانية', admin: true, manager: true, leader: true, user: false },
    { name: 'تصدير التقارير المالية CSV', admin: true, manager: true, leader: true, user: false },
    { name: 'استعمال أدوات الذكاء الاصطناعي المخصصة', admin: true, manager: true, leader: true, user: true },
    { name: 'تلقي تنبيهات وتذكيرات التجديد', admin: true, manager: true, leader: true, user: true }
  ];

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t('settings')}
        </h1>
        <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
          تخصيص تفضيلات المنصة، بيانات المؤسسة، وإدارة صلاحيات الأدوار.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2">
        {[
          { id: 'profile', label: t('profile'), icon: <User className="w-4 h-4" /> },
          { id: 'org', label: t('organization'), icon: <Building2 className="w-4 h-4" /> },
          { id: 'roles', label: t('usersAndRoles'), icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'data', label: 'إدارة البيانات (البدء من الصفر)', icon: <Lock className="w-4 h-4" /> },
          { id: 'appearance', label: t('appearance'), icon: <Palette className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs max-w-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">الملف الشخصي</h3>
          
          <div className="flex items-center gap-4 py-2">
            <img src={currentUser?.avatar} alt={currentUser?.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500/20" />
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">{currentUser?.name}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{currentUser?.email}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم بالكامل</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-medium"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{t('save')}</span>
            </button>
          </div>
        </form>
      )}

      {/* Organization Settings */}
      {activeTab === 'org' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs max-w-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">بيانات المؤسسة والفوترة</h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المؤسسة / الشركة</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">العملة المعتمدة للحسابات</label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-semibold"
            >
              <option value="USD">USD ($) - الدولار الأمريكي</option>
              <option value="EUR">EUR (€) - اليورو</option>
              <option value="AED">AED (د.إ) - الدرهم الإماراتي</option>
            </select>
          </div>

          <button
            onClick={() => addToast('تم الحفظ', 'تمت تحديث بيانات المؤسسة بنجاح')}
            className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>حفظ التعديلات</span>
          </button>
        </div>
      )}

      {/* Roles & Permissions Matrix */}
      {activeTab === 'roles' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('permissionsTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">جدول مصفوفة الصلاحيات حسب أدوار المستخدمين في النظام</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                <tr>
                  <th className="p-3 text-start">الصلاحية</th>
                  <th className="p-3 text-center">Super Admin</th>
                  <th className="p-3 text-center">Manager</th>
                  <th className="p-3 text-center">Team Leader</th>
                  <th className="p-3 text-center">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {permissions.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{p.name}</td>
                    <td className="p-3 text-center">{p.admin ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto stroke-[3]" /> : '-'}</td>
                    <td className="p-3 text-center">{p.manager ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto stroke-[3]" /> : '-'}</td>
                    <td className="p-3 text-center">{p.leader ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto stroke-[3]" /> : '-'}</td>
                    <td className="p-3 text-center">{p.user ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto stroke-[3]" /> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Management Section */}
      {(activeTab as string) === 'data' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs max-w-xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">إدارة بيانات المنصة (تفريغ أو تحضير للبدء)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              يمكنك تصفيير جميع القوائم والاشتراكات للبدء في إضافة بيانات شركتك الحقيقية يدوياً، أو استعادة البيانات التوضيحية مجدداً.
            </p>
          </div>

          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-3">
            <div>
              <span className="text-xs font-bold text-rose-900 dark:text-rose-200 block">بدء الحساب فارغاً (Clear Platform)</span>
              <span className="text-[11px] text-rose-700 dark:text-rose-300">
                يقوم بمسح جميع الاشتراكات والمستخدمين والفرق المسجلة حالياً لتتمكن من إدخال بياناتك من الصفر.
              </span>
            </div>

            <button
              onClick={() => {
                if (window.confirm('هل أنت تأكد من تصفيير كافة القوائم للبدء من الصفر؟')) {
                  clearAllData();
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              مسح البيانات والبدء بحساب فارغ
            </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">تحميل البيانات النموذجية (Load Sample Demo Data)</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                استعادة الاشتراك والحسابات النموذجية الجاهزة للتجربة والعرض الاحترافي.
              </span>
            </div>

            <button
              onClick={() => loadDemoData()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              تحميل السجلات التجريبية النموذجية
            </button>
          </div>
        </div>
      )}

      {/* Appearance & Language */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs max-w-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">المظهر ولغة الواجهة</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">اختر نمط الألوان المفضل ولغة عرض المنصة</p>
          </div>

          {/* Theme selection cards */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">اختر نمط المظهر (Theme Mode):</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Light Mode Card */}
              <button
                type="button"
                onClick={() => { if (isDarkMode) toggleDarkMode(); }}
                className={`p-4 rounded-2xl border text-start transition-all flex flex-col justify-between gap-3 relative ${
                  !isDarkMode
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 font-bold">
                    <Sun className="w-5 h-5" />
                  </div>
                  {!isDarkMode && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">الوضع الفاتح (Light Mode)</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">ألوان ناصعة ومشرقة مناسبة لإضاءة النهار</span>
                </div>
              </button>

              {/* Dark Mode Card */}
              <button
                type="button"
                onClick={() => { if (!isDarkMode) toggleDarkMode(); }}
                className={`p-4 rounded-2xl border text-start transition-all flex flex-col justify-between gap-3 relative ${
                  isDarkMode
                    ? 'border-indigo-500 bg-slate-800/80 ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-indigo-950 text-indigo-400 font-bold">
                    <Moon className="w-5 h-5" />
                  </div>
                  {isDarkMode && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">الوضع الداكن (Dark Mode)</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">نمط ليل داكن مريح للعين وتقليل إجهاد النظر</span>
                </div>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between pt-4">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">لغة النظام العامة</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">يدعم الواجهة العربية الكاملة RTL والإنجليزية LTR</span>
            </div>

            <button
              type="button"
              onClick={() => setLanguage(currentLanguage === 'ar' ? 'en' : 'ar')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              {currentLanguage === 'ar' ? 'التحويل إلى English' : 'التحويل إلى العربية'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
