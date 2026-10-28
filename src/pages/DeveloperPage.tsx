import { BackupPanel } from "../components/common/BackupPanel";
import { DEFAULT_AI_PER_DAY, DEFAULT_AI_PER_HOUR, DEFAULT_SUGGESTIONS_PER_DAY, branchQuota, userQuota } from "../lib/license";
import { useEffect, useMemo, useState } from "react";
import { Calculator, Code2, RefreshCw, Server } from "lucide-react";
import { auth } from "../lib/firebase";
import { adminStatus } from "../lib/adminClient";
import { useCRM } from "../context/CRMContext";

interface Bucket { calls: number; q?: number; in: number; out: number; think: number; audio: number }
interface UserBucket extends Bucket { modes: Record<string, Bucket>; last: number; activeDays: number }
interface Usage {
  days: number;
  windowDays: number;
  byMode: Record<string, Bucket>;
  byDay: Record<string, Bucket>;
  byUser: Record<string, UserBucket>;
  activeUsers: number;
  recent: { t: number; uid: string; mode: string; in: number; out: number; audio: number }[];
}

const PRICE_KEY = "almasar_crm_v1_dev_prices";
// Approximate public list prices per 1M tokens (USD). Editable: they change by model and over time.
const DEFAULT_PRICES = { textIn: 0.3, audioIn: 1.0, out: 2.5, egp: 50 };
const MODE_LABELS: Record<string, string> = {
  agent: "زكي (الشات بالأدوات)",
  weekly: "الملخص الأسبوعي",
  transcribe: "تحويل الصوت لنص",
  refine: "تحسين النص",
  brief: "ملخص العميل",
  classify: "تصنيف الشكاوى",
  unknown: "غير مصنّف",
};
const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
const money = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

function useNumber(key: string, initial: number) {
  const [v, setV] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(`almasar_crm_v1_dev_${key}`);
      return raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`almasar_crm_v1_dev_${key}`, String(v));
    } catch {
      /* ignore */
    }
  }, [key, v]);
  return [v, setV] as const;
}

function Num({ label, value, onChange, step = 1, hint }: { label: string; value: number; onChange: (n: number) => void; step?: number; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" min="0" step={step} dir="ltr" value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
      {hint && <small className="table-secondary">{hint}</small>}
    </label>
  );
}

/** Developer-only tools: real AI token usage, a what-if cost calculator, and service health. */
export function DeveloperPage() {
  const { currentUser, users: staff, clearOrganizationData, license, setLicense, branches } = useCRM();
  const [maxBranches, setMaxBranches] = useState<number>(license.maxBranches);
  useEffect(() => setMaxBranches(license.maxBranches), [license.maxBranches]);
  const quota = branchQuota(branches, license);
  const uQuota = userQuota(staff, license);
  const [maxUsers, setMaxUsers] = useState<number>(uQuota.max);
  useEffect(() => setMaxUsers(uQuota.max), [uQuota.max]);
  const curHour = license.aiPerHour ?? DEFAULT_AI_PER_HOUR;
  const curDay = license.aiPerDay ?? DEFAULT_AI_PER_DAY;
  const [aiHour, setAiHour] = useState<number>(curHour);
  const [aiDay, setAiDay] = useState<number>(curDay);
  const curSug = license.suggestionsPerDay ?? DEFAULT_SUGGESTIONS_PER_DAY;
  const [sugDay, setSugDay] = useState<number>(curSug);
  useEffect(() => setSugDay(curSug), [curSug]);
  useEffect(() => setAiHour(curHour), [curHour]);
  useEffect(() => setAiDay(curDay), [curDay]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminOk, setAdminOk] = useState<boolean | null>(null);
  const [aiOk, setAiOk] = useState<boolean | null>(null);

  const [pTextIn, setPTextIn] = useNumber("p_text_in", DEFAULT_PRICES.textIn);
  const [pAudioIn, setPAudioIn] = useNumber("p_audio_in", DEFAULT_PRICES.audioIn);
  const [pOut, setPOut] = useNumber("p_out", DEFAULT_PRICES.out);
  const [egp, setEgp] = useNumber("egp", DEFAULT_PRICES.egp);

  const cost = (b: Bucket) => ((Math.max(b.in - b.audio, 0) * pTextIn + b.audio * pAudioIn + (b.out + b.think) * pOut) / 1_000_000);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/ai.php?usage=1", { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setUsage(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل الاستهلاك");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    adminStatus().then(setAdminOk);
    fetch("/api/ai.php?ping=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAiOk(!!d?.configured))
      .catch(() => setAiOk(false));
  }, []);

  const nameOf = (uid: string) => {
    const u = staff.find((x) => x.authUid === uid);
    return u ? u.name : uid.length > 8 ? `مستخدم ${uid.slice(0, 6)}…` : `مستخدم قديم (${uid})`;
  };
  const when = (t: number) => new Date(t * 1000).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const userRows = useMemo(
    () =>
      Object.entries(usage?.byUser ?? {})
        .map(([uid, b]) => ({ uid, b, c: cost(b) }))
        .sort((a, b) => b.c - a.c),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usage, pTextIn, pAudioIn, pOut],
  );
  const loginUsers = staff.filter((u) => u.authUid && u.active).length;
  const [projUsers, setProjUsers] = useNumber("proj_users", Math.max(loginUsers, 1));
  const [projDays, setProjDays] = useNumber("proj_days", 22);
  // Measured: money per person per day they actually used the AI.
  const proj = useMemo(() => {
    const totalCost = userRows.reduce((a, r) => a + r.c, 0);
    const personDays = userRows.reduce((a, r) => a + r.b.activeDays, 0);
    const perDay = personDays ? totalCost / personDays : 0;
    const heaviest = userRows.reduce((m, r) => Math.max(m, r.b.activeDays ? r.c / r.b.activeDays : 0), 0);
    const monthly = projUsers * projDays * perDay;
    return { perDay, heaviest, monthly, worst: projUsers * projDays * heaviest, personDays };
  }, [userRows, projUsers, projDays]);

  const total = useMemo(() => {
    const t: Bucket = { calls: 0, in: 0, out: 0, think: 0, audio: 0 };
    for (const b of Object.values(usage?.byMode ?? {})) for (const k of ["calls", "in", "out", "think", "audio"] as const) t[k] += b[k];
    return t;
  }, [usage]);
  const days = Object.entries(usage?.byDay ?? {}).slice(-14);
  const maxDay = Math.max(1, ...days.map(([, b]) => b.in + b.out));
  const agent = usage?.byMode?.agent;

  // What-if calculator (defaults come from measured usage when available)
  const [users, setUsers] = useNumber("c_users", 10);
  const [qPerDay, setQPerDay] = useNumber("c_q", 8);
  const [steps, setSteps] = useNumber("c_steps", 2.5);
  const [inTok, setInTok] = useNumber("c_in", agent ? Math.round(agent.in / agent.calls) : 3500);
  const [outTok, setOutTok] = useNumber("c_out", agent ? Math.round(agent.out / agent.calls) : 350);
  const [voice, setVoice] = useNumber("c_voice", 3);
  const [voiceSec, setVoiceSec] = useNumber("c_voice_sec", 20);
  const [weekly, setWeekly] = useNumber("c_weekly", 2);
  const [days_, setDays] = useNumber("c_days", 26);

  const calc = useMemo(() => {
    const agentCalls = users * qPerDay * steps * days_;
    const agentCost = (agentCalls * (inTok * pTextIn + outTok * pOut)) / 1_000_000;
    const voiceClips = users * voice * days_;
    const audioTok = voiceSec * 32; // ~32 tokens per second of audio
    const voiceCost = (voiceClips * (audioTok * pAudioIn + 120 * pTextIn + 80 * pOut)) / 1_000_000;
    const weeklyRuns = Math.max(1, Math.round(users / 5)) * weekly * 4.3;
    const weeklyCost = (weeklyRuns * (9000 * pTextIn + 700 * pOut)) / 1_000_000;
    const usd = agentCost + voiceCost + weeklyCost;
    return { agentCalls, agentCost, voiceClips, voiceCost, weeklyRuns, weeklyCost, usd, perUser: users ? usd / users : 0 };
  }, [users, qPerDay, steps, days_, inTok, outTok, voice, voiceSec, weekly, pTextIn, pAudioIn, pOut]);

  const Dot = ({ ok }: { ok: boolean | null }) => (
    <i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 99, marginInlineEnd: 8, background: ok === null ? "#999" : ok ? "#15803d" : "#c8232b" }} />
  );

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">للمطورين فقط</span>
          <h1>قسم المطورين</h1>
          <p>أدوات تقنية لا تظهر لغيرك: استهلاك الذكاء الاصطناعي، حاسبة تكلفة تقريبية، وحالة الخدمات. أهلًا {currentUser.name}.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              <Server size={18} style={{ display: "inline", marginInlineEnd: 6 }} />
              حالة الخدمات
            </h2>
          </div>
        </div>
        <p style={{ margin: "0 6px 8px" }}>
          <Dot ok={aiOk} /> الذكاء الاصطناعي (<code>api/ai.php</code>): {aiOk === null ? "جاري الفحص…" : aiOk ? "شغّال" : "مش مفعّل (مفتاح Gemini ناقص)"}
        </p>
        <p style={{ margin: "0 6px 8px" }}>
          <Dot ok={adminOk} /> إعادة تعيين كلمات المرور (<code>api/admin.php</code>): {adminOk === null ? "جاري الفحص…" : adminOk ? "شغّال" : "مش مفعّل (ملف Firebase Admin ناقص)"}
        </p>
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div>
            <h2>تفريغ الهيكل والموظفين التجريبيين</h2>
            <p>
              بيمسح الفروع والمقرات والشركات والمخازن والفرق والأقسام والمسميات الوظيفية والموظفين التجريبيين من قاعدة البيانات عشان تضيف الحقيقي من الأول. المحافظات والمدن
              بتفضل، وأي موظف ليه حساب دخول فعلي بيفضل.
            </p>
          </div>
          <button
            className="btn-secondary"
            style={{ color: "#c8232b", borderColor: "#c8232b" }}
            onClick={async () => {
              if (window.confirm("هتمسح كل الفروع والشركات والمخازن والفرق والأقسام والمسميات والموظفين التجريبيين. متأكد؟")) {
                await clearOrganizationData();
                window.alert("تم التفريغ. ابدأ بإضافة الشركة ثم الفروع من صفحة الهيكل الإداري.");
              }
            }}
          >
            تفريغ الهيكل
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div>
            <h2>باقة الشركة (الفروع والمستخدمين والذكاء الاصطناعي)</h2>
            <p>الحدود المتاحة لصاحب البيزنس. الفروع والمستخدمين التجريبيين وحساب المطوّر مش بيتحسبوا. أنت بس اللي تقدر تغيّرها.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", padding: "0 22px 20px" }}>
          <Num label="أقصى عدد فروع" value={maxBranches} onChange={setMaxBranches} hint={`مستخدم دلوقتي: ${quota.used} من ${quota.max}`} />
          <Num label="أقصى عدد مستخدمين" value={maxUsers} onChange={setMaxUsers} hint={`مستخدم دلوقتي: ${uQuota.used} من ${uQuota.max}`} />
          <Num label="طلبات الذكاء الاصطناعي في الساعة (لكل حساب)" value={aiHour} onChange={setAiHour} hint="لو عدّى الحد بيتوقف مؤقتًا" />
          <Num label="طلبات الذكاء الاصطناعي في اليوم (لكل حساب)" value={aiDay} onChange={setAiDay} hint="حماية من الإساءة وتكلفة زايدة" />
          <Num label="اقتراحات زكي في اليوم (لكل سيلز)" value={sugDay} onChange={setSugDay} hint="الحد الأقصى لاقتراحات المتابعة" />
          <button
            className="btn-primary"
            disabled={
              maxBranches < 1 || maxUsers < 1 || aiHour < 1 || aiDay < 1 || sugDay < 1 ||
              (maxBranches === license.maxBranches && maxUsers === uQuota.max && aiHour === curHour && aiDay === curDay && sugDay === curSug)
            }
            onClick={() => setLicense({ maxBranches, maxUsers, aiPerHour: aiHour, aiPerDay: aiDay, suggestionsPerDay: sugDay })}
          >
            حفظ الباقة
          </button>
        </div>
      </section>

      <BackupPanel />

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div>
            <h2>
              <Code2 size={18} style={{ display: "inline", marginInlineEnd: 6 }} />
              استهلاك الذكاء الاصطناعي الفعلي (آخر 30 يوم)
            </h2>
            <p>الأرقام من سجل السيرفر (عدد التوكنز فقط، من غير أي محتوى). التكلفة تقريبية حسب الأسعار تحت.</p>
          </div>
          <button className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> تحديث
          </button>
        </div>
        {error && <p className="notice warning">تعذر التحميل: {error}</p>}
        {usage && Object.keys(usage.byMode).length === 0 && <p className="quiet-note">لسه مفيش استخدام مسجّل. هيبدأ يظهر بعد أول استخدام لزكي أو الصوت.</p>}
        {usage && Object.keys(usage.byMode).length > 0 && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الخدمة</th>
                  <th>الطلبات</th>
                  <th>توكنز الإدخال</th>
                  <th>منها صوت</th>
                  <th>توكنز الإخراج</th>
                  <th>تكلفة تقريبية</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(usage.byMode).map(([mode, b]) => (
                  <tr key={mode}>
                    <td>{MODE_LABELS[mode] ?? mode}</td>
                    <td>{fmt(b.calls)}</td>
                    <td>{fmt(b.in)}</td>
                    <td>{fmt(b.audio)}</td>
                    <td>{fmt(b.out + b.think)}</td>
                    <td>
                      ${money(cost(b), 3)} · {money(cost(b) * egp)} ج.م
                    </td>
                  </tr>
                ))}
                <tr>
                  <td><strong>الإجمالي</strong></td>
                  <td><strong>{fmt(total.calls)}</strong></td>
                  <td><strong>{fmt(total.in)}</strong></td>
                  <td><strong>{fmt(total.audio)}</strong></td>
                  <td><strong>{fmt(total.out + total.think)}</strong></td>
                  <td><strong>${money(cost(total), 3)} · {money(cost(total) * egp)} ج.م</strong></td>
                </tr>
              </tbody>
            </table>
            <p className="table-secondary" style={{ margin: 10 }}>
              مستخدمون نشطون: {usage.activeUsers} · متوسط طلب زكي: {agent ? `${fmt(agent.in / agent.calls)} توكن إدخال / ${fmt(agent.out / agent.calls)} إخراج` : "—"}
            </p>
            {days.length > 0 && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90, margin: "6px 10px 14px" }} aria-label="الاستهلاك اليومي">
                {days.map(([d, b]) => (
                  <div key={d} title={`${d}: ${fmt(b.in + b.out)} توكن، ${b.calls} طلب`} style={{ flex: 1, textAlign: "center", fontSize: 10 }}>
                    <div style={{ height: `${Math.max(4, ((b.in + b.out) / maxDay) * 70)}px`, background: "#c8232b", borderRadius: 4, opacity: 0.85 }} />
                    {d.slice(5)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {userRows.length > 0 && (
          <div className="overflow-x-auto" style={{ marginTop: 8 }}>
            <h3 style={{ margin: "8px 10px" }}>كل مستخدم استهلك قد إيه</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>أسئلة زكي</th>
                  <th>ملاحظات صوتية</th>
                  <th>إجمالي الطلبات</th>
                  <th>توكنز (إدخال / إخراج)</th>
                  <th>أيام الاستخدام</th>
                  <th>آخر استخدام</th>
                  <th>التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map(({ uid, b, c }) => (
                  <tr key={uid}>
                    <td>{nameOf(uid)}</td>
                    <td>{fmt(b.modes.agent?.q ?? 0)}</td>
                    <td>{fmt(b.modes.transcribe?.calls ?? 0)}</td>
                    <td>{fmt(b.calls)}</td>
                    <td>
                      {fmt(b.in)} / {fmt(b.out + b.think)}
                    </td>
                    <td>{b.activeDays}</td>
                    <td>{b.last ? when(b.last) : "—"}</td>
                    <td>
                      ${money(c, 3)} · {money(c * egp)} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {usage && usage.recent.length > 0 && (
          <details style={{ margin: "10px 10px 6px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>آخر الطلبات (طلب بطلب)</summary>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الوقت</th>
                    <th>المستخدم</th>
                    <th>الخدمة</th>
                    <th>إدخال</th>
                    <th>إخراج</th>
                    <th>تكلفة الطلب</th>
                  </tr>
                </thead>
                <tbody>
                  {[...usage.recent].reverse().map((r, i) => {
                    const c = cost({ calls: 1, in: r.in, out: r.out, think: 0, audio: r.audio });
                    return (
                      <tr key={i}>
                        <td>{when(r.t)}</td>
                        <td>{nameOf(r.uid)}</td>
                        <td>{MODE_LABELS[r.mode] ?? r.mode}</td>
                        <td>{fmt(r.in)}</td>
                        <td>{fmt(r.out)}</td>
                        <td>{money(c * egp, 3)} ج.م</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        )}
        <details style={{ margin: "6px 10px 12px" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>الأسعار المستخدمة في الحساب (قابلة للتعديل)</summary>
          <div className="field-grid" style={{ marginTop: 10 }}>
            <Num label="إدخال نصي ($ لكل مليون توكن)" value={pTextIn} onChange={setPTextIn} step={0.05} />
            <Num label="إدخال صوتي ($ لكل مليون)" value={pAudioIn} onChange={setPAudioIn} step={0.05} />
            <Num label="إخراج ($ لكل مليون)" value={pOut} onChange={setPOut} step={0.05} />
            <Num label="سعر الدولار بالجنيه" value={egp} onChange={setEgp} />
          </div>
          <p className="table-secondary">الأسعار تقريبية وتتغير حسب النموذج. راجع صفحة أسعار Gemini الرسمية وعدّلها هنا.</p>
        </details>
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div>
            <h2>
              <Calculator size={18} style={{ display: "inline", marginInlineEnd: 6 }} />
              توقّع واقعي من استخدامك الفعلي
            </h2>
            <p>
              محسوب من الطلبات المسجّلة فعلًا ({usage?.windowDays ?? 0} يوم بيانات): متوسط تكلفة الشخص في اليوم اللي بيستخدم فيه الذكاء الاصطناعي × عدد الناس × عدد
              الأيام.
            </p>
          </div>
        </div>
        {proj.personDays === 0 ? (
          <p className="quiet-note">لسه مفيش استخدام كفاية. جرّب زكي والصوت شوية وارجع هنا.</p>
        ) : (
          <>
            <div className="field-grid" style={{ padding: "0 6px" }}>
              <Num label="عدد المستخدمين المتوقع" value={projUsers} onChange={setProjUsers} hint={`حاليًا عندهم حساب: ${loginUsers}`} />
              <Num label="أيام الاستخدام للشخص في الشهر" value={projDays} onChange={setProjDays} />
            </div>
            <div className="metric-grid" style={{ margin: "14px 6px 8px" }}>
              <div className="metric">
                <span className="metric-top">التكلفة الشهرية المتوقعة</span>
                <strong className="metric-value">${money(proj.monthly)}</strong>
                <span className="metric-note">≈ {money(proj.monthly * egp, 0)} ج.م</span>
              </div>
              <div className="metric">
                <span className="metric-top">متوسط الشخص في اليوم</span>
                <strong className="metric-value">${money(proj.perDay, 4)}</strong>
                <span className="metric-note">≈ {money(proj.perDay * egp, 2)} ج.م · من {proj.personDays} يوم استخدام</span>
              </div>
              <div className="metric">
                <span className="metric-top">لو الكل زي أكتر واحد استخدامًا</span>
                <strong className="metric-value">${money(proj.worst)}</strong>
                <span className="metric-note">≈ {money(proj.worst * egp, 0)} ج.م في الشهر</span>
              </div>
            </div>
            <p className="table-secondary" style={{ margin: "0 10px 12px" }}>
              كل ما البيانات تزيد الرقم بيبقى أدق. الأسعار من الجزء اللي فوق، وتقدر تعدّلها.
            </p>
          </>
        )}
      </section>

      <details className="panel" style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, padding: "6px 10px" }}>حاسبة يدوية (لو مفيش استخدام فعلي لسه)</summary>
        <div className="panel-header">
          <div>
            <h2>
              <Calculator size={18} style={{ display: "inline", marginInlineEnd: 6 }} />
              حاسبة تكلفة تقريبية (ماذا لو؟)
            </h2>
            <p>غيّر الأرقام وشوف التكلفة الشهرية المتوقعة. القيم الافتراضية للتوكنز من استخدامك الفعلي لو متاح.</p>
          </div>
        </div>
        <div className="field-grid" style={{ padding: "0 6px" }}>
          <Num label="عدد المستخدمين" value={users} onChange={setUsers} />
          <Num label="أسئلة زكي لكل مستخدم في اليوم" value={qPerDay} onChange={setQPerDay} />
          <Num label="متوسط خطوات الأدوات لكل سؤال" value={steps} onChange={setSteps} step={0.5} hint="كل خطوة = طلب للنموذج" />
          <Num label="توكنز الإدخال لكل طلب" value={inTok} onChange={setInTok} step={100} />
          <Num label="توكنز الإخراج لكل طلب" value={outTok} onChange={setOutTok} step={50} />
          <Num label="ملاحظات صوتية لكل مستخدم في اليوم" value={voice} onChange={setVoice} />
          <Num label="متوسط مدة الملاحظة (ثانية)" value={voiceSec} onChange={setVoiceSec} />
          <Num label="ملخصات أسبوعية لكل مدير في الأسبوع" value={weekly} onChange={setWeekly} />
          <Num label="أيام العمل في الشهر" value={days_} onChange={setDays} />
        </div>
        <div className="metric-grid" style={{ margin: "14px 6px 8px" }}>
          <div className="metric">
            <span className="metric-top">التكلفة الشهرية المتوقعة</span>
            <strong className="metric-value">${money(calc.usd)}</strong>
            <span className="metric-note">≈ {money(calc.usd * egp, 0)} ج.م</span>
          </div>
          <div className="metric">
            <span className="metric-top">لكل مستخدم في الشهر</span>
            <strong className="metric-value">${money(calc.perUser, 3)}</strong>
            <span className="metric-note">≈ {money(calc.perUser * egp)} ج.م</span>
          </div>
          <div className="metric">
            <span className="metric-top">تفصيل</span>
            <span className="metric-note" style={{ display: "block", lineHeight: 1.9 }}>
              زكي: ${money(calc.agentCost)} ({fmt(calc.agentCalls)} طلب)
              <br />
              الصوت: ${money(calc.voiceCost)} ({fmt(calc.voiceClips)} ملاحظة)
              <br />
              الملخص الأسبوعي: ${money(calc.weeklyCost)} ({fmt(calc.weeklyRuns)} ملخص)
            </span>
          </div>
        </div>
        <p className="table-secondary" style={{ margin: "0 10px 12px" }}>
          تقدير فقط: الصوت ≈ 32 توكن لكل ثانية، والملخص الأسبوعي ≈ 9,000 إدخال / 700 إخراج. التكلفة الفعلية تظهر في لوحة Google AI Studio.
        </p>
      </details>
    </div>
  );
}
