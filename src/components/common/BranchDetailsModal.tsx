import { bookingSplit } from "../../lib/purchases";
import { useState } from "react";
import type { Branch } from "../../types/crm";
import { useCRM } from "../../context/CRMContext";
import { hasPermission, positionNames } from "../../lib/permissions";
import { canCreateCustomer, canContactCustomer } from "../../lib/access";
import {
  formatMoney,
  departmentNames,
  statusNames,
  phoneNumber,
  followUpStatus,
} from "../../lib/presentation";
import { useDialog } from "./useDialog";
import { X } from "lucide-react";
interface Props {
  branch: Branch | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLead?: (id: string) => void;
  onAddClientForBranch?: (id: string) => void;
}
export function BranchDetailsModal({
  branch,
  isOpen,
  onClose,
  onOpenLead,
  onAddClientForBranch,
}: Props) {
  const {
    effectiveUser: u,
    branches,
    leads,
    bookings,
    visits,
    users,
    followUps,
    purchaseInvoices,
  } = useCRM();
  const [tab, setTab] = useState("overview");
  const ref = useDialog(isOpen, onClose);
  if (!isOpen || !branch || !branches.some((b) => b.id === branch.id))
    return null;
  const has = (p: Parameters<typeof hasPermission>[1]) => hasPermission(u, p);
  const clients = leads.filter((l) => l.branchId === branch.id);
  const contracts = bookings.filter(
    (b) => b.branchId === branch.id && b.bookingStatus !== "cancelled",
  );
  const tasks = followUps.filter((f) => f.branchId === branch.id);
  const staff = users.filter((s) => s.branchId === branch.id);
  const tabs = [
    ["overview", "نظرة عامة", true],
    ["staff", "الموظفون", has("staff.view")],
    ["clients", "العملاء", has("customers.view")],
    ["sales", "التعاقدات", has("bookings.view")],
  ] as const;
  const selected = tabs.some((t) => t[0] === tab && t[2]) ? tab : "overview";
  return (
    <div className="dialog-backdrop">
      <div
        className="client-dialog"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-profile-title"
      >
        <div className="client-dialog-header">
          <div>
            <span className="eyebrow">ملف الفرع</span>
            <h2 id="branch-profile-title">{branch.name}</h2>
            <p>
              {branch.address} · المدير: {branch.managerName || "لم يحدد"}
            </p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="إغلاق ملف الفرع"
          >
            <X size={20} />
          </button>
        </div>
        <div className="tab-filter">
          {tabs
            .filter((t) => t[2])
            .map(([id, label]) => (
              <button
                key={id}
                aria-pressed={selected === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
        </div>
        <div className="client-scroll">
          {selected === "overview" && (
            <>
              <div className="metric-grid">
                {[
                  {
                    allowed: has("customers.view"),
                    label: "العملاء",
                    value: clients.length,
                  },
                  {
                    allowed: has("bookings.view"),
                    label: "إجمالي المشتريات",
                    value: `${formatMoney(contracts.reduce((s, c) => s + c.amount, 0))} ج.م`,
                  },
                  {
                    allowed: has("visits.view"),
                    label: "الزيارات المسجلة",
                    value: visits.filter((v) => v.branchId === branch.id)
                      .length,
                  },
                  {
                    allowed: has("followups.view"),
                    label: "متابعات متأخرة",
                    value: tasks.filter((f) => followUpStatus(f) === "overdue")
                      .length,
                  },
                ]
                  .filter((m) => m.allowed)
                  .map((m) => (
                    <div className="metric" key={m.label}>
                      <span>{m.label}</span>
                      <strong className="metric-value">{m.value}</strong>
                    </div>
                  ))}
              </div>
              {has("bookings.view") && (
                <div className="department-list">
                  <h3>المشتريات حسب القسم</h3>
                  {Object.entries(departmentNames).map(([id, label]) => (
                    <div className="department-row" key={id}>
                      <div>
                        <span>{label}</span>
                        <strong>
                          {formatMoney(
                            contracts.reduce(
                              (s, c) =>
                                s +
                                bookingSplit(c)[id as keyof ReturnType<typeof bookingSplit>],
                              0,
                            ),
                          )}{" "}
                          ج.م
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {selected === "staff" && (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>المنصب</th>
                    <th>المسمى الوظيفي</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{positionNames[s.role]}</td>
                      <td>{s.jobPositionTitle || "لم يحدد"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selected === "clients" && (
            <>
              <div className="panel-header">
                <h3>عملاء الفرع</h3>
                {canCreateCustomer(u) && onAddClientForBranch && (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      onClose();
                      onAddClientForBranch(branch.id);
                    }}
                  >
                    إضافة عميل للفرع
                  </button>
                )}
              </div>
              {clients.map((l) => (
                <article className="profile-record" key={l.id}>
                  <h3>{l.name}</h3>
                  <p>
                    {statusNames[l.status]} · المسؤول:{" "}
                    {l.assignedAgentName || "لم يحدد"}
                  </p>
                  <div className="followup-actions">
                    {onOpenLead && (
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          onClose();
                          onOpenLead(l.id);
                        }}
                      >
                        ملف العميل
                      </button>
                    )}
                    {canContactCustomer(u, l, followUps) && (
                      <a
                        className="btn-secondary"
                        href={`https://wa.me/${phoneNumber(l.whatsappPhone || l.phone)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        واتساب
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </>
          )}
          {selected === "sales" &&
            contracts.map((c) => (
              <article className="profile-record" key={c.id}>
                <h3>
                  {c.leadName} · {c.courseName}
                </h3>
                <p>
                  {formatMoney(c.amount)} ج.م · {c.agentName} · {c.bookingDate}
                </p>
              </article>
            ))}
        </div>
        <div className="profile-footer">
          <span>جميع الفترات · حسب صلاحياتك</span>
          <button className="btn-text" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
