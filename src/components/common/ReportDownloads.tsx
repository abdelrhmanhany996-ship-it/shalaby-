import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { hasPermission } from "../../lib/permissions";
import { reportCatalog, toCsv, type ReportDef, type ReportTable } from "../../lib/reportExports";

const esc = (s: string | number) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function download(name: string, t: ReportTable) {
  const url = URL.createObjectURL(new Blob([toCsv(t)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function printTable(title: string, period: string, t: ReportTable) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  body{font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;margin:32px;color:#1a2233}
  h1{margin:0 0 4px;color:#14203b}p{color:#5b677e;margin:0 0 18px}
  table{width:100%;border-collapse:collapse;font-size:15px}th{background:#14203b;color:#fff;text-align:start;padding:9px 12px}
  td{padding:9px 12px;border-bottom:1px solid #dde3ee}tr:nth-child(even) td{background:#f3f5fa}
  </style></head><body><h1>${esc(title)}</h1><p>شلبي · ${esc(period)}</p>
  <table><thead><tr>${t.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export function ReportDownloads() {
  const crm = useCRM();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const data = useMemo(
    () => ({
      leads: crm.leads,
      visits: crm.visits,
      bookings: crm.bookings,
      followUps: crm.followUps,
      notBoughtRecords: crm.notBoughtRecords,
      reviewRequests: crm.reviewRequests,
      reviewNotes: crm.reviewNotes,
      users: crm.users,
      brokers: crm.brokers,
      branches: crm.branches,
      auditLogs: crm.auditLogs,
      aiSuggestions: crm.aiSuggestions,
      reminderDone: crm.reminderDone,
    }),
    [crm.leads, crm.visits, crm.bookings, crm.followUps, crm.notBoughtRecords, crm.reviewRequests, crm.reviewNotes, crm.users, crm.brokers, crm.branches, crm.auditLogs, crm.aiSuggestions, crm.reminderDone],
  );
  const filter = { from: from || undefined, to: to || undefined, branchId: branchId || undefined };
  const allowed = reportCatalog.filter((r) => r.needs.every((p) => hasPermission(crm.effectiveUser, p)));
  if (!allowed.length) return null;
  const period = from || to ? `${from || "البداية"} إلى ${to || "اليوم"}` : "كل الفترات";

  const card = (r: ReportDef, rank?: number) => {
    const table = r.build(data, filter);
    return (
      <article className="report-card" key={r.id}>
        {rank && <span className="report-rank">{rank}</span>}
        <div>
          <h3>{r.title}</h3>
          <p>{r.description}</p>
          <small>لمين: {r.audience} · {table.rows.length} صف</small>
        </div>
        {r.print ? (
          <button className="btn-secondary" onClick={() => printTable(r.title, period, table)}>
            <Printer size={15} />
            طباعة / PDF
          </button>
        ) : (
          <button className="btn-secondary" disabled={!table.rows.length} onClick={() => download(`${r.title}-${period.replace(/\s/g, "")}`, table)}>
            <Download size={15} />
            تحميل Excel
          </button>
        )}
      </article>
    );
  };
  const core = allowed.filter((r) => r.tier === "core");
  const extra = allowed.filter((r) => r.tier === "extra");

  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div className="panel-header">
        <div>
          <h2>تحميل التقارير</h2>
          <p>اختار الفترة والفرع، وحمّل التقرير ملف Excel (CSV) يفتح مباشرة. الأرقام داخل نطاق صلاحياتك.</p>
        </div>
      </div>
      <div className="report-filters">
        <label className="field">
          <span>من تاريخ</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          <span>إلى تاريخ</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        {crm.branches.length > 1 && (
          <label className="field">
            <span>الفرع</span>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">كل الفروع</option>
              {crm.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {core.length > 0 && (
        <>
          <h3 className="report-group">التقارير الأساسية <em>مرتبة بالأهمية</em></h3>
          <div className="report-list">{core.map((r, i) => card(r, i + 1))}</div>
        </>
      )}
      {extra.length > 0 && (
        <>
          <h3 className="report-group">تقارير إضافية</h3>
          <div className="report-list">{extra.map((r) => card(r))}</div>
        </>
      )}
    </section>
  );
}
