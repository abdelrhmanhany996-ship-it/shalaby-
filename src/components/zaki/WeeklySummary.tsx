import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles, TrendingDown, TrendingUp, ListChecks, Users, UserX, MessageSquareWarning } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { aiStatus, weeklySummary, type WeeklyReport } from "../../lib/aiClient";
import { today } from "../../lib/presentation";
import { useSnapshotBuilder } from "./useSnapshot";

const cacheKey = (userId: string) => `almasar_crm_v2_weekly_${userId}_${today()}`;

/** A written weekly report for the manager: what improved, what dropped and why, what to do next. */
export function WeeklySummary() {
  const { currentUser } = useCRM();
  const build = useSnapshotBuilder();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error" | "off">("idle");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(cacheKey(currentUser.id));
      if (saved) setReport(JSON.parse(saved));
    } catch {
      /* ignore */
    }
    aiStatus().then((s) => s !== "server" && setState("off"));
  }, [currentUser.id]);

  const generate = async () => {
    setState("loading");
    try {
      const r = await weeklySummary(build());
      setReport(r);
      try {
        sessionStorage.setItem(cacheKey(currentUser.id), JSON.stringify(r));
      } catch {
        /* ignore */
      }
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const Block = ({ title, Icon, color, children }: { title: string; Icon: typeof Sparkles; color: string; children: React.ReactNode }) => (
    <div style={{ borderInlineStart: `4px solid ${color}`, paddingInlineStart: 14, margin: "14px 0" }}>
      <strong style={{ color, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon size={16} /> {title}
      </strong>
      {children}
    </div>
  );

  return (
    <section className="panel" style={{ marginBottom: 20 }}>
      <div className="panel-header">
        <div>
          <h2>ملخص الأسبوع بالكلام</h2>
          <p>زكي بيقارن الأسبوع ده بالأسبوع اللي قبله: إيه اتحسّن، إيه وقع وليه، أداء كل موظف، الفرص اللي ضاعت ومين المسؤول، والشكاوى ووقت حلها.</p>
        </div>
        {state !== "off" && (
          <button className="btn-secondary" onClick={generate} disabled={state === "loading"}>
            {state === "loading" ? <Loader2 size={15} className="spin" /> : report ? <RefreshCw size={15} /> : <Sparkles size={15} />}
            {report ? "تحديث الملخص" : "اعمل الملخص"}
          </button>
        )}
      </div>
      {state === "off" && <p className="quiet-note">زكي لسه مش متفعّل على الموقع ده (محتاج إعداد مفتاح الذكاء الاصطناعي).</p>}
      {state === "error" && <p className="notice warning">تعذر إعداد الملخص حاليًا، جرّب تاني بعد شوية.</p>}
      {report && (
        <div style={{ padding: "0 6px 8px" }}>
          {report.headline && <p style={{ fontSize: 16, fontWeight: 600 }}>{report.headline}</p>}
          {report.improved.length > 0 && (
            <Block title="اللي اتحسّن" Icon={TrendingUp} color="#15803d">
              <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                {report.improved.map((x, i) => (
                  <li key={i}>
                    <strong>{x.title}</strong> — {x.detail}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {report.dropped.length > 0 && (
            <Block title="اللي وقع وليه" Icon={TrendingDown} color="#c8232b">
              <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                {report.dropped.map((x, i) => (
                  <li key={i}>
                    <strong>{x.title}</strong> — {x.why}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {report.next_week.length > 0 && (
            <Block title="المطلوب الأسبوع الجاي" Icon={ListChecks} color="#1d4ed8">
              <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                {report.next_week.map((x, i) => (
                  <li key={i}>
                    <strong>{x.action}</strong> — {x.reason}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {report.team && report.team.length > 0 && (
            <Block title="أداء الفريق" Icon={Users} color="#7c3aed">
              <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                {report.team.map((x, i) => (
                  <li key={i}>
                    <strong>{x.name}</strong>
                    {x.verdict && <span className="status-pill" style={{ marginInline: 6 }}>{x.verdict}</span>}— {x.detail}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {report.lost && report.lost.length > 0 && (
            <Block title="فرص ضاعت ومين المسؤول" Icon={UserX} color="#b45309">
              <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                {report.lost.map((x, i) => (
                  <li key={i}>
                    <strong>{x.customer}</strong> ({x.responsible}) — {x.why}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {report.complaints && (report.complaints.headline || report.complaints.items.length > 0) && (
            <Block title="الشكاوى ووقت الحل" Icon={MessageSquareWarning} color="#c8232b">
              {report.complaints.headline && <p style={{ margin: "6px 0" }}>{report.complaints.headline}</p>}
              {report.complaints.items.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  {report.complaints.items.map((x, i) => (
                    <li key={i}>
                      <strong>{x.customer}</strong> ({x.state}) — {x.detail}
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          )}
          <p className="table-secondary">الملخص مبني على بيانات النظام الحالية ونطاق صلاحياتك، ويتحدّث بزر «تحديث الملخص».</p>
        </div>
      )}
    </section>
  );
}
