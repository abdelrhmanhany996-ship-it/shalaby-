import { PageGuide } from "../components/common/PageGuide";
import { branchLimitMessage, branchQuota } from "../lib/license";
import { canManageOrganization } from "../lib/access";
import React, { useState } from "react";
import { useCRM } from "../context/CRMContext";
import { useLanguage } from "../context/LanguageContext";
import {
  Branch,
  Company,
  Governorate,
  Warehouse,
  BranchType,
} from "../types/crm";
import { citiesOf } from "../data/egypt";
import { BranchDetailsModal } from "../components/common/BranchDetailsModal";
import {
  HierarchyControlModal,
  EntityType,
} from "../components/common/HierarchyControlModal";
import {
  Building2,
  Building,
  Warehouse as WarehouseIcon,
  Globe,
  MapPin,
  Plus,
  Eye,
  ChevronLeft,
  Users,
  TrendingUp,
  Layers,
  Briefcase,
} from "lucide-react";

interface BranchesTeamsPageProps {
  onOpenLead?: (leadId: string) => void;
  onAddClientForBranch?: (branchId: string) => void;
}

export const BranchesTeamsPage: React.FC<BranchesTeamsPageProps> = ({
  onOpenLead,
  onAddClientForBranch,
}) => {
  const {
    effectiveUser,
    branches,
    companies,
    governorates,
    warehouses,
    addBranch,
    addCompany,
    addWarehouse,
    license,
  } = useCRM();
  const quota = { ...branchQuota(branches, license), full: branchQuota(branches, license).full && effectiveUser.role !== "admin" };
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<
    "governorates" | "companies" | "main_hq" | "showrooms" | "warehouses"
  >("governorates");

  // Hierarchy drill-down state
  const [hierarchyType, setHierarchyType] = useState<EntityType | null>(null);
  const [hierarchyData, setHierarchyData] = useState<
    Governorate | Company | Branch | Warehouse | null
  >(null);
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);

  // Single Branch detail modal
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

  // Add Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<
    "branch" | "company" | "governorate" | "warehouse"
  >("branch");

  // Form States
  const [formName, setFormName] = useState("");
  const [formCity, setFormCity] = useState("");
  const [govSearch, setGovSearch] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formGovernorateId, setFormGovernorateId] = useState("");
  const [formWarehouseBranchId, setFormWarehouseBranchId] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formBranchType, setFormBranchType] = useState<BranchType>("showroom");

  const mainHqBranches = branches.filter((b) => b.branchType === "main_hq");
  const showroomBranches = branches.filter(
    (b) => b.branchType !== "main_hq" && b.branchType !== "warehouse",
  );

  const handleOpenHierarchy = (
    type: EntityType,
    data: Governorate | Company | Branch | Warehouse,
  ) => {
    setHierarchyType(type);
    setHierarchyData(data);
    setIsHierarchyModalOpen(true);
  };

  const handleOpenBranchModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsBranchModalOpen(true);
  };

  // Codes are internal: generated, never typed or shown.
  const autoCode = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}`;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageOrganization(effectiveUser)) return;

    if (addType === "branch") {
      if (quota.full) return;
      addBranch({
        name: formName,
        code: autoCode("BR"),
        city: formCity,
        phone: formPhone,
        address: formAddress,
        branchType: formBranchType,
        companyId: formCompanyId || undefined,
        companyName: companies.find((c) => c.id === formCompanyId)?.name,
        governorateId: formGovernorateId,
        governorateName: governorates.find((g) => g.id === formGovernorateId)
          ?.name,
        active: true,
      });
    } else if (addType === "company") {
      addCompany({
        name: formName,
        code: autoCode("X"),
        description: formAddress,
        phone: formPhone,
        active: true,
      });
    } else if (addType === "warehouse") {
      addWarehouse({
        name: formName,
        code: autoCode("X"),
        governorateId: formGovernorateId,
        governorateName: governorates.find((g) => g.id === formGovernorateId)
          ?.name,
        branchId: formWarehouseBranchId || undefined,
        phone: formPhone,
        address: formAddress,
        capacity: formCapacity || "غير محددة",
        active: true,
      });
    }

    setFormName("");
    setFormCity("");
    setFormPhone("");
    setFormAddress("");
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="page-heading">
        <div>
          <span className="eyebrow">إدارة المؤسسة</span>
          <h1>الهيكل الإداري</h1>
          <p>المحافظات والشركات والفروع والمعارض والمخازن، وكل فرع بتفاصيله.</p>
        </div>
        {canManageOrganization(effectiveUser) && (
          <button
            className="btn-primary"
            disabled={quota.full}
            title={quota.full ? branchLimitMessage(quota) : undefined}
            onClick={() => {
              setAddType("branch");
              setShowAddModal(true);
            }}
          >
            <Plus size={16} />
            إضافة فرع أو مقر
          </button>
        )}
      </div>
      <PageGuide id="branches" />

      <p className={`notice${quota.full ? " warning" : ""}`} role="status">
        الباقة الحالية: {quota.max === 2 ? "فرعين" : `${quota.max} فرع`}. مستخدم {quota.used} من {quota.max}.
        {quota.full && " وصلت للحد الأقصى، ولإضافة فرع جديد كلّم المطوّر."}
      </p>

      {/* Top Level Category Filter Selector */}
      <div className="flex glass-card p-2 rounded-2xl shadow-xs overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab("governorates")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === "governorates"
              ? "bg-slate-800 dark:bg-[#1e2636] text-white border border-white/15 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <MapPin className="w-4 h-4 text-[#dc424b]" />
          <span>المحافظات والإقاليم ({governorates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("companies")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === "companies"
              ? "bg-slate-800 dark:bg-[#1e2636] text-white border border-white/15 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Briefcase className="w-4 h-4 text-[#dc424b]" />
          <span>الشركات والمؤسسات ({companies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("main_hq")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === "main_hq"
              ? "bg-slate-800 dark:bg-[#1e2636] text-white border border-white/15 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Building className="w-4 h-4 text-[#dc424b]" />
          <span>الفروع الرئيسية ({mainHqBranches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("showrooms")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === "showrooms"
              ? "bg-slate-800 dark:bg-[#1e2636] text-white border border-white/15 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4 text-[#dc424b]" />
          <span>الفروع والمعارض ({showroomBranches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("warehouses")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === "warehouses"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <WarehouseIcon className="w-4 h-4" />
          <span>المخازن والمستودعات ({warehouses.length})</span>
        </button>
      </div>

      {/* CATEGORY 1: GOVERNORATES */}
      {activeTab === "governorates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#c8232b]" />
              <span>
                محافظات مصر ({governorates.length}) · اضغط على المحافظة لفتح تفاصيلها:
              </span>
            </h3>

          </div>

          <input
            type="search"
            value={govSearch}
            onChange={(e) => setGovSearch(e.target.value)}
            placeholder="ابحث عن محافظة…"
            aria-label="بحث في المحافظات"
            className="w-full sm:w-72 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...governorates]
              .filter((g) => !govSearch.trim() || g.name.includes(govSearch.trim()))
              .sort((a, b) => {
                const n = (g: Governorate) => branches.filter((x) => x.governorateId === g.id).length;
                return n(b) - n(a) || a.name.localeCompare(b.name, "ar");
              })
              .map((gov) => {
              const govBranches = branches.filter((b) => b.governorateId === gov.id);
              const govWarehouses = warehouses.filter(
                (w) => w.governorateId === gov.id,
              );

              return (
                <button
                  key={gov.id}
                  onClick={() => handleOpenHierarchy("governorate", gov)}
                  className="bg-white dark:bg-[#1d1d1c] hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-[#c8232b] shadow-xs hover:shadow-md transition-all text-right dir-ltr:text-left cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-[#c8232b] transition-colors flex items-center gap-1.5">
                        <span>🗺️ {gov.name}</span>
                        <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity dir-ltr:rotate-180" />
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 mt-3">
                      <div>
                        الإقليم: <strong>{gov.region}</strong>
                      </div>
                      <div>
                        المسؤول:{" "}
                        <strong>{gov.managerName || "غير معين"}</strong>
                      </div>
                      <div>
                        عدد الفروع بالقطاع:{" "}
                        <strong className="text-slate-800 dark:text-[#c8232b] font-mono-numbers">
                          {govBranches.length} فرع
                        </strong>
                      </div>
                      <div>
                        المستودعات اللوجستية:{" "}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono-numbers">
                          {govWarehouses.length} مستودع
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-[#c8232b] font-bold">
                    <span>تحكم المحافظة والمخازن والفروع ←</span>
                    <Eye className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY 2: COMPANIES */}
      {activeTab === "companies" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>دليل الشركات والمؤسسات التابعة للقطاع:</span>
            </h3>

            {canManageOrganization(effectiveUser) && (
              <button
                onClick={() => {
                  setAddType("company");
                  setShowAddModal(true);
                }}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold hover:bg-indigo-100 cursor-pointer"
              >
                + إضافة شركة جديدة
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {companies.map((cmp) => {
              const cmpBranches = branches.filter(
                (b) => b.companyId === cmp.id,
              );

              return (
                <button
                  key={cmp.id}
                  onClick={() => handleOpenHierarchy("company", cmp)}
                  className="bg-white dark:bg-slate-900 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-xs hover:shadow-md transition-all text-right dir-ltr:text-left cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                        <span>🏛️ {cmp.name}</span>
                        <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity dir-ltr:rotate-180" />
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {cmp.description}
                    </p>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 mt-3">
                      <div>
                        الرئيس التنفيذي: <strong>{cmp.ceoName}</strong>
                      </div>
                      <div>
                        الهاتف:{" "}
                        <span className="font-mono-numbers">{cmp.phone}</span>
                      </div>
                      <div>
                        الفروع المخصصة:{" "}
                        <strong className="text-indigo-600 font-mono-numbers">
                          {cmpBranches.length} فرع
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    <span>تحكم الشركة الميداني ←</span>
                    <Eye className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY 3: MAIN HQS & SHOWROOMS */}
      {(activeTab === "main_hq" || activeTab === "showrooms") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                {activeTab === "main_hq"
                  ? `الفروع الرئيسية للمقرّات (${mainHqBranches.length})`
                  : `الفروع والمعارض الفرعية (${showroomBranches.length})`}
              </span>
            </h3>

            {canManageOrganization(effectiveUser) && (
              <button
                disabled={quota.full}
                title={quota.full ? branchLimitMessage(quota) : undefined}
                onClick={() => {
                  setAddType("branch");
                  setShowAddModal(true);
                }}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold hover:bg-indigo-100 cursor-pointer"
              >
                + إضافة فرع
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(activeTab === "main_hq" ? mainHqBranches : showroomBranches).map(
              (b) => (
                <button
                  key={b.id}
                  onClick={() => handleOpenBranchModal(b)}
                  className="bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-xs hover:shadow-md transition-all text-right dir-ltr:text-left cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                        <span>{b.name}</span>
                        <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity dir-ltr:rotate-180" />
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 mt-3">
                      <div>
                        {b.city ? (
                          <>
                            المدينة: <strong>{b.city}</strong>
                          </>
                        ) : (
                          <span className="opacity-60">المدينة: غير محددة</span>
                        )}
                      </div>
                      {b.companyName && (
                        <div>
                          الشركة: <strong>{b.companyName}</strong>
                        </div>
                      )}
                      <div>
                        المدير المسؤول:{" "}
                        <strong className="text-indigo-800 dark:text-indigo-300">
                          {b.managerName || "غير محدد"}
                        </strong>
                      </div>
                      <div>
                        الهاتف:{" "}
                        <span className="font-mono-numbers">{b.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    <span>فتح ملف الفرع والمبيعات ←</span>
                    <Eye className="w-4 h-4" />
                  </div>
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {/* CATEGORY 4: WAREHOUSES */}
      {activeTab === "warehouses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <WarehouseIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                المخازن والمستودعات اللوجستية المركزية ({warehouses.length}):
              </span>
            </h3>

            {canManageOrganization(effectiveUser) && (
              <button
                onClick={() => {
                  setAddType("warehouse");
                  setShowAddModal(true);
                }}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold hover:bg-indigo-100 cursor-pointer"
              >
                + إضافة مخزن
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {warehouses.map((wh) => (
              <button
                key={wh.id}
                onClick={() => handleOpenHierarchy("warehouse", wh)}
                className="bg-white dark:bg-slate-900 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-xs hover:shadow-md transition-all text-right dir-ltr:text-left cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                      <span>🏭 {wh.name}</span>
                      <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity dir-ltr:rotate-180" />
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 mt-3">
                    <div>
                      المحافظة التابع لها: <strong>{wh.governorateName}</strong>
                    </div>
                    <div>
                      أمين المخزن:{" "}
                      <strong>{wh.managerName || "غير عين"}</strong>
                    </div>
                    <div>
                      السعة الاستيعابية:{" "}
                      <strong className="text-indigo-600 font-mono-numbers">
                        {wh.capacity}
                      </strong>
                    </div>
                    <div>العنوان: {wh.address}</div>
                  </div>
                </div>

                <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                  <span>تحكم المخزن والمستودع ←</span>
                  <Eye className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Entity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
              إضافة عنصر للهيكل التنظيمي (
              {addType === "branch"
                ? "فرع"
                : addType === "company"
                  ? "شركة"
                  : addType === "governorate"
                    ? "محافظة"
                    : "مخزن"}
              )
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  الاسم *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="أدخل الاسم التفصيلي..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  رقم الهاتف {addType === "company" ? "" : "*"}
                </label>
                <input
                  type="tel"
                  required={addType !== "company"}
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="01000000000"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-mono-numbers"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {addType === "company" ? "الوصف" : "العنوان *"}
                </label>
                <input
                  type="text"
                  required={addType !== "company"}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="التفاصيل..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                />
              </div>

              {addType === "branch" && (
                <>
                  <label className="field">
                    <span>
                      الشركة <em>اختياري</em>
                    </span>
                    <select
                      value={formCompanyId}
                      onChange={(e) => setFormCompanyId(e.target.value)}
                    >
                      <option value="">{companies.some((c) => c.active) ? "بدون شركة" : "لا توجد شركات بعد"}</option>
                      {companies
                        .filter((c) => c.active)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>نوع الفرع</span>
                    <select
                      value={formBranchType}
                      onChange={(e) =>
                        setFormBranchType(e.target.value as BranchType)
                      }
                    >
                      <option value="showroom">معرض</option>
                      <option value="main_hq">مقر رئيسي</option>
                      <option value="store">متجر</option>
                      <option value="warehouse">مخزن</option>
                      <option value="project_site">موقع مشروع</option>
                    </select>
                  </label>
                </>
              )}
              {["branch", "warehouse"].includes(addType) && (
                <>
                  <label className="field">
                    <span>
                      المحافظة <em>مطلوب</em>
                    </span>
                    <select
                      required
                      value={formGovernorateId}
                      onChange={(e) => {
                        setFormGovernorateId(e.target.value);
                        setFormCity("");
                        setFormWarehouseBranchId("");
                      }}
                    >
                      <option value="">اختر المحافظة</option>
                      {governorates
                        .filter((g) => g.active)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  {addType === "branch" && (
                    <label className="field">
                      <span>
                        المدينة <em>اختياري</em>
                      </span>
                      <select
                        value={formCity}
                        disabled={!formGovernorateId}
                        onChange={(e) => setFormCity(e.target.value)}
                      >
                        <option value="">
                          {formGovernorateId ? "بدون تحديد مدينة" : "اختر المحافظة أولًا"}
                        </option>
                        {citiesOf(governorates.find((g) => g.id === formGovernorateId)?.name).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}
              {addType === "warehouse" && (
                <>
                  <label className="field">
                    <span>
                      الفرع المرتبط <em>اختياري</em>
                    </span>
                    <select
                      value={formWarehouseBranchId}
                      onChange={(e) => setFormWarehouseBranchId(e.target.value)}
                    >
                      <option value="">مخزن مشترك للمحافظة</option>
                      {branches
                        .filter(
                          (b) =>
                            b.active && b.governorateId === formGovernorateId,
                        )
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>
                      السعة <em>اختياري</em>
                    </span>
                    <input
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(e.target.value)}
                      placeholder="مثال: ٥٠٠ متر مربع"
                    />
                  </label>
                </>
              )}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xs"
                >
                  حفظ السجل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drill-down Hierarchy Control Modal */}
      <HierarchyControlModal
        entityType={hierarchyType}
        entityData={hierarchyData}
        isOpen={isHierarchyModalOpen}
        onClose={() => setIsHierarchyModalOpen(false)}
        onOpenBranchDetails={handleOpenBranchModal}
        onOpenLead={onOpenLead}
      />

      {/* Single Branch Details Modal */}
      <BranchDetailsModal
        branch={selectedBranch}
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        onOpenLead={onOpenLead}
        onAddClientForBranch={onAddClientForBranch}
      />
    </div>
  );
};
