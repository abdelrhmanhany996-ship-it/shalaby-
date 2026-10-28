import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { departmentNames, formatMoney } from "../lib/presentation";
import { departmentIds } from "../lib/purchases";
import {
  brokerRows,
  customerRows,
  departmentLeaders,
  feedbackSummary,
  type Split,
} from "../lib/overview";
import { hasPermission } from "../lib/permissions";
import type { Department } from "../types/crm";
import { WeeklySummary } from "../components/zaki/WeeklySummary";

const colors: Record<Department, string> = {
  construction: "#0f766e",
  decor: "#c8232b",
  garden: "#15803d",
  general: "#b45309",
};

function SplitBar({ split, total }: { split: Split; total: number }) {
  if (!total) return null;
  return (
    <div
      role="img"
      aria-label={departmentIds
        .filter((d) => split[d] > 0)
        .map((d) => `${departmentNames[d]} ${formatMoney(split[d])}`)
        .join("، ")}
      style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", background: "rgba(128,128,128,.18)", minWidth: 120 }}
    >
      {departmentIds
        .filter((d) => split[d] > 0)
        .map((d) => (
          <i key={d} style={{ width: `${(split[d] / total) * 100}%`, background: colors[d] }} />
        ))}
    </div>
  );
}

function SplitLegend({ split }: { split: Split }) {
  return (
    <span className="table-secondary" style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px" }}>
      {departmentIds
        .filter((d) => split[d] > 0)
        .map((d) => (
          <span key={d}>
            <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: colors[d], marginInlineEnd: 5 }} />
            {departmentNames[d]}: {formatMoney(split[d])} ج.م
          </span>
        ))}
    </span>
  );
}

export function OverviewPage({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const { effectiveUser: u, leads, bookings, brokers } = useCRM();
  const [sortBy, setSortBy] = useState<"total" | Department>("total");
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);
  const [openBroker, setOpenBroker] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const showBrokers = hasPermission(u, "brokers.view");

  const customers = useMemo(() => customerRows(bookings, leads), [bookings, leads]);
  const brokerList = useMemo(() => brokerRows(customers, leads, brokers), [customers, leads, brokers]);
  const leaders = useMemo(() => departmentLeaders(customers, brokerList), [customers, brokerList]);
  const feedback = useMemo(() => feedbackSummary(leads), [leads]);

  const grand = customers.reduce((s, c) => s + c.total, 0);
  const viaBrokers = customers.filter((c) => c.brokerId).reduce((s, c) => s + c.total, 0);
  const ranked = useMemo(
    () =>
      sortBy === "total"
        ? customers
        : customers.filter((c) => c.split[sortBy] > 0).sort((a, b) => b.split[sortBy] - a.split[sortBy]),
    [customers, sortBy],
  );
  const amountOf = (c: (typeof customers)[number]) => (sortBy === "total" ? c.total : c.split[sortBy]);
  const rows = showAll ? ranked : ranked.slice(0, 10);

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">نظرة كبيرة</span>
          <h1>كبار العملاء والوسطاء</h1>
          <p>مين الأقوى من حيث إجمالي المشتريات، ومتوزعة إزاي على الأقسام، ورأي العملاء فينا.</p>
        </div>
      </div>

      <WeeklySummary />

      <div className="metric-grid">
        <div className="metric">
          <span className="metric-top">إجمالي المشتريات</span>
          <strong className="metric-value">
            {formatMoney(grand)}
            <small>ج.م</small>
          </strong>
          <span className="metric-note">{customers.length} عميل اشترى</span>
        </div>
        {showBrokers && (
          <div className="metric">
            <span className="metric-top">جاي عن طريق وسطاء</span>
            <strong className="metric-value">{grand ? Math.round((viaBrokers / grand) * 100) : 0}٪</strong>
            <span className="metric-note">{formatMoney(viaBrokers)} ج.م من المشتريات</span>
          </div>
        )}
        <div className="metric">
          <span className="metric-top">رضا العملاء</span>
          <strong className="metric-value">{feedback.count ? feedback.average.toFixed(1) : "—"}</strong>
          <span className="metric-note">{feedback.count ? `من 5 · ${feedback.count} تقييم` : "لسه مفيش تقييمات"}</span>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>الأقسام الأربعة</h2>
            <p>مين بيشتري أكتر من كل قسم</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, padding: "0 4px 4px" }}>
          {departmentIds.map((d) => {
            const l = leaders[d];
            return (
              <div key={d} style={{ border: "1px solid rgba(128,128,128,.25)", borderRadius: 14, padding: 16, borderTop: `4px solid ${colors[d]}` }}>
                <strong>{departmentNames[d]}</strong>
                <div style={{ fontSize: 22, fontWeight: 700, margin: "4px 0" }}>
                  {formatMoney(l.total)} <small>ج.م</small>
                </div>
                <span className="table-secondary">
                  {grand ? Math.round((l.total / grand) * 100) : 0}٪ من الإجمالي · {l.buyers} عميل
                </span>
                {l.top.length ? (
                  <ol style={{ margin: "10px 0 0", paddingInlineStart: 18, fontSize: 13 }}>
                    {l.top.map((t) => (
                      <li key={t.leadId}>
                        <button className="customer-name" onClick={() => onOpenLead(t.leadId)}>
                          {t.name}
                        </button>{" "}
                        <span className="table-secondary">{formatMoney(t.amount)} ج.م</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="table-secondary" style={{ marginTop: 10 }}>لسه مفيش مشتريات في القسم ده.</p>
                )}
                {showBrokers && l.topBroker && (
                  <p className="table-secondary" style={{ marginTop: 8 }}>
                    أقوى وسيط: <strong>{l.topBroker.name}</strong> ({formatMoney(l.topBroker.amount)} ج.م)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div>
            <h2>أقوى العملاء</h2>
            <p>بإجمالي المشتريات، وتقسيمها بالداخل على الأقسام</p>
          </div>
          <select aria-label="الترتيب حسب" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="total">الإجمالي</option>
            {departmentIds.map((d) => (
              <option key={d} value={d}>
                الأكثر شراءً من {departmentNames[d]}
              </option>
            ))}
          </select>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>العميل</th>
                  <th>{sortBy === "total" ? "إجمالي المشتريات" : `مشتريات ${departmentNames[sortBy]}`}</th>
                  <th>التقسيم</th>
                  {showBrokers && <th>الوسيط</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <>
                    <tr key={c.leadId}>
                      <td>{i + 1}</td>
                      <td>
                        <button className="customer-name" onClick={() => onOpenLead(c.leadId)}>
                          {c.name}
                        </button>
                        <span className="table-secondary">{c.purchases} عملية شراء</span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <strong>{formatMoney(amountOf(c))} ج.م</strong>
                      </td>
                      <td style={{ minWidth: 150 }}>
                        <SplitBar split={c.split} total={c.total} />
                      </td>
                      {showBrokers && <td>{c.brokerName || "—"}</td>}
                      <td>
                        <button
                          className="table-link"
                          aria-label="تفاصيل التقسيم"
                          aria-expanded={openCustomer === c.leadId}
                          onClick={() => setOpenCustomer(openCustomer === c.leadId ? null : c.leadId)}
                        >
                          {openCustomer === c.leadId ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                        </button>
                      </td>
                    </tr>
                    {openCustomer === c.leadId && (
                      <tr key={`${c.leadId}-d`}>
                        <td />
                        <td colSpan={showBrokers ? 5 : 4}>
                          <SplitLegend split={c.split} />
                          <span className="table-secondary">إجمالي: {formatMoney(c.total)} ج.م</span>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {ranked.length > 10 && (
              <button className="btn-text" style={{ margin: 12 }} onClick={() => setShowAll(!showAll)}>
                {showAll ? "عرض أقل" : `عرض كل ${ranked.length} عميل`}
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <h3>لسه مفيش مشتريات مسجلة</h3>
            <p>هتظهر هنا بعد تسجيل أول عملية شراء من ملف العميل.</p>
          </div>
        )}
      </section>

      {showBrokers && (
        <section className="panel" style={{ marginTop: 20 }}>
          <div className="panel-header">
            <div>
              <h2>أقوى الوسطاء</h2>
              <p>بإجمالي مشتريات العملاء اللي جابوهم، وتقسيمهم بالداخل</p>
            </div>
          </div>
          {brokerList.length ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الوسيط</th>
                    <th>إجمالي مشتريات عملائه</th>
                    <th>التقسيم</th>
                    <th>اشتروا / جابهم</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {brokerList.map((b, i) => (
                    <>
                      <tr key={b.brokerId}>
                        <td>{i + 1}</td>
                        <td>
                          <strong>{b.name}</strong>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <strong>{formatMoney(b.total)} ج.م</strong>
                        </td>
                        <td style={{ minWidth: 150 }}>
                          <SplitBar split={b.split} total={b.total} />
                        </td>
                        <td>
                          {b.buyers.length} / {b.referred}
                        </td>
                        <td>
                          <button
                            className="table-link"
                            aria-label="عملاء الوسيط"
                            aria-expanded={openBroker === b.brokerId}
                            onClick={() => setOpenBroker(openBroker === b.brokerId ? null : b.brokerId)}
                          >
                            {openBroker === b.brokerId ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                          </button>
                        </td>
                      </tr>
                      {openBroker === b.brokerId && (
                        <tr key={`${b.brokerId}-d`}>
                          <td />
                          <td colSpan={5}>
                            <SplitLegend split={b.split} />
                            <ul style={{ margin: "8px 0 0", paddingInlineStart: 18 }}>
                              {b.buyers.map((c) => (
                                <li key={c.leadId} style={{ marginBottom: 6 }}>
                                  <button className="customer-name" onClick={() => onOpenLead(c.leadId)}>
                                    {c.name}
                                  </button>{" "}
                                  <strong>{formatMoney(c.total)} ج.م</strong>
                                  <SplitLegend split={c.split} />
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>مفيش وسطاء مرتبطين بعملاء</h3>
              <p>اربط العميل بالوسيط اللي جابه من ملف العميل ← تعديل البيانات ← تفاصيل التواصل.</p>
            </div>
          )}
        </section>
      )}

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div>
            <h2>رأي العملاء فينا</h2>
            <p>تقييمات العملاء بعد الشراء</p>
          </div>
        </div>
        {feedback.count ? (
          <div style={{ padding: "0 4px 8px" }}>
            <div className="metric-grid" style={{ marginBottom: 12 }}>
              {[
                ["تقييم عام", feedback.average],
                ["المكان", feedback.location],
                ["المعاملة", feedback.treatment],
                ["السعر", feedback.price],
              ].map(([label, v]) => (
                <div className="metric" key={String(label)}>
                  <span className="metric-top">{label}</span>
                  <strong className="metric-value">{Number(v) ? Number(v).toFixed(1) : "—"}</strong>
                </div>
              ))}
            </div>
            {feedback.distribution
              .map((n, i) => ({ stars: i + 1, n }))
              .reverse()
              .map((d) => (
                <div className="department-row" key={d.stars}>
                  <div>
                    <span>
                      {d.stars} <Star size={12} style={{ display: "inline" }} />
                    </span>
                    <strong>{d.n}</strong>
                  </div>
                  <div className="department-bar">
                    <i style={{ width: `${(d.n / feedback.count) * 100}%` }} />
                  </div>
                </div>
              ))}
            {feedback.recent.length > 0 && (
              <ul style={{ marginTop: 14, paddingInlineStart: 18 }}>
                {feedback.recent.map((r) => (
                  <li key={r.leadId} style={{ marginBottom: 6 }}>
                    <button className="customer-name" onClick={() => onOpenLead(r.leadId)}>
                      {r.name}
                    </button>{" "}
                    {"★".repeat(r.stars)}
                    {"☆".repeat(5 - r.stars)} — {r.comment}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <h3>لسه مفيش تقييمات</h3>
            <p>التقييمات بتظهر من متابعات بعد البيع ومن طلب التقييم في ملف العميل.</p>
          </div>
        )}
      </section>
    </div>
  );
}
