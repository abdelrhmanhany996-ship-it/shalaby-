import { useCallback, useEffect, useState } from "react";
import { DatabaseBackup, Copy } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { adminStatus, backupStatus, listBackups, startBackup } from "../../lib/adminClient";

const PROJECT = "shalaby-group";
const pointTime = (p: string) => {
  const m = p.match(/^manual-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})$/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toLocaleString("ar-EG") : p;
};

/** Developer only: make a restore point now, see the ones already made, and get the exact command to go back to one. */
export function BackupPanel() {
  const { logAudit } = useCRM();
  const [ready, setReady] = useState<boolean | null>(null);
  const [points, setPoints] = useState<string[]>([]);
  const [bucket, setBucket] = useState(`${PROJECT}-backups`);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [when, setWhen] = useState("");
  const [copied, setCopied] = useState("");

  const refresh = useCallback(async () => {
    try {
      const r = await listBackups();
      setPoints(r.points);
      setBucket(r.bucket);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر قراءة نقاط الاسترجاع.");
    }
  }, []);
  useEffect(() => {
    adminStatus().then((ok) => {
      setReady(ok);
      if (ok) void refresh();
    });
  }, [refresh]);

  const run = async () => {
    if (!window.confirm("هنعمل نسخة كاملة من كل البيانات الحالية في Cloud Storage (نقطة استرجاع). بتتحسب تكلفة قراءة صغيرة وتخزين الملف. نكمّل؟")) return;
    setBusy(true);
    setError("");
    setMessage("بنبدأ التصدير…");
    try {
      const start = await startBackup();
      for (let i = 0; i < 100; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const s = await backupStatus(start.operation);
        if (s.error) throw new Error(s.error);
        if (s.done) {
          setMessage(`تمت نقطة الاسترجاع: ${pointTime(start.point)}`);
          logAudit("نقطة استرجاع", "نظام", start.point, `إنشاء نقطة استرجاع ${start.point} في ${start.bucket}`);
          await refresh();
          return;
        }
        setMessage("التصدير شغال…");
      }
      setMessage("التصدير لسه شغال في الخلفية. حدّث القايمة بعد شوية.");
    } catch (e) {
      setMessage("");
      setError(e instanceof Error ? e.message : "تعذر إنشاء نقطة الاسترجاع.");
    } finally {
      setBusy(false);
    }
  };

  const cloneCommand = when
    ? `gcloud firestore databases clone --source-database='projects/${PROJECT}/databases/(default)' --snapshot-time='${new Date(when).toISOString().slice(0, 16)}:00Z' --destination-database='restore-${when.replace(/[^0-9]/g, "").slice(0, 12)}' --project=${PROJECT}`
    : "";
  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      /* the command is selectable */
    }
  };

  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div className="panel-header">
        <div>
          <h2>
            <DatabaseBackup size={18} style={{ display: "inline", marginInlineEnd: 6 }} />
            نقاط الاسترجاع
          </h2>
          <p>نسخة كاملة من البيانات في لحظة معينة، محفوظة في Cloud Storage ({bucket}). اعملها قبل أي تحديث كبير أو حذف جماعي.</p>
        </div>
        <button className="btn-primary" onClick={() => void run()} disabled={busy || ready !== true}>
          {busy ? "جاري…" : "نقطة استرجاع الآن"}
        </button>
      </div>
      {ready === false && <p className="notice warning">السيرفر مش متوصّل بمفتاح Firebase Admin، فالزرار مش هيشتغل. شوف خطوات الإعداد في docs/backups.md.</p>}
      {message && <p className="notice" role="status">{message}</p>}
      {error && <p className="notice warning" role="alert">{error}</p>}
      <div style={{ padding: "0 22px 18px" }}>
        {points.length ? (
          <ul className="suggestion-data">
            {points.map((p) => (
              <li key={p}>
                <strong>{pointTime(p)}</strong> · <span dir="ltr">gs://{bucket}/{p}</span>{" "}
                <button className="btn-text" onClick={() => void copy(`gcloud firestore import gs://${bucket}/${p} --project=${PROJECT}`, p)}>
                  <Copy size={12} /> {copied === p ? "اتنسخ" : "نسخ أمر الاسترجاع"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          ready && !error && <p className="table-secondary">لسه ما اتعملتش نقاط استرجاع.</p>
        )}
        <details>
          <summary>الرجوع لوقت معيّن (آخر 7 أيام)</summary>
          <p className="table-secondary">لازم يكون «الاسترجاع لأي دقيقة» (PITR) متفعّل. الأمر بيعمل قاعدة بيانات جديدة بحالتها في الوقت ده من غير ما يكتب فوق الأصلية.</p>
          <label className="field">
            <span>الوقت المطلوب</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
          {cloneCommand && (
            <>
              <pre className="review-preview" dir="ltr" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{cloneCommand}</pre>
              <button className="btn-secondary" onClick={() => void copy(cloneCommand, "clone")}>
                <Copy size={14} /> {copied === "clone" ? "اتنسخ" : "نسخ الأمر"}
              </button>
            </>
          )}
          <p className="table-secondary">الاسترجاع من نقطة (import) بيكتب فوق المستندات الموجودة بنفس الأرقام ومش بيمسح اللي اتضاف بعدها.</p>
        </details>
      </div>
    </section>
  );
}
