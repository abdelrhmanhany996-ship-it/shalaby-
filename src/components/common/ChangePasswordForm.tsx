import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authErrorMessage, useAuth } from "../../context/AuthContext";

const inputCls =
  "w-full p-3 bg-[#0f131b] border border-white/10 text-[#dfe2ee] rounded-xl text-sm placeholder:text-[#8d9197] focus:outline-none focus:border-[#abcae9]/60";

/** Change your own password (current + new). Used from the account menu and after an admin reset. */
export function ChangePasswordForm({ onDone, submitLabel = "تغيير كلمة المرور" }: { onDone?: () => void; submitLabel?: string }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next.length < 6) return setError("كلمة المرور الجديدة 6 أحرف على الأقل");
    if (next !== again) return setError("تأكيد كلمة المرور غير مطابق");
    if (next === current) return setError("كلمة المرور الجديدة لازم تختلف عن الحالية");
    setLoading(true);
    try {
      await changePassword(current, next);
      setOk(true);
      setCurrent("");
      setNext("");
      setAgain("");
      onDone?.();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className={inputCls} type="password" dir="ltr" placeholder="كلمة المرور الحالية" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      <input className={inputCls} type="password" dir="ltr" placeholder="كلمة المرور الجديدة" autoComplete="new-password" required minLength={6} value={next} onChange={(e) => setNext(e.target.value)} />
      <input className={inputCls} type="password" dir="ltr" placeholder="تأكيد كلمة المرور الجديدة" autoComplete="new-password" required minLength={6} value={again} onChange={(e) => setAgain(e.target.value)} />
      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}
      {ok && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">تم تغيير كلمة المرور بنجاح</p>}
      <button type="submit" disabled={loading} className="w-full py-3 bg-[#7295b3] hover:bg-[#82a5c3] disabled:opacity-60 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}
