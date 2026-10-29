import { PageGuide } from "../components/common/PageGuide";
import { RatingBadge } from "../components/reviews/EmployeeRatings";
import { employeeRatings } from "../lib/employeeRating";
import { monthOf, targetId } from "../lib/targets";
import { formatMoney, today } from "../lib/presentation";
import { userLimitMessage, userQuota } from "../lib/license";
import { FilterBar } from "../components/common/FilterBar";
import { authErrorMessage } from "../context/AuthContext";
import { resetStaffPassword } from "../lib/adminClient";
import {
  canManageStaff,
  canEditStaff,
  canManageOrganization,
  assignableRoles,
  grantableOnEdit,
} from "../lib/access";
import {
  positionNames,
  positionRoles,
  isDirector,
  hasPermission,
  isSalesCapable,
  specialties,
  type Specialty,
} from "../lib/permissions";
import React, { useEffect, useMemo, useState } from "react";
import { useCRM } from "../context/CRMContext";
import { useLanguage } from "../context/LanguageContext";
import { UserRole, User } from "../types/crm";
import {
  UserCheck2,
  Plus,
  Search,
  Building2,
  Briefcase,
  Layers,
  Lock,
  Edit2,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  Trash2,
  Copy,
  X,
} from "lucide-react";

export const StaffUsersPage: React.FC = () => {
  const {
    effectiveUser,
    users,
    branches,
    teams,
    companies,
    governorates,
    departmentEntities,
    jobPositions,
    updateJobPosition,
    addUser,
    updateUser,
    toggleUserActive,
    deleteUser,
    createLoginForUser,
    logAudit,
    addDepartmentEntity,
    addJobPosition,
    reviewRequests,
    followUps,
    license,
    employeeTargets,
    targetUsers,
    setEmployeeTarget,
    removeEmployeeTarget,
  } = useCRM();
  const uQuota = { ...userQuota(users, license), full: userQuota(users, license).full && effectiveUser.role !== "admin" };
  const ratings = useMemo(() => employeeRatings(users, reviewRequests, followUps), [users, reviewRequests, followUps]);

  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<
    "employees" | "departments"
  >("employees");

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState<{ password: string; loginId: string | null } | null>(null);
  const [resetError, setResetError] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states for Add/Edit Employee
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState<Specialty>("sales");
  const [supervisedBranchIds, setSupervisedBranchIds] = useState<string[]>([]);
  const [role, setRole] = useState<UserRole>("sales_agent");
  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [governorateId, setGovernorateId] = useState(governorates[0]?.id || "");
  const [formBranchId, setBranchId] = useState(branches[0]?.id || "");
  const branchId = formBranchId;
  const [teamId, setTeamId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [jobPositionId, setJobPositionId] = useState("");
  const [directManagerId, setDirectManagerId] = useState("");
  const [targetMonth, setTargetMonth] = useState(monthOf(today()));
  const [targetAmount, setTargetAmount] = useState("");
  // A new employee gets their target once their record has arrived in the list.
  const [pendingTarget, setPendingTarget] = useState<{ userId: string; month: string; amount: number } | null>(null);


  // Department & Job Position modal state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");

  const [showJobModal, setShowJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobDeptId, setNewJobDeptId] = useState(
    departmentEntities[0]?.id || "",
  );


  const closeReset = () => {
    setResetTarget(null);
    setResetResult(null);
    setResetError("");
  };
  const doReset = async () => {
    if (!resetTarget) return;
    setResetBusy(true);
    setResetError("");
    try {
      const r = await resetStaffPassword(resetTarget.id);
      setResetResult(r);
      logAudit("إعادة تعيين كلمة المرور", "مستخدم", resetTarget.id, `تمت إعادة تعيين كلمة مرور ${resetTarget.name}`);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "تعذر إعادة التعيين");
    } finally {
      setResetBusy(false);
    }
  };

  const openAddEmployeeModal = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setLoginPassword("");
    setPhone("");
    setRole(assignableRoles(effectiveUser)[0] ?? "sales_agent");
    setSpecialty("sales");
    setSupervisedBranchIds([]);
    setCompanyId(companies[0]?.id || "");
    setGovernorateId(branches[0]?.governorateId || "");
    setBranchId(branches[0]?.id || "");
    setTeamId("");
    setDepartmentId("");
    setJobPositionId("");
    setDirectManagerId("");
    setTargetMonth(monthOf(today()));
    setTargetAmount("");
    setShowAddModal(true);
  };

  const openEditEmployeeModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setLoginPassword("");
    setPhone(u.phone);
    setRole(u.role);
    setSpecialty(u.specialty || "sales");
    setSupervisedBranchIds(u.supervisedBranchIds || []);
    setCompanyId(u.companyId || companies[0]?.id || "");
    setGovernorateId(u.governorateId || branches.find((b) => b.id === u.branchId)?.governorateId || "");
    setBranchId(u.branchId || branches[0]?.id || "");
    setTeamId(u.teamId || "");
    setDepartmentId(u.departmentId || "");
    setJobPositionId(u.jobPositionId || "");
    setDirectManagerId(u.directManagerId || "");
    const m = monthOf(today());
    setTargetMonth(m);
    setTargetAmount(String(employeeTargets.find((t) => t.id === targetId(u.id, m))?.amount ?? ""));

    setShowAddModal(true);
  };

  // Monthly target: for people who sell, set by someone allowed to manage targets (never by the person themself, except the owner).
  const canSetTarget =
    hasPermission(effectiveUser, "targets.manage") &&
    isSalesCapable({ role }) &&
    (!editingUser || editingUser.id !== effectiveUser.id || isDirector(effectiveUser));
  const targetFor = (userId: string, month: string) => employeeTargets.find((t) => t.id === targetId(userId, month));

  const saveTarget = (userId: string) => {
    if (!canSetTarget || !targetMonth) return;
    const raw = targetAmount.trim();
    const existing = targetFor(userId, targetMonth);
    try {
      if (raw === "") {
        if (existing) removeEmployeeTarget(userId, targetMonth);
        return;
      }
      const amount = Number(raw);
      if (existing?.amount === amount) return;
      setEmployeeTarget(userId, targetMonth, amount);
    } catch (err) {
      alert(`تم حفظ الموظف لكن تعذر حفظ الهدف: ${err instanceof Error ? err.message : "خطأ غير معروف"}`);
    }
  };

  useEffect(() => {
    if (!pendingTarget || !targetUsers.some((u) => u.id === pendingTarget.userId)) return;
    try {
      setEmployeeTarget(pendingTarget.userId, pendingTarget.month, pendingTarget.amount);
    } catch (err) {
      alert(`تم إنشاء الموظف لكن تعذر حفظ الهدف: ${err instanceof Error ? err.message : "خطأ غير معروف"}`);
    }
    setPendingTarget(null);
  }, [pendingTarget, targetUsers, setEmployeeTarget]);

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // The owner and the general sales manager work across branches, so they are not placed in one.
    const crossBranch = ["admin", "general_manager", "regional_manager"].includes(role);
    const branchId = crossBranch ? "" : formBranchId;
    const companyObj = companies.find((c) => c.id === companyId);
    const govObj = governorates.find((g) => g.id === (branches.find((b) => b.id === branchId)?.governorateId || governorateId));
    const branchObj = branches.find((b) => b.id === branchId);
    const teamObj = teams.find((t) => t.id === teamId);
    const deptObj = departmentEntities.find((d) => d.id === departmentId);
    const posObj = jobPositions.find((p) => p.id === jobPositionId);
    const managerObj = users.find((u) => u.id === directManagerId);

    let loginTargetId: string | null = null;

    if (editingUser) {
      loginTargetId = editingUser.authUid ? null : editingUser.id;
      updateUser(editingUser.id, {
        name,
        email,
        phone,
        role,
        ...(isDirector(effectiveUser)
          ? {
              specialty: role === "supervisor" ? specialty : undefined,
              supervisedBranchIds:
                role === "supervisor"
                  ? supervisedBranchIds
                  : role === "regional_manager"
                    ? [] // the general sales manager covers every branch: no list to go stale
                    : undefined,
            }
          : {}),
        companyId,
        companyName: companyObj?.name,
        governorateId,
        governorateName: govObj?.name,
        branchId,
        branchName: branchObj?.name,
        teamId,
        teamName: teamObj?.name,
        departmentId,
        departmentName: deptObj?.name,
        jobPositionId,
        jobPositionTitle: posObj?.title,
        directManagerId,
        directManagerName: managerObj?.name,
      });
      saveTarget(editingUser.id);

    } else {
      const newUser = addUser({
        name,
        email,
        phone,
        role,
        ...(isDirector(effectiveUser)
          ? {
              specialty: role === "supervisor" ? specialty : undefined,
              supervisedBranchIds:
                role === "supervisor"
                  ? supervisedBranchIds
                  : role === "regional_manager"
                    ? [] // the general sales manager covers every branch: no list to go stale
                    : undefined,
            }
          : {}),
        companyId,
        companyName: companyObj?.name,
        governorateId,
        governorateName: govObj?.name,
        branchId,
        branchName: branchObj?.name,
        teamId,
        teamName: teamObj?.name,
        departmentId,
        departmentName: deptObj?.name,
        jobPositionId,
        jobPositionTitle: posObj?.title,
        directManagerId,
        directManagerName: managerObj?.name,
        active: true,
      });
      loginTargetId = newUser.id;
      const amount = Number(targetAmount.trim());
      if (canSetTarget && targetAmount.trim() !== "" && amount > 0 && branchId) setPendingTarget({ userId: newUser.id, month: targetMonth, amount });

    }

    if (loginPassword && loginTargetId) {
      try {
        await createLoginForUser(loginTargetId, phone, loginPassword, {
          name,
          role,
          branchId: branchId || undefined,
        });
      } catch (err) {
        alert(
          `تم حفظ الموظف لكن تعذر إنشاء حساب الدخول: ${authErrorMessage(err)}`,
        );
      }
    }

    setShowAddModal(false);
  };

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;
    addDepartmentEntity({
      name: newDeptName,
      code: `DEPT-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      description: newDeptDesc,
      active: true,
    });
    setNewDeptName("");
    setNewDeptCode("");
    setNewDeptDesc("");
    setShowDeptModal(false);
  };

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    const deptId = newJobDeptId || departmentEntities[0]?.id || "";
    if (!newJobTitle || !deptId) return;
    const deptObj = departmentEntities.find((d) => d.id === deptId);
    const created = addJobPosition({
      title: newJobTitle,
      departmentId: deptId,
      departmentName: deptObj?.name,
      active: true,
    });
    setNewJobTitle("");
    setShowJobModal(false);
    if (showAddModal || editingUser) {
      setDepartmentId(deptId);
      setJobPositionId(created.id);
    }
  };

  const filteredUsers = users.filter((u) => {
    // RBAC scoping
    if (
      effectiveUser.role === "branch_manager" &&
      u.branchId !== effectiveUser.branchId
    ) {
      return false;
    }

    if (selectedBranchFilter && u.branchId !== selectedBranchFilter)
      return false;
    // Developer accounts are not company staff: they stay out of the list and the counts unless picked on purpose.
    if (u.role === "admin" && selectedRoleFilter !== "admin") return false;
    if (selectedRoleFilter && u.role !== selectedRoleFilter) return false;
    if (selectedDeptFilter && u.departmentId !== selectedDeptFilter)
      return false;
    if (statusFilter === "active" && !u.active) return false;
    if (statusFilter === "inactive" && u.active) return false;

    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);

    return matchesSearch;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
      <div className="page-heading">
        <div>
          <span className="eyebrow">فريق العمل</span>
          <h1>الموظفون</h1>
          <p>{assignableRoles(effectiveUser).length ? "إضافة الموظفين وتحديد أدوارهم وفروعهم وأقسامهم ومسمياتهم الوظيفية." : "تعديل بيانات الموظفين وإعادة تعيين كلمات المرور وإيقاف الحسابات."}</p>
          {canManageStaff(effectiveUser) && (
            <p className="table-secondary">
              الباقة: مستخدم {uQuota.used} من {uQuota.max}
              {uQuota.full && ". وصلت للحد الأقصى، للتوسعة كلّم المطوّر."}
            </p>
          )}
        </div>
        {assignableRoles(effectiveUser).length > 0 && (
          <button
            className="btn-primary"
            onClick={openAddEmployeeModal}
            disabled={uQuota.full}
            title={uQuota.full ? userLimitMessage(uQuota) : undefined}
          >
            <Plus size={16} />
            إضافة موظف
          </button>
        )}
      </div>
      <PageGuide id="staff" />

      {/* Tabs Navigation */}
      <div className="tab-filter" role="group" aria-label="الموظفون والأقسام" style={{ marginBottom: 12 }}>
        <button aria-pressed={activeTab === "employees"} onClick={() => setActiveTab("employees")}>
          سجل الموظفين ({filteredUsers.length})
        </button>
        <button aria-pressed={activeTab === "departments"} onClick={() => setActiveTab("departments")}>
          الأقسام والمسميات ({departmentEntities.length})
        </button>
      </div>

      {/* TAB 1: EMPLOYEES LIST */}
      {activeTab === "employees" && (
        <div className="space-y-4">
          <section className="panel">
            <FilterBar
              search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "بحث بالاسم أو البريد أو الهاتف…" }}
              selects={[
                { id: "branch", label: "الفرع", value: selectedBranchFilter, onChange: setSelectedBranchFilter, all: "", allLabel: "كل الفروع", primary: true, options: branches.map((b) => ({ value: b.id, label: b.name })) },
                { id: "role", label: "الدور الوظيفي", value: selectedRoleFilter, onChange: setSelectedRoleFilter, all: "", allLabel: "كل الأدوار", primary: true, options: positionRoles.map((r) => ({ value: r, label: positionNames[r] })) },
                { id: "dept", label: "القسم", value: selectedDeptFilter, onChange: setSelectedDeptFilter, all: "", allLabel: "كل الأقسام", options: departmentEntities.map((d) => ({ value: d.id, label: d.name })) },
                { id: "status", label: "الحالة", value: statusFilter, onChange: (v) => setStatusFilter(v as "all" | "active" | "inactive"), allLabel: "كل الحالات", options: [{ value: "active", label: "مفعل فقط" }, { value: "inactive", label: "معطل فقط" }] },
              ]}
              count={{ shown: filteredUsers.length, noun: "موظف" }}
              onReset={() => {
                setSearchQuery("");
                setSelectedBranchFilter("");
                setSelectedRoleFilter("");
                setSelectedDeptFilter("");
                setStatusFilter("all");
              }}
            />
          </section>

          {/* Employee Table */}
          <div className="glass-card rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right dir-ltr:text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">اسم الموظف</th>
                    <th className="p-3.5">الدور الوظيفي</th>
                    <th className="p-3.5">القسم والوظيفة</th>
                    <th className="p-3.5">الفرع</th>
                    <th className="p-3.5">المسؤول المباشر</th>
                    <th className="p-3.5">بيانات التواصل</th>
                    <th className="p-3.5">تقييم العملاء</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                            {u.name.slice(0, 2)}
                          </div>
                        )}
                        <span>{u.name}</span>
                      </td>

                      <td className="p-3.5 font-semibold text-indigo-700 dark:text-indigo-400">
                        {positionNames[u.role]}
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {u.departmentName || "—"}
                        {u.jobPositionTitle && (
                          <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                            {u.jobPositionTitle}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {u.branchName || "عام على المستوى الرئيسي"}
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {u.directManagerName || "—"}
                      </td>

                      <td className="p-3.5">
                        <span className="block font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                          {u.email || u.phone}
                        </span>
                        <span className="block font-mono-numbers text-slate-500 text-[11px]">
                          {u.phone}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {["sales_agent", "team_leader"].includes(u.role) ? (
                          <RatingBadge rating={ratings.find((r) => r.userId === u.id)} />
                        ) : (
                          <span className="table-secondary">—</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            u.active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {u.active ? "مفعل" : "معطل"}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEditStaff(effectiveUser, u, branches) && (
                            <button
                              onClick={() => openEditEmployeeModal(u)}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                              title="تعديل بيانات الموظف"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canEditStaff(effectiveUser, u, branches) && u.authUid && (
                            <button
                              onClick={() => setResetTarget(u)}
                              className="p-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors"
                              title="إعادة تعيين كلمة المرور (كلمة عشوائية)"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {effectiveUser.role === "admin" && u.id !== effectiveUser.id && (
                            <button
                              onClick={async () => {
                                if (!window.confirm(`هتمسح ${u.name} نهائيًا: بياناته وحساب دخوله. مش هينفع ترجّعه. متأكد؟`)) return;
                                try {
                                  await deleteUser(u.id);
                                } catch (e) {
                                  window.alert(e instanceof Error ? e.message : "تعذر المسح");
                                }
                              }}
                              className="p-1.5 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
                              title="مسح الموظف نهائيًا (للمطوّر فقط)"
                              aria-label={`مسح ${u.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canEditStaff(effectiveUser, u, branches) && (
                            <button
                              onClick={() => {
                                try {
                                  toggleUserActive(u.id);
                                } catch (e) {
                                  window.alert(e instanceof Error ? e.message : "تعذر التنفيذ");
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                u.active
                                  ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 hover:bg-red-100"
                                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                              }`}
                            >
                              {u.active ? "تعطيل" : "تفعيل"}
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS & JOB POSITIONS */}
      {activeTab === "departments" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Departments Box */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>أقسام المؤسسة الإدارية والتنفيذية</span>
              </h3>
              {canManageOrganization(effectiveUser) && (
                <button
                  onClick={() => setShowDeptModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة قسم</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {departmentEntities.map((d) => (
                <div
                  key={d.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {d.name}
                      </span>
                    </div>
                    {d.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {d.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Job Positions Box */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>المسميات والوظائف المتاحة</span>
              </h3>
              {canManageOrganization(effectiveUser) && (
                <button
                  onClick={() => setShowJobModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مسمى وظيفي</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {jobPositions.length === 0 && (
                <p className="quiet-note">
                  مفيش مسميات وظيفية لسه. اضغط «إضافة مسمى وظيفي» وابدأ بأول مسمى (مثال: مدير مبيعات الفرع، مسؤول مبيعات، مهندس موقع).
                </p>
              )}
              {[...jobPositions]
                .sort((a, b) => (a.departmentName || "").localeCompare(b.departmentName || "", "ar"))
                .map((j) => (
                  <div
                    key={j.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {j.title}
                      </span>
                      <span className="block text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                        القسم: {j.departmentName || "عام"}
                      </span>
                    </div>
                    {canManageOrganization(effectiveUser) && (
                      <button
                        type="button"
                        onClick={() => updateJobPosition(j.id, { active: !j.active })}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 cursor-pointer"
                      >
                        {j.active ? "تعطيل" : "تفعيل"}
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto my-8">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center justify-between">
              <span>
                {editingUser
                  ? `تعديل بيانات الموظف: ${editingUser.name}`
                  : "إنشاء حساب موظف جديد"}
              </span>
              <span className="text-xs font-normal text-slate-400">
                مؤسسة شلبي
              </span>
            </h3>

            <form onSubmit={handleEmployeeSubmit} className="space-y-4 text-xs">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                  1. البيانات الشخصية وحساب الدخول
                </h4>
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    اسم الموظف الثلاثي/الكامل *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      البريد الإلكتروني <span className="font-normal text-slate-400">(اختياري)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                    />
                  </div>

                  {(!editingUser || !editingUser.authUid) && (
                    <div>
                      <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                        كلمة مرور الدخول
                      </label>
                      <input
                        type="password"
                        dir="ltr"
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="8 أحرف على الأقل. اسم الدخول = رقم الموبايل. اتركها فارغة لعدم إنشاء حساب دخول"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      رقم الهاتف التواصل *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-mono-numbers"
                    />
                  </div>
                </div>
              </div>

              {isDirector(effectiveUser) &&
                role === "supervisor" && (
                  <section className="panel" style={{ padding: 16 }}>
                    {role === "supervisor" && (
                      <label className="field">
                        <span>اختصاص المشرف</span>
                        <select
                          aria-label="اختصاص المشرف"
                          value={specialty}
                          onChange={(e) =>
                            setSpecialty(e.target.value as Specialty)
                          }
                        >
                          {Object.entries(specialties).map(([id, label]) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <p>
                      الفروع المشمولـة بالإشراف{" "}
                      (اختر الفروع؛ عند تركها فارغة يكون النطاق هو الفرع المسجل فقط)
                    </p>
                    {branches.map((b) => (
                      <label className="checkbox-line" key={b.id}>
                        <input
                          type="checkbox"
                          checked={supervisedBranchIds.includes(b.id)}
                          onChange={(e) =>
                            setSupervisedBranchIds((prev) =>
                              e.target.checked
                                ? [...prev, b.id]
                                : prev.filter((id) => id !== b.id),
                            )
                          }
                        />
                        {b.name}
                      </label>
                    ))}
                  </section>
                )}
              {/* Role & Org Position */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                  2. الدور
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      الدور الوظيفي والصلاحيات *
                    </label>
                    <select
                      aria-label="المنصب"
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-semibold"
                    >
                      {[...new Set([...(editingUser ? grantableOnEdit(effectiveUser) : assignableRoles(effectiveUser)), ...(editingUser ? [editingUser.role] : [])])].map((r) => (
                        <option key={r} value={r}>
                          {positionNames[r]}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editingUser || branches.length < 2 ? null : ["admin", "general_manager", "regional_manager"].includes(role) ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400 sm:col-span-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                      الدور ده بيشتغل على كل الفروع، فمش محتاج فرع محدد.
                    </p>
                  ) : (
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      الفرع المباشر *
                    </label>
                    <select
                      value={branchId}
                      onChange={(e) => {
                        setBranchId(e.target.value);
                        setTeamId("");
                        setDirectManagerId("");
                        const branch = branches.find(
                          (b) => b.id === e.target.value,
                        );
                        setGovernorateId(branch?.governorateId || "");
                        setCompanyId(branch?.companyId || "");
                      }}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-semibold"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  )}

                </div>
              </div>

              {canSetTarget && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400">3. تارجت الشهر ده</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">قيمة التارجت (ج.م)</label>
                      <input
                        type="number"
                        aria-label="قيمة التارجت"
                        min={0}
                        step={100}
                        inputMode="numeric"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        placeholder="مثال: 50000 — اتركها فارغة لو مفيش هدف"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                      />
                    </div>
                  </div>
                  {editingUser && targetFor(editingUser.id, targetMonth) && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      الهدف الحالي {formatMoney(targetFor(editingUser.id, targetMonth)!.amount)} ج.م · آخر تعديل بواسطة {targetFor(editingUser.id, targetMonth)!.setByName}. التفاصيل والإنجاز في صفحة الأهداف.
                    </p>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {editingUser ? "حفظ التعديلات" : "إنشاء حساب الموظف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {resetTarget && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> إعادة تعيين كلمة المرور
              </h3>
              <button onClick={closeReset} className="p-1 text-slate-500 cursor-pointer" aria-label="إغلاق">
                <X className="w-4 h-4" />
              </button>
            </div>
            {!resetResult ? (
              <>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  هيتولّد لـ <b>{resetTarget.name}</b> كلمة مرور عشوائية جديدة وتظهر لك مرة واحدة بس. الموظف هيطلب منه النظام يختار كلمة خاصة بيه أول ما يدخل،
                  وأي جلسة مفتوحة له هتتقفل.
                </p>
                {resetError && <p className="text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg p-2">{resetError}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={closeReset} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-semibold cursor-pointer">
                    إلغاء
                  </button>
                  <button
                    onClick={doReset}
                    disabled={resetBusy}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl font-bold cursor-pointer"
                  >
                    {resetBusy ? "جاري التوليد…" : "توليد كلمة مرور جديدة"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-300">سلّم البيانات دي للموظف. مش هتظهر تاني.</p>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 space-y-2 font-mono" dir="ltr">
                  <div>
                    <span className="text-slate-400">ID: </span>
                    {resetResult.loginId || resetTarget.phone}
                  </div>
                  <div className="text-lg font-bold tracking-wider">
                    <span className="text-slate-400 text-xs font-normal">Password: </span>
                    {resetResult.password}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => navigator.clipboard?.writeText(`${resetResult.loginId || resetTarget.phone}\n${resetResult.password}`)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> نسخ
                  </button>
                  <button onClick={closeReset} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold cursor-pointer">
                    تم
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD DEPARTMENT */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              إضافة قسم إداري / تنفيذي جديد
            </h3>
            <form onSubmit={handleAddDept} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  اسم القسم *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: قسم التشطيبات والدهانات"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  الوصف والمهام
                </label>
                <textarea
                  rows={2}
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold"
                >
                  إضافة القسم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD JOB POSITION */}
      {showJobModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              إضافة مسمى وظيفي جديد
            </h3>
            <form onSubmit={handleAddJob} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  المسمى الوظيفي *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مهندس استشاري مواقع"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  القسم التابع له *
                </label>
                {departmentEntities.length === 0 && (
                  <p className="quiet-note">لازم تضيف قسم الأول من تبويب «هيكل الأقسام والوظائف».</p>
                )}
                <select
                  value={newJobDeptId || departmentEntities[0]?.id || ""}
                  onChange={(e) => setNewJobDeptId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                >
                  {departmentEntities.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold"
                >
                  إضافة الوظيفة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
