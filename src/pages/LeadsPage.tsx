import { PageGuide } from "../components/common/PageGuide";
import {
  canCreateCustomer,
  canAssignCustomers,
  canContactCustomer,
  isSales,
} from "../lib/access";
import { useEffect, useState } from "react";
import { FilterBar } from "../components/common/FilterBar";
import {
  Plus,
  Search,
  Download,
  ChevronDown,
  SlidersHorizontal,
  ArrowUpLeft,
  Phone,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Users,
} from "lucide-react";
import { useCRM } from "../context/CRMContext";
import {
  statusNames,
  sourceNames,
  isManagement,
  phoneNumber,
  today,
} from "../lib/presentation";

interface Props {
  onOpenLead: (id: string) => void;
  onNavigateAddLead: () => void;
}
export function LeadsPage({ onOpenLead, onNavigateAddLead }: Props) {
  const { effectiveUser, leads, branches, users, followUps, reassignLead } =
    useCRM();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [branch, setBranch] = useState("all");
  const [agent, setAgent] = useState("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [targetAgent, setTargetAgent] = useState("");
  const [notice, setNotice] = useState("");
  const visible = leads;
  const filtered = visible.filter(
    (l) =>
      (!query.trim() ||
        [l.name, l.phone, l.whatsappPhone, l.courseOfInterest].some((v) =>
          v?.toLowerCase().includes(query.trim().toLowerCase()),
        )) &&
      (status === "all" || l.status === status) &&
      (branch === "all" || l.branchId === branch) &&
      (agent === "all" || l.assignedAgentId === agent) &&
      (source === "all" || l.source === source),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const rows = filtered.slice((page - 1) * 20, page * 20);
  const hasFilters =
    !!query ||
    status !== "all" ||
    branch !== "all" ||
    agent !== "all" ||
    source !== "all";
  useEffect(() => {
    setPage(1);
    setSelected([]);
    setNotice("");
  }, [query, status, branch, agent, source, effectiveUser.id]);
  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  const exportCsv = () => {
    const cell = (value: string) =>
      '"' +
      (/^[=+@-]/.test(value) ? "'" : "") +
      value.replace(/"/g, '""') +
      '"';
    const text =
      "\uFEFF" +
      [
        ["الاسم", "الهاتف", "الحالة", "الفرع", "الموظف المسؤول"],
        ...filtered.map((l) => [
          l.name,
          l.phone,
          statusNames[l.status],
          l.branchName || "",
          l.assignedAgentName || "",
        ]),
      ]
        .map((r) => r.map(cell).join(","))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "عملاء-شلبي.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const move = () => {
    if (!targetAgent) return;
    selected.forEach((id) => reassignLead(id, targetAgent));
    setNotice(`تم تعيين مسؤول جديد لـ ${selected.length} عميل على هذا الجهاز.`);
    setSelected([]);
    setTargetAgent("");
  };
  const nextDate = (date?: string) =>
    date?.slice(0, 10) === today()
      ? "اليوم"
      : date?.slice(0, 10) || "بدون موعد";
  const pill = (lead: (typeof leads)[number]) => (
    <span
      className={`status-pill ${lead.status === "booked" ? "is-success" : lead.status === "new" ? "is-new" : lead.status === "needs_followup" ? "is-warning" : ""}`}
    >
      {statusNames[lead.status]}
    </span>
  );
  const clear = () => {
    setQuery("");
    setStatus("all");
    setBranch("all");
    setAgent("all");
    setSource("all");
  };
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">علاقات تستمر</span>
          <h1>{effectiveUser.role === "sales_agent" ? "عملاؤك" : "العملاء"}</h1>
          <p>ملفات العملاء داخل نطاقك، وحالة كل عميل والمسؤول عنه.</p>
        </div>
        {canCreateCustomer(effectiveUser) && (
          <button className="btn-primary" onClick={onNavigateAddLead}>
            <Plus size={17} />
            عميل جديد
          </button>
        )}
      </div>
      <PageGuide id="customers" />
      <section className="panel">
        <FilterBar
          search={{ value: query, onChange: setQuery, placeholder: "اسم العميل أو رقم الهاتف…" }}
          selects={[
            { id: "status", label: "حالة العميل", value: status, onChange: setStatus, allLabel: "كل الحالات", primary: true, options: Object.entries(statusNames).map(([id, label]) => ({ value: id, label })) },
            { id: "branch", label: "الفرع", value: branch, onChange: setBranch, allLabel: "كل الفروع المتاحة", options: isManagement(effectiveUser) ? branches.filter((b) => visible.some((l) => l.branchId === b.id)).map((b) => ({ value: b.id, label: b.name })) : [] },
            { id: "agent", label: "الموظف المسؤول", value: agent, onChange: setAgent, allLabel: "كل الموظفين المتاحين", options: users.filter((u) => visible.some((l) => l.assignedAgentId === u.id)).map((u) => ({ value: u.id, label: u.name })) },
            { id: "source", label: "مصدر العميل", value: source, onChange: setSource, allLabel: "كل المصادر", options: Object.entries(sourceNames).map(([id, label]) => ({ value: id, label })) },
          ]}
          count={{ shown: filtered.length, noun: "عميل" }}
          onReset={clear}
          actions={
            <button className="btn-secondary" onClick={exportCsv} disabled={!filtered.length} aria-label="تصدير العملاء CSV">
              <Download size={16} />
              <span className="desktop-only">تصدير</span>
            </button>
          }
        />
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {canAssignCustomers(effectiveUser) && !!selected.length && (
          <div className="selection-bar">
            <span>تم تحديد {selected.length} عميل</span>
            <select
              aria-label="المسؤول الجديد"
              value={targetAgent}
              onChange={(e) => setTargetAgent(e.target.value)}
            >
              <option value="">اختَر المسؤول الجديد</option>
              {users
                .filter(
                  (u) =>
                    u.active &&
                    ["sales_agent", "team_leader"].includes(u.role) &&
                    visible
                      .filter((l) => selected.includes(l.id))
                      .every((l) => l.branchId === u.branchId),
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
            <button
              className="btn-primary"
              disabled={!targetAgent}
              onClick={move}
            >
              تعيين المسؤول
            </button>
            <button className="btn-text" onClick={() => setSelected([])}>
              إلغاء التحديد
            </button>
          </div>
        )}
        {!rows.length ? (
          <div className="empty-state">
            <Users size={30} strokeWidth={1.3} />
            <h3>
              {hasFilters ? "مفيش عميل مطابق للبحث" : "لسه مفيش عملاء في نطاقك"}
            </h3>
            <p>
              {hasFilters
                ? "جرّب رقم الهاتف أو قلّل الفلاتر."
                : "العملاء المسجلون داخل نطاقك سيظهرون هنا."}
            </p>
            {hasFilters ||
              (canCreateCustomer(effectiveUser) && (
                <button
                  className="btn-secondary"
                  onClick={hasFilters ? clear : onNavigateAddLead}
                >
                  {hasFilters ? "عرض كل العملاء" : "إضافة عميل"}
                </button>
              ))}
          </div>
        ) : (
          <>
            <div className="directory-table">
              <table className="data-table">
                <thead>
                  <tr>
                    {canAssignCustomers(effectiveUser) && (
                      <th style={{ width: 35 }}>
                        <input
                          aria-label="تحديد عملاء الصفحة"
                          type="checkbox"
                          checked={
                            rows.length > 0 &&
                            rows.every((l) => selected.includes(l.id))
                          }
                          onChange={() =>
                            setSelected(
                              rows.every((l) => selected.includes(l.id))
                                ? []
                                : rows.map((l) => l.id),
                            )
                          }
                        />
                      </th>
                    )}
                    <th>العميل</th>
                    <th>الحالة</th>
                    <th>الموظف المسؤول</th>
                    <th>المتابعة القادمة</th>
                    <th>
                      <span className="sr-only">الملف</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.id}>
                      {canAssignCustomers(effectiveUser) && (
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`تحديد ${l.name}`}
                            checked={selected.includes(l.id)}
                            onChange={() => toggle(l.id)}
                          />
                        </td>
                      )}
                      <td>
                        <button
                          className="customer-name"
                          onClick={() => onOpenLead(l.id)}
                        >
                          {l.name}
                        </button>
                        <span className="table-secondary">
                          <span dir="ltr">{l.phone}</span> ·{" "}
                          {sourceNames[l.source]}
                        </span>
                      </td>
                      <td>{pill(l)}</td>
                      <td>
                        {l.assignedAgentName || "لم يُحدد"}

                      </td>
                      <td>
                        <span
                          className={
                            l.nextFollowUpDate?.slice(0, 10) === today()
                              ? "status-pill is-warning"
                              : ""
                          }
                        >
                          {nextDate(l.nextFollowUpDate)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-link"
                          onClick={() => onOpenLead(l.id)}
                        >
                          فتح الملف
                          <ArrowUpLeft size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="customer-cards">
              {rows.map((l) => (
                <article className="customer-card" key={l.id}>
                  <div className="customer-card-heading">
                    <div>
                      <button onClick={() => onOpenLead(l.id)}>
                        <h2>{l.name}</h2>
                      </button>
                      <p dir="ltr">{l.phone}</p>
                    </div>
                    {pill(l)}
                  </div>
                  <div className="customer-card-meta">
                    <span>{l.assignedAgentName || "بدون مسؤول"}</span>
                    <span>المتابعة: {nextDate(l.nextFollowUpDate)}</span>
                  </div>
                  <div className="customer-card-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => onOpenLead(l.id)}
                    >
                      الملف
                      <ArrowUpLeft size={14} />
                    </button>
                    {canContactCustomer(effectiveUser, l, followUps) && (
                      <a
                        className="btn-secondary"
                        href={`tel:${phoneNumber(l.phone)}`}
                      >
                        <Phone size={14} />
                        اتصال
                      </a>
                    )}
                    {canContactCustomer(effectiveUser, l, followUps) && (
                      <a
                        className="btn-secondary"
                        href={`https://wa.me/${phoneNumber(l.whatsappPhone || l.phone)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={14} />
                        واتساب
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {pageCount > 1 && (
          <div className="filter-count">
            <span>
              صفحة {page} من {pageCount}
            </span>
            <div style={{ display: "flex", gap: 18 }}>
              <button
                aria-label="الصفحة السابقة"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ArrowRight size={17} />
              </button>
              <button
                aria-label="الصفحة التالية"
                disabled={page >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                <ArrowLeft size={17} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
