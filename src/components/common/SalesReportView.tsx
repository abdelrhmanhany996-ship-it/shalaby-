import { TargetBar, TargetLegend } from "./TargetBar";
import type { ReportRow } from "../../lib/salesReport";

const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}٪`;

interface Props {
  rows: ReportRow[];
  total: { sold: number; deals: number; target: number; percent: number };
  from: string;
  to: string;
  /** Quotes per person, shown next to the money when given. */
  quotes?: Record<string, { total: number; accepted: number }>;
}

/** The short money report: who sold how much between two dates, against their target for those dates. */
export function SalesReportView({ rows, total, from, to, quotes }: Props) {
  return (
    <section className="panel" aria-label={`مبيعات من ${from} إلى ${to}`}>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>البايع</th>
              <th style={{ minWidth: 190 }}>التقدم من الهدف</th>
              <th>باع</th>
              <th>الهدف</th>
              <th>النسبة</th>
              <th>العمليات</th>
              {quotes && <th>عروض الأسعار</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td>
                  <strong>{r.name}</strong>
                </td>
                <td>{r.target > 0 ? <TargetBar percent={r.percent} /> : <small className="table-secondary">بدون هدف</small>}</td>
                <td>
                  <strong>{money(r.sold)}</strong> ج.م
                </td>
                <td>{r.target > 0 ? `${money(r.target)} ج.م` : "—"}</td>
                <td>
                  {r.target > 0 ? pct(r.percent) : "—"}
                  {r.over ? " ⭐" : ""}
                </td>
                <td>{r.deals}</td>
                {quotes && (
                  <td>
                    {quotes[r.userId]?.total ?? 0}
                    {quotes[r.userId]?.accepted ? <small className="table-secondary"> · اتقبل {quotes[r.userId].accepted}</small> : null}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={quotes ? 7 : 6}>مفيش موظفين أو مبيعات في الفترة دي.</td>
              </tr>
            )}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr>
                <td>
                  <strong>الإجمالي</strong>
                </td>
                <td>{total.target > 0 ? <TargetBar percent={total.percent} /> : null}</td>
                <td>
                  <strong>{money(total.sold)}</strong> ج.م
                </td>
                <td>{total.target > 0 ? `${money(total.target)} ج.م` : "—"}</td>
                <td>{total.target > 0 ? pct(total.percent) : "—"}</td>
                <td>{total.deals}</td>
                {quotes && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div style={{ padding: "10px 16px 14px" }}>
        <TargetLegend />
      </div>
    </section>
  );
}
