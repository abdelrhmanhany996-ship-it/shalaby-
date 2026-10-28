import { hasPermission } from "../../lib/permissions";
import { useDialog } from "./useDialog";
import React from "react";
import {
  Company,
  Governorate,
  Warehouse,
  Branch,
  Lead,
  Booking,
  User,
} from "../../types/crm";
import { useCRM } from "../../context/CRMContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  X,
  Building2,
  MapPin,
  Phone,
  UserCheck,
  Building,
  TrendingUp,
  Users,
  ShoppingBag,
  ChevronLeft,
  Warehouse as WarehouseIcon,
  Globe,
  CheckCircle2,
} from "lucide-react";

export type EntityType =
  | "governorate"
  | "company"
  | "main_hq"
  | "showroom"
  | "warehouse";

interface HierarchyControlModalProps {
  entityType: EntityType | null;
  entityData: Governorate | Company | Branch | Warehouse | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenBranchDetails?: (branch: Branch) => void;
  onOpenLead?: (leadId: string) => void;
}

export const HierarchyControlModal: React.FC<HierarchyControlModalProps> = ({
  entityType,
  entityData,
  isOpen,
  onClose,
  onOpenBranchDetails,
  onOpenLead,
}) => {
  const {
    effectiveUser,
    branches,
    companies,
    governorates,
    warehouses,
    leads,
    bookings,
    users,
  } = useCRM();
  const { t } = useLanguage();

  const dialogRef = useDialog(isOpen, onClose);
  if (!isOpen || !entityData || !entityType) return null;

  // Filter linked items based on entity type
  let title = "";
  let code = "";
  let managerName = "";
  let phone = "";
  let description = "";

  let linkedBranches: Branch[] = [];
  let linkedWarehouses: Warehouse[] = [];
  let linkedCompanies: Company[] = [];

  if (entityType === "governorate") {
    const gov = entityData as Governorate;
    title = gov.name;
    code = gov.code;
    managerName = gov.managerName || "غير عين";
    phone = gov.phone;
    description = `إقليم جغرافي يتبع: ${gov.region}`;

    linkedBranches = branches.filter((b) => b.governorateId === gov.id);
    linkedWarehouses = warehouses.filter((w) => w.governorateId === gov.id);
    linkedCompanies = companies;
  } else if (entityType === "company") {
    const cmp = entityData as Company;
    title = cmp.name;
    code = cmp.code;
    managerName = cmp.ceoName || "غير عين";
    phone = cmp.phone;
    description = cmp.description;

    linkedBranches = branches.filter((b) => b.companyId === cmp.id);
    linkedWarehouses = warehouses.filter((w) =>
      linkedBranches.some((b) => b.id === w.branchId),
    );
  } else if (entityType === "warehouse") {
    const wh = entityData as Warehouse;
    title = wh.name;
    code = wh.code;
    managerName = wh.managerName || "غير عين";
    phone = wh.phone;
    description = `العنوان: ${wh.address} · السعة الاستيعابية: ${wh.capacity}`;

    linkedBranches = branches.filter((b) => b.id === wh.branchId);
  }

  // Calculate stats for linked branches
  const linkedBranchIds = linkedBranches.map((b) => b.id);
  const scopeLeads = leads.filter((l) => linkedBranchIds.includes(l.branchId));
  const scopeBookings = bookings.filter(
    (b) =>
      b.bookingStatus !== "cancelled" && linkedBranchIds.includes(b.branchId),
  );
  const scopeStaff = users.filter(
    (u) => u.branchId && linkedBranchIds.includes(u.branchId),
  );
  const scopeRevenue = scopeBookings.reduce((sum, b) => sum + b.amount, 0);

  const mainHq = linkedBranches.find((b) => b.branchType === "main_hq");
  const showrooms = linkedBranches.filter((b) => b.branchType !== "main_hq");

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-white dark:bg-[#1d1d1c] text-slate-900 dark:text-white p-5 sm:p-6 flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#232322] text-[#c8232b] border border-slate-200 dark:border-white/10 flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
              {entityType === "governorate" && "🗺️"}
              {entityType === "company" && "🏛️"}
              {entityType === "warehouse" && "🏭"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                  {title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  مفعل إدارياً
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                {description}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-4 flex-wrap">
                <span>
                  المسؤول المعتمد:{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {managerName}
                  </strong>
                </span>
                <span className="font-mono-numbers">الهاتف: {phone}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Metrics */}
        <div className="bg-slate-50 dark:bg-[#121620] border-b border-slate-200 dark:border-white/10 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div className="bg-white dark:bg-[#1d1d1c] p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              إجمالي مبيعات النطاق:
            </div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono-numbers">
              {hasPermission(effectiveUser, "bookings.view")
                ? `${scopeRevenue.toLocaleString("ar-EG")} ج.م`
                : "غير متاح لصلاحياتك"}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1d1d1c] p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              الفروع والمعارض:
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 font-mono-numbers">
              {linkedBranches.length} فرع
            </div>
          </div>

          <div className="bg-white dark:bg-[#1d1d1c] p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              المخازن والمستودعات:
            </div>
            <div className="text-base font-bold text-slate-700 dark:text-[#c8232b] mt-0.5 font-mono-numbers">
              {linkedWarehouses.length} مستودع
            </div>
          </div>

          <div className="bg-white dark:bg-[#1d1d1c] p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              عملاء النطاق المسجلين:
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono-numbers">
              {hasPermission(effectiveUser, "customers.view")
                ? `${scopeLeads.length} عميل`
                : "غير متاح لصلاحياتك"}
            </div>
          </div>
        </div>

        {/* Drill-down Sub-entities Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Main HQ Branch */}
          {mainHq && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-[#c8232b] flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-[#c8232b]" />
                  <span>الفرع الرئيسي التابع لهذا النطاق:</span>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs">
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 text-sm block">
                    {mainHq.name}
                  </strong>
                  <span className="text-slate-600 dark:text-slate-300">
                    المدير: {mainHq.managerName || "غير معين"} ·{" "}
                    {mainHq.address}
                  </span>
                </div>

                {onOpenBranchDetails && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenBranchDetails(mainHq);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-[#292928] dark:hover:bg-[#343431] text-white border border-slate-600/30 dark:border-white/10 rounded-xl text-xs font-bold cursor-pointer shrink-0 shadow-xs"
                  >
                    عرض الملف الكامل للفرع الرئيسي ←
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Warehouses Section */}
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <WarehouseIcon className="w-4 h-4 text-[#c8232b]" />
              <span>
                المخازن والمستودعات اللوجستية المخصصة ({linkedWarehouses.length}
                ):
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {linkedWarehouses.length === 0 ? (
                <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs sm:col-span-2 bg-slate-50 dark:bg-[#121620] rounded-xl border border-slate-200 dark:border-white/5">
                  لا توجد مستودعات مخصصة في هذا النطاق
                </div>
              ) : (
                linkedWarehouses.map((wh) => (
                  <div
                    key={wh.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                      <span>{wh.name}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      أمين المخزن:{" "}
                      <strong>{wh.managerName || "غير معين"}</strong>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] font-mono-numbers">
                      السعة: {wh.capacity}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {wh.address}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Local Branches & Showrooms */}
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#c8232b]" />
              <span>
                الفروع والمعارض الإقليمية والفرعية ({showrooms.length}):
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {showrooms.length === 0 ? (
                <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs sm:col-span-2 bg-slate-50 dark:bg-[#121620] rounded-xl border border-slate-200 dark:border-white/5">
                  لا توجد معارض فرعية إضافية مسجلة بهذا النطاق
                </div>
              ) : (
                showrooms.map((sh) => (
                  <div
                    key={sh.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1d1d1c] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                      <span>{sh.name}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      مدير المعرض:{" "}
                      <strong>{sh.managerName || "غير معين"}</strong>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {sh.address}
                    </div>

                    {onOpenBranchDetails && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button
                          onClick={() => {
                            onClose();
                            onOpenBranchDetails(sh);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-[#292928] dark:hover:bg-[#343431] text-white border border-slate-600/30 dark:border-white/10 rounded-xl font-bold text-xs cursor-pointer shadow-2xs"
                        >
                          تحكم الفرع ←
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-[#121620] border-t border-slate-200 dark:border-white/10 p-4 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-[#292928] dark:hover:bg-[#343431] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-600/30 dark:border-white/10"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
