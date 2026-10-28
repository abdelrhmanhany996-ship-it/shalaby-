import { PageGuide } from "../components/common/PageGuide";
import { canAccessPage } from "../lib/access";
import { useState } from "react";
import { ArrowUpLeft, ShoppingBag } from "lucide-react";
import { FilterBar, inDateRange } from "../components/common/FilterBar";
import { useCRM } from "../context/CRMContext";
import { formatMoney, departmentNames } from "../lib/presentation";
import { departmentIds, bookingSplit, splitTotals } from "../lib/purchases";
import { milestoneLabel } from "../lib/postSale";
interface Props {
  onOpenLead: (id: string) => void;
}

/** Everything customers bought: what, how much, in which department, and where its post-sale follow-ups stand. Buying means receiving, so there is no delivery step. */
export function BookingsPage({ onOpenLead }: Props) {
  const { effectiveUser, bookings, branches, followUps } = useCRM();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [fBranch, setFBranch] = useState("all");
  const [fAgent, setFAgent] = useState("all");
  const [fState, setFState] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const resetFilters = () => {
    setQuery("");
    setDept("all");
    setFBranch("all");
    setFAgent("all");
    setFState("all");
    setFFrom("");
    setFTo("");
  };
  const visible = bookings;
  const rows = visible
    .filter(
      (b) =>
        (dept === "all" || bookingSplit(b)[dept as keyof ReturnType<typeof bookingSplit>] > 0) &&
        (fBranch === "all" || b.branchId === fBranch) &&
        (fAgent === "all" || b.agentId === fAgent) &&
        (fState === "all" || (fState === "cancelled" ? b.bookingStatus === "cancelled" : b.bookingStatus !== "cancelled")) &&
        inDateRange(b.bookingDate, fFrom, fTo) &&
        [b.leadName, b.leadPhone, b.courseName].some((v) => (v || "").includes(query.trim())),
    )
    .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
  // The totals follow the filters, so what you see always adds up.
  const active = rows.filter((b) => b.bookingStatus !== "cancelled");
  const total = active.reduce((s, b) => s + b.amount, 0);
  const byDept = splitTotals(active);
  const uniq = (list: string[]) => [...new Set(list.filter(Boolean))];
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">اللي اشتراه العملاء</span>
          <h1>المشتريات</h1>
          <p>ملخص عمليات الشراء: كام، بكام، في أنهي قسم، وحالة متابعات ما بعد البيع. الشراء معناه إن العميل استلم، فمفيش خطوة تسليم.</p>
        </div>
      </div>
      <PageGuide id="purchases" />
      <div className="metric-grid">
        <div className="metric">
          <span className="metric-top">عمليات الشراء</span>
          <strong className="metric-value">{active.length}</strong>
          <span className="metric-note">غير الملغاة، داخل الفلاتر</span>
        </div>
        <div className="metric">
          <span className="metric-top">إجمالي المشتريات</span>
          <strong className="metric-value">
            {formatMoney(total)}
            <small>ج.م</small>
          </strong>
          <span className="metric-note">كل الأقسام</span>
        </div>
        <div className="metric">
          <span className="metric-top">متوسط العملية</span>
          <strong className="metric-value">
            {active.length ? formatMoney(Math.round(total / active.length)) : "—"}
            {active.length > 0 && <small>ج.م</small>}
          </strong>
          <span className="metric-note">إجمالي ÷ عدد العمليات</span>
        </div>
        {departmentIds.map((id) => (
          <div className="metric" key={id}>
            <span className="metric-top">{departmentNames[id]}</span>
            <strong className="metric-value">
              {formatMoney(byDept[id])}
              <small>ج.م</small>
            </strong>
            <span className="metric-note">{total ? Math.round((byDept[id] / total) * 100) : 0}% من الإجمالي</span>
          </div>
        ))}
      </div>
      <section className="panel">
        <FilterBar
          search={{ value: query, onChange: setQuery, placeholder: "اسم العميل أو رقم الهاتف أو الخدمة…" }}
          selects={[
            { id: "dept", label: "القسم", value: dept, onChange: setDept, allLabel: "كل الأقسام", primary: true, options: departmentIds.map((id) => ({ value: id, label: departmentNames[id] })) },
            { id: "state", label: "الحالة", value: fState, onChange: setFState, allLabel: "كل العمليات", options: [{ value: "active", label: "سارية" }, { value: "cancelled", label: "ملغاة" }] },
            { id: "branch", label: "الفرع", value: fBranch, onChange: setFBranch, allLabel: "كل الفروع", primary: true, options: uniq(visible.map((b) => b.branchId)).map((id) => ({ value: id, label: visible.find((b) => b.branchId === id)?.branchName || branches.find((x) => x.id === id)?.name || id })) },
            { id: "agent", label: "الموظف", value: fAgent, onChange: setFAgent, allLabel: "كل الموظفين", options: uniq(visible.map((b) => b.agentId)).map((id) => ({ value: id, label: visible.find((b) => b.agentId === id)?.agentName || id })) },
          ]}
          dates={{ from: fFrom, to: fTo, onFrom: setFFrom, onTo: setFTo, label: "تاريخ الشراء" }}
          count={{ shown: rows.length, noun: "عملية شراء" }}
          onReset={resetFilters}
        />
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="data-table stack-table">
              <thead>
                <tr>
                  <th>العميل والمشتريات</th>
                  <th>الإجمالي</th>
                  <th>التوزيع على الأقسام</th>
                  <th>التاريخ والموظف</th>
                  <th>متابعات ما بعد البيع</th>
                  <th>الملف</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const cancelled = b.bookingStatus === "cancelled";
                  const post = followUps.filter((f) => f.bookingId === b.id && f.category === "post_sale");
                  const done = post.filter((f) => f.status === "completed").length;
                  const next = post.filter((f) => !["completed", "cancelled"].includes(f.status)).sort((x, y) => x.scheduledAt.localeCompare(y.scheduledAt))[0];
                  return (
                    <tr key={b.id}>
                      <td data-label="العميل والمشتريات">
                        {canAccessPage(effectiveUser, "clients") && (
                          <button className="customer-name" onClick={() => onOpenLead(b.leadId)}>
                            {b.leadName}
                          </button>
                        )}
                        <span className="table-secondary">{b.courseName}</span>
                      </td>
                      <td data-label="الإجمالي" style={{ whiteSpace: "nowrap" }}>
                        {formatMoney(b.amount)} ج.م
                      </td>
                      <td data-label="التوزيع">
                        {cancelled ? (
                          <span className="status-pill is-new">ملغاة</span>
                        ) : (
                          departmentIds
                            .filter((id) => bookingSplit(b)[id] > 0)
                            .map((id) => (
                              <span className="table-secondary" key={id}>
                                {departmentNames[id]}: {formatMoney(bookingSplit(b)[id])} ج.م
                              </span>
                            ))
                        )}
                      </td>
                      <td data-label="التاريخ" style={{ whiteSpace: "nowrap" }}>
                        {b.bookingDate}
                        <span className="table-secondary">{b.agentName || ""}</span>
                      </td>
                      <td data-label="ما بعد البيع">
                        {cancelled ? (
                          "—"
                        ) : post.length ? (
                          <>
                            <span className="status-pill is-success">
                              {done} من {post.length} تمت
                            </span>
                            {next && (
                              <span className="table-secondary">
                                الجاية: {milestoneLabel(next.milestone)} ({next.scheduledAt.slice(0, 10)})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="table-secondary">كل المواعيد فاتت أو مفيش</span>
                        )}
                      </td>
                      <td data-label="الملف">
                        {canAccessPage(effectiveUser, "clients") && (
                          <button className="table-link" onClick={() => onOpenLead(b.leadId)} aria-label={`فتح ملف ${b.leadName}`}>
                            <ArrowUpLeft size={17} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <ShoppingBag size={28} />
            <h3>مفيش مشتريات مطابقة</h3>
            <p>عمليات الشراء بتظهر هنا أول ما تتسجل من زيارة أو من ملف العميل.</p>
          </div>
        )}
      </section>
    </div>
  );
}
