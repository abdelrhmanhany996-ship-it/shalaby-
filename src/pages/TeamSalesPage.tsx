import { useMemo, useState } from "react";
import { Copy, Printer } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { today } from "../lib/presentation";
import { SalesReportView } from "../components/common/SalesReportView";
import { periodReport, periods, reportText } from "../lib/salesReport";
import { weeklyTeamSales } from "../lib/teamSales";
import { isSales } from "../lib/access";

type Preset = "week" | "month" | "lastMonth" | "custom";
const names: Record<Preset, string> = { week: "الأسبوع ده", month: "الشهر ده", lastMonth: "الشهر اللي فات", custom: "من تاريخ لتاريخ" };

/** The money report: what each person sold between two dates, from what target. */
export function TeamSalesPage() {
  const { effectiveUser, targetUsers, bookings, quotes, employeeTargets, targetSettings } = useCRM();
  const now = today();
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState({ from: periods.month(now).from, to: now });
  const [copied, setCopied] = useState(false);
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
          <SalesReportView rows={report.rows} total={report.total} from={range.from} to={range.to} quotes={quoteBy} />
        </>
      ) : (
        <p className="notice warning" role="alert">
          اختار تاريخ البداية قبل تاريخ النهاية.
        </p>
      )}
    </>
  );
}
