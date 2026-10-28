import { PageGuide } from "../components/common/PageGuide";
import { departmentIds, splitTotals } from "../lib/purchases";
import { notBoughtReasons } from "../lib/notBought";
import { useCRM } from "../context/CRMContext";
import { ReportDownloads } from "../components/common/ReportDownloads";
import { hasPermission } from "../lib/permissions";
import { isSales, scopeLabel, worksOwnCustomers } from "../lib/access";
import {
  followUpStatus,
  formatMoney,
  sourceNames,
  departmentNames,
} from "../lib/presentation";
export function ReportsPage() {
  const {
    effectiveUser: u,
    leads,
    bookings,
    followUps,
    purchaseInvoices,
    notBoughtRecords,
    branches,
  } = useCRM();
  const has = (p: Parameters<typeof hasPermission>[1]) => hasPermission(u, p);
  const contracts = bookings.filter((b) => b.bookingStatus !== "cancelled");
  const totals = splitTotals(contracts);
  const converted = new Set(
    contracts
      .filter((b) => leads.some((l) => l.id === b.leadId))
      .map((b) => b.leadId),
  ).size;
  const metrics = [
    {
      allowed: has("customers.view"),
      name: "العملاء",
      value: leads.length,
      note: "داخل نطاق العمل",
    },
    {
      allowed: has("customers.view") && has("bookings.view"),
      name: "عملاء لديهم تعاقد",
      value: leads.length
        ? `${Math.round((converted / leads.length) * 100)}%`
        : "—",
      note: `${converted} عميل من أصل ${leads.length}`,
    },
    {
      allowed: has("bookings.view"),
      name: "إجمالي المشتريات",
      value: `${formatMoney(contracts.reduce((s, b) => s + b.amount, 0))} ج.م`,
      note: "كل الأقسام · باستبعاد الملغى",
    },
    {
      allowed: has("followups.view"),
      name: "المتابعات المكتملة",
      value: followUps.filter((f) => f.status === "completed").length,
      note: `من أصل ${followUps.filter((f) => f.status !== "cancelled").length} متابعة غير ملغاة`,
    },
    {
      allowed: has("customers.view") && has("bookings.view"),
      name: "لم يشتروا بعد",
      value: Math.max(leads.length - converted, 0),
      note: "عملاء بلا عملية شراء، فرص للمتابعة",
    },
  ];
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">الأرقام في سياقها</span>
          <h1>{worksOwnCustomers(u) ? "أدائي" : "تقارير نطاق العمل"}</h1>
          <p>{scopeLabel(u)} · جميع الفترات · المؤشرات المتاحة لصلاحياتك</p>
        </div>
      </div>
      <PageGuide id="reports" />
      <div className="metric-grid">
        {metrics
          .filter((m) => m.allowed)
          .map((m) => (
            <div className="metric" key={m.name}>
              <span className="metric-top">{m.name}</span>
              <strong className="metric-value">{m.value}</strong>
              <span className="metric-note">{m.note}</span>
            </div>
          ))}
      </div>
      <div className="home-grid">
        {has("customers.view") && (
          <section className="panel">
            <div className="panel-header">
              <h2>العملاء حسب المصدر</h2>
            </div>
            <div className="department-list">
              {Object.entries(sourceNames)
                .map(([id, label]) => ({
                  id,
                  label,
                  count: leads.filter((l) => l.source === id).length,
                }))
                .filter((s) => s.count)
                .map((s) => (
                  <div className="department-row" key={s.id}>
                    <div>
                      <span>{s.label}</span>
                      <strong>{s.count} عميل</strong>
                    </div>
                    <div className="department-bar">
                      <i
                        style={{ width: `${(s.count / leads.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
        {has("customers.view") && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>ليه لسه ما اشتروش</h2>
                <p>
                  {notBoughtRecords.length
                    ? `${notBoughtRecords.length} تسجيل · السبب مجهول في ${Math.round((notBoughtRecords.filter((r) => r.reasons.includes("unknown")).length / notBoughtRecords.length) * 100)}٪`
                    : "الأسباب اللي بيسجلها الفريق بعد كل زيارة أو متابعة"}
                </p>
              </div>
            </div>
            <div className="department-list">
              {notBoughtRecords.length ? (
                notBoughtReasons
                  .map((r) => ({
                    ...r,
                    count: notBoughtRecords.filter((n) => n.reasons.includes(r.id)).length,
                  }))
                  .filter((r) => r.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .map((r) => (
                    <div className="department-row" key={r.id}>
                      <div>
                        <span>{r.label}</span>
                        <strong>{r.count}</strong>
                      </div>
                      <div className="department-bar">
                        <i style={{ width: `${(r.count / notBoughtRecords.length) * 100}%` }} />
                      </div>
                    </div>
                  ))
              ) : (
                <p className="quiet-note">لسه مفيش أسباب مسجلة.</p>
              )}
            </div>
          </section>
        )}
        {has("bookings.view") && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>المشتريات حسب الأقسام الأربعة</h2>
                <p>إجمالي قيمة المشتريات ونصيب كل قسم منها</p>
              </div>
            </div>
            <div className="department-list">
              {departmentIds.map((id) => {
                const amount = totals[id];
                const sum = departmentIds.reduce((s, d) => s + totals[d], 0);
                return (
                  <div className="department-row" key={id}>
                    <div>
                      <span>{departmentNames[id]}</span>
                      <strong>
                        {formatMoney(amount)} ج.م{" "}
                        {sum ? `· ${Math.round((amount / sum) * 100)}٪` : ""}
                      </strong>
                    </div>
                    <div className="department-bar">
                      <i style={{ width: `${sum ? (amount / sum) * 100 : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div>
            <h2>{worksOwnCustomers(u) ? "سجلاتي حسب الفرع" : "مؤشرات الفروع المتاحة"}</h2>
            <p>
              {isSales(u)
                ? "يعرض سجلاتك وتكليفاتك فقط."
                : "داخل حدود نطاق عملك."}
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>الفرع</th>
                {has("customers.view") && <th>العملاء</th>}
                {has("bookings.view") && <th>إجمالي المشتريات</th>}
                {has("followups.view") && <th>متابعات متأخرة</th>}
                {has("invoices.view") && <th>الفواتير</th>}
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  {has("customers.view") && (
                    <td>{leads.filter((l) => l.branchId === b.id).length}</td>
                  )}
                  {has("bookings.view") && (
                    <td>
                      {formatMoney(
                        contracts
                          .filter((c) => c.branchId === b.id)
                          .reduce((s, c) => s + c.amount, 0),
                      )}{" "}
                      ج.م
                    </td>
                  )}
                  {has("followups.view") && (
                    <td>
                      {
                        followUps.filter(
                          (f) =>
                            f.branchId === b.id &&
                            followUpStatus(f) === "overdue",
                        ).length
                      }
                    </td>
                  )}
                  {has("invoices.view") && (
                    <td>
                      {
                        purchaseInvoices.filter((i) => i.branchId === b.id)
                          .length
                      }
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <ReportDownloads />
    </div>
  );
}
