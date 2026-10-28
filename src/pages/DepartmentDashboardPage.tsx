import { useState } from "react";
import { bookingSplit } from "../lib/purchases";
import { useCRM } from "../context/CRMContext";
import { hasPermission } from "../lib/permissions";
import { scopeLabel } from "../lib/access";
import { departmentNames, formatMoney } from "../lib/presentation";
import { BranchDetailsModal } from "../components/common/BranchDetailsModal";
import type { Branch, Department } from "../types/crm";
interface Props {
  setActiveTab: (id: string) => void;
  onOpenLead: (id: string) => void;
}
export function DepartmentDashboardPage({ setActiveTab, onOpenLead }: Props) {
  const { effectiveUser: u, leads, bookings, visits, branches } = useCRM();
  const [department, setDepartment] = useState<Department>("decor");
  const [branch, setBranch] = useState<Branch | null>(null);
  const has = (p: Parameters<typeof hasPermission>[1]) => hasPermission(u, p);
  const contracts = bookings.filter(
    (b) =>
      b.bookingStatus !== "cancelled" && bookingSplit(b)[department] > 0,
  );
  const clients = leads.filter((l) => l.department === department);
  const visitsInDept = visits.filter((v) => v.department === department);
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{scopeLabel(u)}</span>
          <h1>الأقسام والفروع</h1>
          <p>
            قارن الأقسام داخل الفروع وحدد مواضع النشاط، وفق البيانات المتاحة
            لصلاحياتك.
          </p>
        </div>
      </div>
      <div className="tab-filter" role="group" aria-label="القسم">
        {Object.entries(departmentNames).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={department === id}
            onClick={() => setDepartment(id as Department)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="metric-grid" style={{ marginTop: 20 }}>
        {has("bookings.view") && (
          <div className="metric">
            <span>مشتريات القسم</span>
            <strong className="metric-value">
              {formatMoney(contracts.reduce((s, c) => s + bookingSplit(c)[department], 0))} ج.م
            </strong>
            <span className="metric-note">
              جميع الفترات · لا تشمل الملغى
            </span>
          </div>
        )}
        {has("customers.view") && (
          <div className="metric">
            <span>عملاء القسم</span>
            <strong className="metric-value">{clients.length}</strong>
          </div>
        )}
        {has("visits.view") && (
          <div className="metric">
            <span>زيارات تخص القسم</span>
            <strong className="metric-value">{visitsInDept.length}</strong>
          </div>
        )}
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{departmentNames[department]}</h2>
            <p>
              الفروع التي لم تسجل نشاطًا تظهر بدون سجلات، ولا تعتبر تلقائيًا
              فروعًا مقصرة.
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>الفرع والمسؤول</th>
                {has("customers.view") && <th>العملاء</th>}
                {has("visits.view") && <th>الزيارات</th>}
                {has("bookings.view") && <th>إجمالي المشتريات</th>}
                <th>تفاصيل الفرع</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.name}</strong>
                    <span className="table-secondary">
                      {b.managerName || "لم يحدد مدير للفرع"}
                    </span>
                  </td>
                  {has("customers.view") && (
                    <td>
                      {clients.filter((l) => l.branchId === b.id).length ||
                        "لا توجد سجلات"}
                    </td>
                  )}
                  {has("visits.view") && (
                    <td>
                      {visitsInDept.filter((v) => v.branchId === b.id).length ||
                        "لا توجد سجلات"}
                    </td>
                  )}
                  {has("bookings.view") && (
                    <td>
                      {contracts.some((c) => c.branchId === b.id)
                        ? `${formatMoney(contracts.filter((c) => c.branchId === b.id).reduce((s, c) => s + c.amount, 0))} ج.م`
                        : "لا توجد مشتريات مسجلة"}
                    </td>
                  )}
                  <td>
                    <button className="btn-text" onClick={() => setBranch(b)}>
                      عرض الفرع
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <BranchDetailsModal
        key={branch?.id}
        branch={branch}
        isOpen={!!branch}
        onClose={() => setBranch(null)}
        onOpenLead={onOpenLead}
      />
    </div>
  );
}
