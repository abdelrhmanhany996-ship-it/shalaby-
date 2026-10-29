import { useMemo, useState } from "react";
import { Copy, Printer } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { today } from "../lib/presentation";
import { SalesReportView } from "../components/common/SalesReportView";
import { periodReport, periods, reportText } from "../lib/salesReport";
import { weeklyTeamSales } from "../lib/teamSales";
import { progressTone } from "../lib/progress";
import type { ReportRow } from "../lib/salesReport";
import type { WeeklyReport } from "../types/crm";
import { isSales } from "../lib/access";

type Preset = "week" | "month" | "lastMonth" | "custom";
const names: Record<Preset, string> = { week: "الأسبوع ده", month: "الشهر ده", lastMonth: "الشهر اللي فات", custom: "من تاريخ لتاريخ" };

/** The money report: what each person sold between two dates, from what target. */
const parse = <T,>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

/** The reports the server made by itself every week: newest first, each opens into the same table. */
function WeeklyReports({ reports }: { reports: WeeklyReport[] }) {
  const [open, setOpen] = useState("");
  const list = [...reports].sort((a, b) => b.from.localeCompare(a.from)).slice(0, 8);
  return (
    <section className="panel no-print" style={{ marginTop: 20 }}>
      <div className="panel-header">
        <div>
          <h2>التقارير الأسبوعية التلقائية</h2>
          <p>بتتعمل لوحدها كل جمعة بالليل (السبت للجمعة) ومحفوظة هنا.</p>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="quiet-note" style={{ padding: "0 20px 16px" }}>لسه مفيش تقرير اتعمل. أول واحد هيظهر هنا أول جمعة بعد تفعيل الجدولة على السيرفر.</p>
      ) : (
        list.map((r) => {
          const rows = parse<ReportRow[]>(r.rowsJson, []).map((x) => ({ ...x, ...progressTone(x.target > 0 ? x.percent : 0) }));
          const total = parse(r.totalJson, { sold: 0, deals: 0, target: 0, percent: 0 });
          return (
            <div key={r.id} style={{ borderTop: "1px solid var(--line, #e5e5e5)" }}>
              <button className="btn-text" style={{ width: "100%", justifyContent: "space-between", padding: "12px 20px" }} aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? "" : r.id)}>
                <span>
                  {r.from} ← {r.to}
                </span>
                <span>
                  {total.sold.toLocaleString("en-US")} ج.م{total.target ? ` من ${total.target.toLocaleString("en-US")} (${total.percent}٪)` : ""}
                </span>
              </button>
              {open === r.id && <SalesReportView rows={rows} total={total} from={r.from} to={r.to} />}
            </div>
          );
        })
      )}
    </section>
  );
}

export function TeamSalesPage() {
  const { effectiveUser, targetUsers, bookings, quotes, employeeTargets, targetSettings, weeklyReports } = useCRM();
  const now = today();
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState({ from: periods.month(now).from, to: now });
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const range = preset === "custom" ? custom : periods[preset](now);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(range.from) && /^\d{4}-\d{2}-\d{2}$/.test(range.to) && range.from <= range.to;
  const report = useMemo(
    () => (valid ? periodReport({ users: targetUsers, bookings, targets: employeeTargets, settings: targetSettings, from: range.from, to: range.to }) : null),
    [valid, targetUsers, bookings, employeeTargets, targetSettings, range.from, range.to],
  );
  const quoteBy = useMemo(() => {
    const out: Record<string, { total: number; accepted: number }> = {};
    if (!valid) return out;
    for (const s of weeklyTeamSales({ users: targetUsers, bookings: [], quotes, from: range.from, to: range.to })) out[s.userId] = { total: s.quotes, accepted: s.accepted };
    return out;
  }, [valid, targetUsers, quotes, range.from, range.to]);
  const alone = isSales(effectiveUser);
  const idle = report ? report.rows.filter((r) => r.target <= 0 && r.sold <= 0).length : 0;
  const visibleRows = report ? (showAll ? report.rows : report.rows.filter((r) => r.target > 0 || r.sold > 0)) : [];

  const copy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportText(report, range.from, range.to));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the report is still on screen */
    }
  };

  return (
    <>
      <div className="page-heading no-print">
        <div>
          <span className="eyebrow">الفلوس بس: باع كام من هدف كام</span>
          <h1>تقرير المبيعات</h1>
          <p>{alone ? "مبيعاتك في الفترة اللي تختارها، مقارنة بهدفك." : "كل بايع باع بكام في الفترة اللي تختارها، من هدف كام. الأرقام من البيع المسجّل في النظام."}</p>
        </div>
        {!alone && report && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-secondary" onClick={copy}>
              <Copy size={14} />
              {copied ? "اتنسخ" : "نسخ التقرير"}
            </button>
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer size={14} />
              طباعة / PDF
            </button>
          </div>
        )}
      </div>

      <div className="tab-filter no-print" role="group" aria-label="الفترة" style={{ marginBottom: 12 }}>
        {(Object.keys(names) as Preset[]).map((p) => (
          <button key={p} aria-pressed={preset === p} onClick={() => setPreset(p)}>
            {names[p]}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="field-grid no-print" style={{ marginBottom: 12, maxWidth: 480 }}>
          <label className="field">
            <span>من</span>
            <input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          </label>
          <label className="field">
            <span>إلى</span>
            <input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </label>
        </div>
      )}

      {report ? (
        <>
          <p className="quiet-note" style={{ marginBottom: 10 }}>
            من {range.from} إلى {range.to}. الهدف هنا هو هدف الشهر محسوب على أيام الفترة (الشهر الكامل = الهدف الكامل).
          </p>
          {idle > 0 && (
            <button className="btn-text no-print" style={{ marginBottom: 8 }} onClick={() => setShowAll(!showAll)}>
              {showAll ? "إخفاء اللي من غير هدف ولا مبيعات" : `إظهار ${idle} من غير هدف ولا مبيعات`}
            </button>
          )}
          <SalesReportView rows={visibleRows} total={report.total} from={range.from} to={range.to} quotes={quoteBy} />
        </>
      ) : (
        <p className="notice warning" role="alert">
          اختار تاريخ البداية قبل تاريخ النهاية.
        </p>
      )}
      {(weeklyReports.length > 0 || ["admin", "general_manager", "regional_manager"].includes(effectiveUser.role)) && <WeeklyReports reports={weeklyReports} />}
    </>
  );
}
