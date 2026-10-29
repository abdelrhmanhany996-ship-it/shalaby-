import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, Mail, ArrowLeft, ArrowRight, User as UserIcon, Building, Sparkles, PlusCircle, CheckCircle2 } from 'lucide-react';
import { BrandMark } from '../common/BrandMark';

export const LoginPage: React.FC = () => {
  const { login, signup, t, currentLanguage, dir } = useApp();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup') {
      if (email) {
        signup(name, email, companyName);
      }
    } else {
      if (email) {
        login(email);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 lg:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-5xl bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* Left Side: Product Branding */}
        <div className="lg:col-span-7 bg-gradient-to-br from-indigo-900/50 via-slate-950 to-slate-950 p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-e border-slate-800/80 relative overflow-hidden">
          <div className="absolute top-0 end-0 -mt-10 -me-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="brand-mark w-11 h-11 rounded-2xl shadow-lg shadow-amber-500/30">
              <BrandMark className="w-11 h-11" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">{t('productTitle')}</h2>
              <span className="text-xs text-indigo-400 font-mono font-medium">Enterprise AI Governance</span>
            </div>
          </div>

          <div className="my-10 relative z-10 max-w-lg space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>نظام إدارة وحوكمة اشتراكات الذكاء الاصطناعي للمؤسسات</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              أنشئ حسابك الجديد وابدأ مساحة عمل خالية تماماً 100%
            </h1>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              تحكم كامل ومباشر في جميع اشتراكات ومصروفات الذكاء الاصطناعي مع إمكانية إضافة الموظفين والفرق والتراخيص بدون بيانات تجريبية سابقة.
            </p>

            <div className="pt-3 grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                <span className="text-indigo-400 font-mono font-bold text-lg block">$0</span>
                <span className="text-[11px] text-slate-400">بداية من الصفر</span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                <span className="text-emerald-400 font-mono font-bold text-lg block">0</span>
                <span className="text-[11px] text-slate-400">اشتراكات مضافة</span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                <span className="text-sky-400 font-mono font-bold text-lg block">100%</span>
                <span className="text-[11px] text-slate-400">خصوصية تامة</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 relative z-10 flex items-center justify-between border-t border-slate-900 pt-4">
            <span>© 2026 AI Resource Management Platform. All rights reserved.</span>
            <span className="font-mono text-[10px]">v2.5.0 Clean Workspace</span>
          </div>
        </div>

        {/* Right Side: Auth Form with Mode Toggle */}
        <div className="lg:col-span-5 p-8 lg:p-10 bg-slate-900/60 flex flex-col justify-center space-y-6">
          
          {/* Sign In vs Sign Up Tabs */}
          <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
                authMode === 'signup'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>إنشاء حساب جديد</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              className={`flex-1 py-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
                authMode === 'signin'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              {authMode === 'signup' ? 'إنشاء حساب مسؤول جديد' : 'تسجيل الدخول إلى حسابك'}
            </h2>
            <p className="text-xs text-slate-400">
              {authMode === 'signup' 
                ? 'أدخل بياناتك لإنشاء مساحة عمل خالية ومخصصة بالكامل لمؤسستك'
                : 'أدخل بريدك الإلكتروني للوصول إلى لوحة التحكم الخاصة بك'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">الاسم الكامل</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute start-3.5 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={authMode === 'signup'}
                    placeholder="مثال: عبدالرحمن هاني"
                    className="w-full ps-10 pe-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('emailLabel')}</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute start-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="w-full ps-10 pe-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium transition-colors"
                />
              </div>
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم الشركة / المؤسسة (اختياري)</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute start-3.5 top-3" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="مثال: Saber Group"
                    className="w-full ps-10 pe-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('passwordLabel')}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute start-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full ps-10 pe-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-400">{t('rememberMe')}</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>{authMode === 'signup' ? 'إنشاء الحساب وبدء مساحة العمل الفارغة' : t('signIn')}</span>
              {dir === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Toggle Hint */}
          <div className="text-center pt-2">
            {authMode === 'signup' ? (
              <p className="text-xs text-slate-400">
                لديك حساب بالفعل؟{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-indigo-400 font-bold hover:underline"
                >
                  تسجيل الدخول
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                ليس لديك حساب؟{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="text-indigo-400 font-bold hover:underline"
                >
                  إنشاء حساب جديد
                </button>
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

