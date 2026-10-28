import { useState } from "react";
import { splitTotals, bookingSplit } from "../lib/purchases";
import {
  ArrowUpLeft,
  ArrowLeft,
  Plus,
  Users,
  PhoneCall,
  ShoppingBag,
  FileText,
  Building2,
  SlidersHorizontal,
  CalendarDays,
  Check,
  Clock3,
  CircleAlert,
  ChevronDown,
} from "lucide-react";
import { useCRM } from "../context/CRMContext";
import {
  canAccessPage,
  canCreateCustomer,
  isSales,
  scopeLabel, worksOwnCustomers } from "../lib/access";
import {
  hasPermission,
  isDirector,
  positionNames,
  specialties,
} from "../lib/permissions";
import {
  departmentNames,
  followUpStatus,
  formatMoney,
} from "../lib/presentation";
import { BranchDetailsModal } from "../components/common/BranchDetailsModal";
import type { Branch } from "../types/crm";
interface Props {
  setActiveTab: (tab: string) => void;
  onOpenLead: (id: string) => void;
}
const departmentColors: Record<string, string> = {
  construction: "var(--department-construction)",
  decor: "var(--department-decor)",
  garden: "var(--department-garden)",
  general: "var(--department-general)",
};
export function DashboardPage({ setActiveTab, onOpenLead }: Props) {
  const {
    effectiveUser: u,
    leads: scopeLeads,
    followUps: scopeTasks,
    bookings: scopeBookings,
    branches: scopeBranches,
    purchaseInvoices: scopeInvoices,
  } = useCRM();
  const [branchFilter, setBranchFilter] = useState("all");
  const [sort, setSort] = useState("amount");
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const sales = worksOwnCustomers(u),
    has = (p: Parameters<typeof hasPermission>[1]) => hasPermission(u, p);
  const validSort =
    (sort === "amount" && has("bookings.view")) ||
    (sort === "late" && has("followups.view")) ||
    (sort === "missing" && has("customers.view"));
  const activeSort = validSort
    ? sort
    : has("bookings.view")
      ? "amount"
      : has("followups.view")
        ? "late"
        : has("customers.view")
          ? "missing"
          : "amount";
  const inScope = (branch?: string) =>
    branchFilter === "all" || branch === branchFilter;
  const branches = scopeBranches.filter((b) => inScope(b.id));
  const leads = scopeLeads.filter((l) => inScope(l.branchId));
  const followUps = scopeTasks.filter((f) => inScope(f.branchId));
  const active = scopeBookings.filter(
    (b) => inScope(b.branchId) && b.bookingStatus !== "cancelled",
  );
  const invoices = scopeInvoices.filter((i) => inScope(i.branchId));
  const due = followUps.filter((f) => followUpStatus(f) === "due");
  const overdue = followUps.filter((f) => followUpStatus(f) === "overdue");
  const tasks = followUps
    .filter((f) => !["completed", "cancelled"].includes(followUpStatus(f)))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const taskLeadIds = new Set(tasks.map((f) => f.leadId));
  const total = active.reduce((sum, b) => sum + b.amount, 0);
  const notBoughtYet = leads.filter(
    (l) => !active.some((b) => b.leadId === l.id),
  );
  const splitByDept = splitTotals(active);
  const departments = Object.entries(departmentNames).map(([id, name]) => ({
    id,
    name,
    amount: splitByDept[id as keyof typeof splitByDept],
    count: active.filter(
      (b) => bookingSplit(b)[id as keyof typeof splitByDept] > 0,
    ).length,
  }));
  const branchRows = branches
    .filter((b) => b.active)
    .map((b) => {
      const contracts = active.filter((c) => c.branchId === b.id);
      return {
        ...b,
        count: leads.filter((l) => l.branchId === b.id).length,
        late: overdue.filter((f) => f.branchId === b.id).length,
        missing: leads.filter(
          (l) =>
            l.branchId === b.id &&
            !["booked", "not_interested"].includes(l.status) &&
            !taskLeadIds.has(l.id),
        ).length,
        amount: contracts.reduce((s, c) => s + c.amount, 0),
        contracts: contracts.length,
        notBought: leads.filter(
          (l) =>
            l.branchId === b.id && !active.some((bk) => bk.leadId === l.id),
        ).length,
      };
    })
    .sort((a, b) =>
      activeSort === "late"
        ? b.late - a.late
        : activeSort === "missing"
          ? b.missing - a.missing
          : b.amount - a.amount,
    );
  const visibleBranches = branchRows.slice(0, showAllBranches ? undefined : 5);
  const maxAmount = Math.max(...branchRows.map((b) => b.amount), 1);
  const hasBranchSummary =
    !sales && (has("branches.view") || has("staff.view"));
  const date = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Cairo",
  }).format(new Date());
  const title = sales
    ? "يومك في الفرع"
    : isDirector(u)
      ? "نظرة على المؤسسة"
      : u.role === "branch_manager"
        ? "عملاؤك ومبيعات فرعك"
        : u.role === "regional_manager"
          ? "مبيعات كل الفروع"
          : "نطاق الإشراف";
  const metric = (
    page: string,
    label: string,
    value: number,
    note: string,
    Icon: typeof Users,
    tone = "neutral",
  ) =>
    canAccessPage(u, page) && (
      <button
        className={`metric studio-metric tone-${tone}`}
        key={page}
        onClick={() => setActiveTab(page)}
      >
        <span className="metric-top">
          <span>{label}</span>
          <span className="metric-icon">
            <Icon size={19} />
          </span>
        </span>
        <strong className="metric-value" dir="ltr">
          {value.toLocaleString("en-GB")}
        </strong>
        <span className="metric-bottom">
          <span className="metric-note">{note}</span>
          <ArrowUpLeft size={16} />
        </span>
      </button>
    );
  const attention = has("followups.view");
  return (
    <div className="design-dashboard">
      <div className="studio-heading">
        <div>
          <span className="eyebrow">
            {positionNames[u.role]}
            {u.role === "supervisor"
              ? ` · ${specialties[u.specialty || "sales"]}`
              : ""}
          </span>
          <h1>
            {title}
            <span className="heading-stop" aria-hidden="true">
              .
            </span>
          </h1>
          <p>
            {sales
              ? "كل عميل، وموعده، وخطوتك الجاية."
              : "أداء الفروع وأولويات المتابعة في مساحة واحدة."}
          </p>
        </div>
        <div className="studio-heading-tools">
          <span className="studio-date">
            <CalendarDays size={15} />
            {date}
          </span>
          {canCreateCustomer(u) ? (
            <button
              className="btn-primary"
              onClick={() => setActiveTab("add_client")}
            >
              <Plus size={18} />
              عميل جديد
            </button>
          ) : isDirector(u) ? (
            <button
              className="btn-secondary"
              onClick={() => setActiveTab("permissions")}
            >
              <SlidersHorizontal size={16} />
              الصلاحيات
            </button>
          ) : null}
        </div>
      </div>
      <div className="scope-strip">
        <span>
          <Building2 size={16} />
          {scopeLabel(u)}
        </span>
        <span className="scope-period">جميع الفترات</span>
        {scopeBranches.length > 1 && (
          <label className="scope-select">
            <span className="sr-only">تصفية بيانات الرئيسية بالفرع</span>
            <select
              aria-label="تصفية بيانات الرئيسية بالفرع"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setShowAllBranches(false);
              }}
            >
              <option value="all">كل الفروع المتاحة</option>
              {scopeBranches
                .filter((b) => b.active)
                .map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
            <ChevronDown size={15} />
          </label>
        )}
      </div>
      <div
        className={`studio-overview ${!attention ? "without-attention" : ""}`}
      >
        <section className="performance-hero" aria-label="ملخص الأداء">
          <div className="hero-copy">
            <span className="hero-kicker">
              <span />{" "}
              {has("bookings.view")
                ? "إجمالي المشتريات المسجلة"
                : has("customers.view")
                  ? "العملاء في نطاقك"
                  : "ملخص نطاق العمل"}
            </span>
            <div className="hero-amount">
              <strong dir="ltr">
                {has("bookings.view")
                  ? formatMoney(total)
                  : has("customers.view")
                    ? leads.length
                    : branches.filter((b) => b.active).length}
              </strong>
              <span>
                {has("bookings.view")
                  ? "جنيه مصري"
                  : has("customers.view")
                    ? "عميل مسجل"
                    : "فرع متاح"}
              </span>
            </div>
            <p>
              {has("bookings.view")
                ? `${active.length} عملية شراء · إجمالي المشتريات على الأقسام الأربعة`
                : "المؤشرات المتاحة وفق اختصاصك وفروعك."}
            </p>
            {canAccessPage(u, "reports") && (
              <button
                className="hero-link"
                onClick={() => setActiveTab("reports")}
              >
                قراءة التقارير
                <ArrowUpLeft size={18} />
              </button>
            )}
          </div>
          <div className="hero-mark" aria-hidden="true">
            <div />
            <div />
            <span>شلبي</span>
          </div>
          <span className="hero-footnote">
            {branchFilter === "all" ? "داخل نطاق عملك" : branches[0]?.name}
          </span>
        </section>
        {attention && (
          <section
            className={`attention-card ${overdue.length ? "needs-attention" : ""}`}
            aria-label="ملخص المتابعات"
          >
            <div className="attention-top">
              <span className="attention-tag">
                <CircleAlert size={14} />
                {overdue.length ? "يحتاج مراجعة" : "أولويات اليوم"}
              </span>
              <span className="attention-icon">
                {overdue.length ? <Clock3 size={21} /> : <Check size={21} />}
              </span>
            </div>
            <h2>
              {sales
                ? overdue.length
                  ? "نبدأ بالمتابعات المتأخرة؟"
                  : "مواعيدك، خطوة بخطوة."
                : overdue.length
                  ? "متابعات تحتاج مراجعتك."
                  : "تابع التزام فريقك اليوم."}
            </h2>
            <p>
              {sales
                ? "شوف الموعد وسجّل نتيجة التواصل من ملف العميل."
                : "راجع الموظف المسؤول والخطوة التالية لكل متابعة."}
            </p>
            <div className="attention-numbers">
              <div>
                <strong>{overdue.length}</strong>
                <span>متابعات متأخرة</span>
              </div>
              <div>
                <strong>{due.length}</strong>
                <span>مستحقة اليوم</span>
              </div>
            </div>
            <button
              className="attention-link"
              onClick={() =>
                setActiveTab(
                  overdue.length ? "overdue_followups" : "due_followups",
                )
              }
            >
              {sales ? "عرض متابعاتي" : "مراجعة المتابعات"}
              <ArrowLeft size={17} />
            </button>
          </section>
        )}
      </div>
      <div className="metric-grid studio-metrics">
        {metric(
          "clients",
          sales ? "عملاؤك" : "العملاء المسجلون",
          leads.length,
          "داخل نطاق العمل",
          Users,
        )}
        {metric(
          "bookings",
          "عمليات الشراء",
          active.length,
          "باستبعاد الملغى",
          ShoppingBag,
        )}
        {metric(
          "followups",
          sales ? "متابعات اليوم" : "متابعات متأخرة",
          sales ? due.length : overdue.length,
          sales ? `${overdue.length} متابعة متأخرة` : "داخل الفروع المتاحة",
          PhoneCall,
          overdue.length ? "warning" : "neutral",
        )}
        {metric(
          "invoices",
          "لم يشتروا بعد",
          notBoughtYet.length,
          "عملاء بلا عملية شراء، فرص للمتابعة",
          FileText,
        )}
      </div>
      <div
        className={`studio-analysis-grid ${!hasBranchSummary ? "single-column" : ""}`}
      >
        {hasBranchSummary && (
          <section className="panel branch-performance">
            <div className="studio-panel-heading">
              <div>
                <span className="eyebrow">من الإجمالي للتفاصيل</span>
                <h2>
                  {isDirector(u) || u.role === "regional_manager"
                    ? "مقارنة الفروع"
                    : "ملخص نطاق العمل"}
                </h2>
                <p>راجع الأرقام، ثم افتح الفرع للتفاصيل.</p>
              </div>
              <select
                className="studio-select"
                aria-label="ترتيب الفروع"
                value={activeSort}
                onChange={(e) => setSort(e.target.value)}
              >
                {has("bookings.view") && (
                  <option value="amount">إجمالي المشتريات</option>
                )}
                {has("followups.view") && (
                  <option value="late">تأخر المتابعة</option>
                )}
                {has("customers.view") && (
                  <option value="missing">بدون خطوة تالية</option>
                )}
                {!has("bookings.view") &&
                  !has("followups.view") &&
                  !has("customers.view") && (
                    <option value="amount">الترتيب الحالي</option>
                  )}
              </select>
            </div>
            <div className="table-scroll branch-desktop">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الفرع / المسؤول</th>
                    {has("bookings.view") && <th>إجمالي المشتريات</th>}
                    {has("followups.view") && <th>متابعات متأخرة</th>}
                    {has("customers.view") && <th>بدون خطوة تالية</th>}
                    {has("customers.view") && <th>لم يشتروا بعد</th>}
                    <th>
                      <span className="sr-only">تفاصيل الفرع</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBranches.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <button
                          className="branch-name"
                          onClick={() => setSelectedBranch(b)}
                        >
                          {b.name}
                        </button>
                        <span className="table-secondary">
                          {b.managerName || "مدير الفرع غير محدد"}
                        </span>
                      </td>
                      {has("bookings.view") && (
                        <td className="branch-value">
                          <strong>
                            <bdi>{formatMoney(b.amount)}</bdi>{" "}
                            <small>ج.م</small>
                          </strong>
                          <div className="branch-volume" aria-hidden="true">
                            <span
                              style={{
                                width: `${(b.amount / maxAmount) * 100}%`,
                              }}
                            />
                          </div>
                          {!b.contracts && (
                            <span className="no-records">
                              لا توجد مشتريات مسجلة
                            </span>
                          )}
                        </td>
                      )}
                      {has("followups.view") && (
                        <td>
                          <span
                            className={`count-badge ${b.late ? "is-alert" : ""}`}
                          >
                            {b.late}
                          </span>
                        </td>
                      )}
                      {has("customers.view") && (
                        <td>
                          <span
                            className={`count-badge ${b.missing ? "is-pending" : ""}`}
                          >
                            {b.missing}
                          </span>
                        </td>
                      )}
                      {has("customers.view") && <td>{b.notBought}</td>}
                      <td>
                        <button
                          className="branch-open"
                          onClick={() => setSelectedBranch(b)}
                          aria-label={`عرض فرع ${b.name}`}
                        >
                          <ArrowUpLeft size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="branch-mobile-list">
              {visibleBranches.map((b) => (
                <article className="branch-mobile-card" key={b.id}>
                  <div>
                    <button
                      className="branch-name"
                      onClick={() => setSelectedBranch(b)}
                    >
                      {b.name}
                    </button>
                    <button
                      className="branch-open"
                      aria-label={`عرض فرع ${b.name}`}
                      onClick={() => setSelectedBranch(b)}
                    >
                      <ArrowUpLeft size={17} />
                    </button>
                  </div>
                  <p>{b.managerName || "مدير الفرع غير محدد"}</p>
                  {has("bookings.view") && (
                    <strong className="branch-mobile-amount">
                      <bdi>{formatMoney(b.amount)}</bdi> <small>ج.م</small>
                    </strong>
                  )}
                  <div className="branch-mobile-meta">
                    {has("followups.view") && (
                      <span>
                        <i className={b.late ? "dot-alert" : "dot-neutral"} />
                        {b.late} متابعة متأخرة
                      </span>
                    )}
                    {has("customers.view") && (
                      <span>{b.missing} بدون خطوة تالية</span>
                    )}
                    {has("invoices.view") && (
                      <span>{b.notBought} لم يشتروا بعد</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!branchRows.length && (
              <div className="empty-state">
                <Building2 size={25} />
                <h3>نطاق العمل لم يُحدد بعد</h3>
                <p>حدد فروع الموظف من ملفه لعرض مؤشرات أدائه.</p>
              </div>
            )}
            <div className="studio-panel-footer">
              <p>
                إجمالي المشتريات لكل الفترات. غياب السجلات لا يكفي لتقييم أداء
                الفرع.
              </p>
              {branchRows.length > 5 && (
                <button
                  className="btn-text"
                  onClick={() => setShowAllBranches((v) => !v)}
                >
                  {showAllBranches
                    ? "عرض مختصر"
                    : `كل الفروع (${branchRows.length})`}
                  <ChevronDown
                    size={15}
                    className={showAllBranches ? "is-rotated" : ""}
                  />
                </button>
              )}
            </div>
          </section>
        )}
        {has("bookings.view") && (
          <section className="panel department-composition">
            <div className="studio-panel-heading">
              <div>
                <span className="eyebrow">توزيع النشاط</span>
                <h2>كل قسم، ونصيبه</h2>
                <p>من إجمالي المشتريات</p>
              </div>
              <ShoppingBag size={20} />
            </div>
            <div className="composition-track" aria-hidden="true">
              {departments.map((d) => (
                <span
                  key={d.id}
                  style={{
                    width: `${total ? (d.amount / total) * 100 : 0}%`,
                    background: departmentColors[d.id],
                  }}
                />
              ))}
            </div>
            <div className="studio-departments">
              {departments.map((d) => (
                <div className="studio-department" key={d.id}>
                  <div
                    className="department-dot"
                    style={{ background: departmentColors[d.id] }}
                  />
                  <div>
                    <h3>{d.name}</h3>
                    <p>{d.count} عملية شراء</p>
                  </div>
                  <div className="department-figure">
                    <strong>
                      <bdi>{formatMoney(d.amount)}</bdi>
                    </strong>
                    <small>
                      {total ? `${Math.round((d.amount / total) * 100)}٪` : "—"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            <div className="department-note">
              <span>ج.م</span>
              <p>
                القيم هي إجمالي المشتريات غير الملغاة موزّعة على الأقسام الأربعة.
              </p>
            </div>
          </section>
        )}
      </div>
      {has("followups.view") && (
        <section className="panel studio-followups">
          <div className="studio-panel-heading">
            <div>
              <span className="eyebrow">الخطوة القادمة</span>
              <h2>
                {sales ? "المتابعات الأقرب" : "المتابعات التي تحتاج مراجعة"}
              </h2>
              <p>
                {sales
                  ? "المتأخر أولًا، وبعده أقرب موعد."
                  : "الموعد والمسؤول وآخر سبب مسجل للمتابعة."}
              </p>
            </div>
            <button
              className="btn-text"
              onClick={() => setActiveTab("followups")}
            >
              كل المتابعات
              <ArrowLeft size={16} />
            </button>
          </div>
          <div className="studio-task-list">
            {tasks.slice(0, 4).map((f) => {
              const status = followUpStatus(f);
              return (
                <article className="studio-task" key={f.id}>
                  <span className="task-symbol">
                    <PhoneCall size={19} />
                  </span>
                  <div className="studio-task-copy">
                    <h3>{f.leadName}</h3>
                    <p>{f.reason}</p>
                    <span>
                      {f.assignedAgentName || "الموظف المسؤول"} ·{" "}
                      <bdi>{f.scheduledAt.replace("T", " ").slice(0, 16)}</bdi>
                    </span>
                  </div>
                  <span
                    className={`status-pill ${status === "overdue" ? "is-new" : status === "due" ? "is-warning" : ""}`}
                  >
                    <i />
                    {status === "overdue"
                      ? "متأخرة"
                      : status === "due"
                        ? "اليوم"
                        : "قادمة"}
                  </span>
                  {has("customers.view") &&
                    scopeLeads.some((l) => l.id === f.leadId) && (
                      <button
                        className="btn-secondary"
                        onClick={() => onOpenLead(f.leadId)}
                      >
                        ملف العميل
                        <ArrowUpLeft size={16} />
                      </button>
                    )}
                </article>
              );
            })}
            {!tasks.length && (
              <div className="empty-state">
                <Check size={27} />
                <h3>لا توجد متابعات معلّقة</h3>
                <p>أي مواعيد جديدة داخل نطاقك هتظهر هنا.</p>
              </div>
            )}
          </div>
        </section>
      )}
      <footer className="studio-page-footer">
        <span>
          <span className="brand-dot" />
          شلبي
        </span>
        <span>تفاصيل وجودة تليق بذوقك</span>
      </footer>
      <BranchDetailsModal
        key={selectedBranch?.id}
        branch={selectedBranch}
        isOpen={!!selectedBranch}
        onClose={() => setSelectedBranch(null)}
        onOpenLead={onOpenLead}
      />
    </div>
  );
}
