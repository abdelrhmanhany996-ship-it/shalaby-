import React, { useState } from 'react';
import { KeyRound, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { ChangePasswordForm } from '../components/common/ChangePasswordForm';
import { isValidLoginId } from '../lib/loginId';
import { ShalabyLogo } from '../components/common/ShalabyLogo';
import { Credit } from '../components/common/Credit';
import { authErrorMessage, useAuth } from '../context/AuthContext';

type Mode = 'login' | 'forgot' | 'setup';

const inputCls =
  'w-full p-3 bg-[#0f131b] border border-white/10 text-[#dfe2ee] rounded-xl text-sm placeholder:text-[#8d9197] focus:outline-none focus:border-[#abcae9]/60';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    dir="rtl"
    className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-4 text-[#dfe2ee] font-sans"
  >
    <div className="w-full max-w-sm bg-[#1d1d1c] border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="flex justify-center mb-5">
        <ShalabyLogo size="xl" />
      </div>
      {children}
    </div>
    <Credit tone="dark" className="mt-5" />
  </div>
);

export const LoadingScreen: React.FC = () => (
  <Shell>
    <div className="flex justify-center py-6 text-[#abcae9]">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  </Shell>
);

/** What everyone but the developer sees while the site is closed for development. */
export const MaintenanceScreen: React.FC<{ message?: string; onDeveloperLogin?: () => void }> = ({ message, onDeveloperLogin }) => {
  const { logout, status } = useAuth();
  return (
    <Shell>
      <div className="text-center space-y-3">
        <h2 className="font-bold text-base">النظام تحت التطوير</h2>
        <p className="text-xs text-[#c3c7cd] leading-relaxed">
          {message || 'بنجهّز نسخة جديدة من النظام. هيرجع يشتغل قريب، وهنبلغكم أول ما يبقى جاهز.'}
        </p>
        {status !== 'signed_out' && status !== 'loading' && (
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#262a33] hover:bg-[#31353e] rounded-xl text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </button>
        )}
        {onDeveloperLogin && (
          <button onClick={onDeveloperLogin} className="block mx-auto text-[11px] text-[#6b7079] hover:text-[#abcae9] cursor-pointer">
            دخول المطوّر
          </button>
        )}
      </div>
    </Shell>
  );
};

export const BlockedScreen: React.FC<{ kind: 'no_profile' | 'inactive' }> = ({ kind }) => {
  const { logout, profile, signedInAs, isFounder, restoreFounder } = useAuth();
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState('');
  return (
    <Shell>
      <div className="text-center space-y-3">
        <ShieldAlert className="w-10 h-10 mx-auto text-[#e9c349]" />
        <h2 className="font-bold text-base">
          {kind === 'inactive' ? 'حسابك معطّل' : 'حسابك غير مفعّل في النظام'}
        </h2>
        <p className="text-xs text-[#c3c7cd] leading-relaxed">
          {kind === 'inactive'
            ? `الحساب ${profile?.email ?? ''} تم إيقافه. تواصل مع مدير النظام.`
            : 'تم تسجيل الدخول لكن لا توجد صلاحيات مرتبطة بحسابك. تواصل مع مدير النظام لتفعيله.'}
        </p>
        {/* Shown so whoever fixes it knows exactly which account this is. */}
        <p className="text-[11px] text-[#9aa0aa] leading-relaxed" dir="ltr">
          {signedInAs.email}
          <br />
          UID: {signedInAs.uid}
        </p>
        {kind === 'no_profile' && isFounder && (
          <div className="space-y-2">
            <p className="text-xs text-[#e9c349]">ده الحساب اللي جهّز النظام أول مرة، وتقدر ترجّع صلاحيات المطوّر بنفسك.</p>
            <button
              disabled={fixing}
              onClick={async () => {
                setFixing(true);
                setFixError('');
                try {
                  await restoreFounder();
                } catch {
                  setFixError('تعذر الاسترجاع. اتأكد إن قواعد Firestore الجديدة منشورة.');
                } finally {
                  setFixing(false);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#c8232b] hover:bg-[#ad1c24] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              استرجاع صلاحيات المطوّر
            </button>
            {fixError && <p className="text-xs text-red-300">{fixError}</p>}
          </div>
        )}
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#262a33] hover:bg-[#31353e] rounded-xl text-xs font-semibold cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> تسجيل الخروج
        </button>
      </div>
    </Shell>
  );
};

export const MustChangePasswordScreen: React.FC = () => {
  const { logout, profile } = useAuth();
  return (
    <Shell>
      <div className="text-center space-y-2 mb-4">
        <KeyRound className="w-9 h-9 mx-auto text-[#e9c349]" />
        <h2 className="font-bold text-base">اختار كلمة مرور جديدة</h2>
        <p className="text-xs text-[#c3c7cd] leading-relaxed">
          {profile?.name ? `أهلًا ${profile.name}. ` : ''}كلمة المرور اللي معاك مؤقتة من الإدارة. اكتبها في الخانة الأولى ثم اختار كلمتك الخاصة.
        </p>
      </div>
      <ChangePasswordForm submitLabel="حفظ والدخول" />
      <div className="text-center mt-4">
        <button onClick={logout} className="text-xs text-[#abcae9] hover:underline cursor-pointer">
          تسجيل الخروج
        </button>
      </div>
    </Shell>
  );
};

export const LoginPage: React.FC = () => {
  const { login, bootstrapAdmin, needsBootstrap } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        if (!isValidLoginId(email)) throw { code: 'auth/invalid-email' };
        await login(email, password);
      } else if (mode === 'setup') {
        if (!isValidLoginId(email)) throw { code: 'auth/invalid-email' };
        await bootstrapAdmin({ name, loginId: email, password, phone });
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <h1 className="text-center font-bold text-base mb-1">
        {mode === 'setup' ? 'إعداد النظام لأول مرة' : mode === 'forgot' ? 'نسيت كلمة المرور؟' : 'تسجيل الدخول'}
      </h1>
      <p className="text-center text-[11px] text-[#8d9197] mb-5">
        {mode === 'setup'
          ? 'أنشئ حساب المطوّر الأول. هذه الشاشة تظهر مرة واحدة فقط.'
          : 'نظام إدارة العملاء والمبيعات — SHALABY'}
      </p>

      {mode === 'forgot' ? (
        <div className="text-center space-y-3 text-sm leading-relaxed">
          <p>الإدارة هي اللي بتعيد تعيين كلمة المرور.</p>
          <p className="text-[#c3c7cd] text-xs">
            كلّم مديرك وهو هيديك كلمة مرور مؤقتة، وهتختار كلمتك الخاصة أول ما تدخل.
          </p>
        </div>
      ) : (
      <form onSubmit={submit} className="space-y-3">
        {mode === 'setup' && (
          <>
            <input className={inputCls} placeholder="الاسم الكامل" required value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inputCls} type="tel" dir="ltr" placeholder="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </>
        )}
        <input
          className={inputCls}
          dir="ltr"
          placeholder="رقم الموبايل أو اسم المستخدم"
          required
          autoComplete="username"
          inputMode="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={inputCls}
          type="password"
          dir="ltr"
          placeholder="كلمة المرور"
          required
          minLength={6}
          autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}
        {info && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#7295b3] hover:bg-[#82a5c3] disabled:opacity-60 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'setup' ? 'إنشاء حساب المطوّر' : 'دخول'}
        </button>
      </form>
      )}

      <div className="mt-4 text-center text-xs space-y-1.5">
        {mode === 'login' && (
          <button onClick={() => { setMode('forgot'); setError(''); }} className="text-[#abcae9] hover:underline cursor-pointer">
            نسيت كلمة المرور؟
          </button>
        )}
        {mode !== 'login' && (
          <button onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="text-[#abcae9] hover:underline cursor-pointer">
            العودة لتسجيل الدخول
          </button>
        )}
        {mode === 'login' && needsBootstrap && (
          <div>
            <button onClick={() => { setMode('setup'); setError(''); }} className="text-[#e9c349] hover:underline cursor-pointer">
              أول مرة؟ إعداد حساب المطوّر
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
};
