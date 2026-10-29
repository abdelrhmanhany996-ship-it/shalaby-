import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { formatMoney, today } from "../lib/presentation";
import { addToDate } from "../lib/postSale";
import { teamTotals, weekRange, weeklyTeamSales } from "../lib/teamSales";
import { isSales } from "../lib/access";

const label = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("ar-EG", { day: "numeric", month: "long", timeZone: "UTC" });

export function TeamSalesPage() {
  const { effectiveUser, targetUsers, bookings, quotes } = useCRM();
  const [offset, setOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const now = today();
  const { from, to } = useMemo(() => weekRange(addToDate(now, { days: offset * 7 })), [now, offset]);
  const rows = useMemo(() => weeklyTeamSales({ users: targetUsers, bookings, quotes, from, to }), [targetUsers, bookings, quotes, from, to]);
  const total = teamTotals(rows);
  const alone = isSales(effectiveUser);

  const summary = () =>
    [`مبيعات الأسبوع ${label(from)} - ${label(to)}`, ...rows.map((r) => `${r.name}: ${formatMoney(r.sales)} ج.م (${r.deals} عملية) · عروض ${r.quotes}، اتقبل ${r.accepted}`), `الإجمالي: ${formatMoney(total.sales)} ج.م (${total.deals} عملية)`].join("\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the table is still on screen */
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">من البيع المسجّل في النظام</span>
          <h1>مبيعات الأسبوع</h1>
          <p>{alone ? "مبيعاتك وعروض الأسعار بتاعتك الأسبوع ده." : "كل بايع باع بكام وعمل كام عرض سعر، من غير ما تحسبها بإيدك."}</p>
        </div>
        <div className="tab-filter" role="group" aria-label="الأسبوع">
          <button aria-label="الأسبوع السابق" onClick={() => setOffset(offset - 1)}>
            <ChevronRight size={16} />
          </button>
          <button aria-pressed style={{ minWidth: 190 }}>
            {label(from)} - {label(to)}
          </button>
          <button aria-label="الأسبوع التالي" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      <div className="metric-grid" style={{ marginBottom: 16 }}>
        <div className="metric">
          <span className="metric-top">إجمالي المبيعات</span>
          <strong className="metric-value">{formatMoney(total.sales)}<small>ج.م</small></strong>
        </div>
        <div className="metric">
          <span className="metric-top">عدد عمليات البيع</span>
          <strong className="metric-value">{total.deals}</strong>
        </div>
        <div className="metric">
          <span className="metric-top">عروض الأسعار</span>
          <strong className="metric-value">{total.quotes}</strong>
        </div>
        <div className="metric">
          <span className="metric-top">اتقبل منها</span>
          <strong className="metric-value">{total.accepted}</strong>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>{alone ? "أرقامي" : "أداء كل بايع"}</h2>
          {!alone && (
            <button className="btn-secondary" onClick={copy}>
              <Copy size={14} />
              {copied ? "اتنسخ" : "نسخ الملخص"}
            </button>
          )}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>البايع</th>
                <th>المبيعات</th>
                <th>العمليات</th>
                <th>متوسط العملية</th>
                <th>عروض الأسعار</th>
                <th>اتقبل</th>
                <th>مفتوح</th>
                <th>ما اتقبلش</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId}>
                  <td>{r.name}</td>
                  <td>
                    <strong>{formatMoney(r.sales)}</strong> ج.م
                  </td>
                  <td>{r.deals}</td>
                  <td>{r.deals ? `${formatMoney(r.sales / r.deals)} ج.م` : "—"}</td>
                  <td>
                    {r.quotes}
                    {r.quotes > 0 && <small className="table-secondary" style={{ display: "block" }}>{formatMoney(r.quotesValue)} ج.م</small>}
                  </td>
                  <td>{r.accepted}</td>
                  <td>{r.pending}</td>
                  <td>{r.lost}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8}>مفيش بيانات للأسبوع ده.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
