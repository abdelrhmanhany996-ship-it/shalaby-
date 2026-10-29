import { InstallAppButton } from "../../pwa/PWAControls";
import { ChangePasswordForm } from "../common/ChangePasswordForm";
import { scopeLabel, canAccessPage } from "../../lib/access";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  Search,
  Sun,
  Moon,
  ChevronDown,
  X,
  UserRound,
  ArrowUpLeft,
  LogOut,
  KeyRound,
} from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { useTheme } from "../../context/ThemeContext";
import type { UserRole } from "../../types/crm";
import { roleNames } from "../../lib/presentation";

interface Props {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeView: string;
  onOpenLead: (id: string) => void;
}
const titles: Record<string, string> = {
  permissions: "مصفوفة الصلاحيات",
  developer: "قسم المطورين",
  dashboard: "الرئيسية",
  analytics_dashboard: "نظرة عامة",
  dept_dashboard: "الأقسام والفروع",
  feedback: "التقييمات والشكاوى",
  clients: "العملاء",
  add_client: "عميل جديد",
  visits: "الزيارات والمعاينات",
  record_visit: "زيارة جديدة",
  followups: "المتابعات",
  due_followups: "متابعات اليوم",
  overdue_followups: "المتابعات المتأخرة",
  bookings: "المشتريات",
  invoices: "الفواتير",
  brokers: "الوسطاء والشركاء",
  overview: "كبار العملاء والوسطاء",
  reports: "التقارير",
  users: "الموظفون",
  branches: "الهيكل الإداري",
  teams: "فرق العمل",
  audit: "سجل العمليات",
  targets: "الأهداف",
  quotes: "عروض الأسعار",
  team_sales: "تقرير المبيعات",
  telegram: "جروبات التليجرام",
  sales_statements: "بيان بيع",
  accounts: "الحسابات",
  settings: "الإعدادات",
};
export function Navbar({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  onOpenLead,
}: Props) {
  const {
    effectiveUser,
    currentUser,
    logout,
    setViewAsUser,
    viewAsUser,
    previewUsers: users,
    leads,
    branches,
  } = useCRM();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDetailsElement>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [viewBranch, setViewBranch] = useState("");
  const previewRoles: UserRole[] = ["general_manager", "regional_manager", "branch_manager"];
  const previewRoleLabels: Record<string, string> = {
    general_manager: "صاحب البيزنس",
    regional_manager: "مدير المبيعات العام",
    branch_manager: "مدير مبيعات الفرع",
    supervisor: "مشرف مختص",
    sales_agent: "سيلز بالفرع",
  };
  const viewValue = !viewAsUser ? "me" : viewAsUser.id.startsWith("preview:") ? `role:${viewAsUser.role}` : `user:${viewAsUser.id}`;
  const applyView = (value: string, branchChoice: string) => {
    if (value === "me") setViewAsUser(null);
    else if (value.startsWith("user:")) setViewAsUser(users.find((u) => u.id === value.slice(5)) || null);
    else {
      const role = value.slice(5) as UserRole;
      const needsBranch = !["general_manager", "regional_manager"].includes(role);
      const branch = needsBranch ? branchChoice || branches[0]?.id || "" : "";
      setViewBranch(branch);
      setViewAsUser({
        id: `preview:${role}:${branch}`,
        name: `${previewRoleLabels[role]} (معاينة)`,
        email: "",
        phone: "",
        createdAt: "",
        role,
        branchId: branch || undefined,
        active: true,
        specialty: "sales",
        supervisedBranchIds: role === "supervisor" && branch ? [branch] : undefined,
      });
    }
    if (accountRef.current && value !== "me" && !value.startsWith("role:")) accountRef.current.open = false;
  };
  const matches = query.trim()
    ? leads
        .filter(
          (l) =>
            l.name.includes(query.trim()) || l.phone.includes(query.trim()),
        )
        .slice(0, 5)
    : [];
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setShowResults(false);
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        accountRef.current.open = false;
      }
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (accountRef.current) accountRef.current.open = false;
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <header className="shalaby-header">
      <div className="header-location">
        <button
          className="icon-button mobile-only"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="فتح القائمة"
        >
          <Menu size={21} />
        </button>
        <span className="desktop-only">
          مساحة العمل <span className="breadcrumb-divider">/</span>
        </span>
        <strong>{titles[activeView] || "الرئيسية"}</strong>
      </div>
      <div className="header-tools">
        {canAccessPage(effectiveUser, "clients") && (
          <div className="header-search desktop-only" ref={searchRef}>
            <Search size={17} />
            <input
              aria-label="البحث عن عميل"
              placeholder="ابحث عن عميل أو رقم هاتف"
              value={query}
              onFocus={() => setShowResults(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowResults(false);
                if (e.key === "Enter" && matches.length) {
                  onOpenLead(matches[0].id);
                  setShowResults(false);
                  setQuery("");
                }
              }}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setShowResults(false);
                }}
                aria-label="مسح البحث"
              >
                <X size={15} />
              </button>
            )}
            {showResults && query.trim() && (
              <div className="search-results">
                <small>نتائج البحث</small>
                {matches.length ? (
                  matches.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        onOpenLead(l.id);
                        setQuery("");
                        setShowResults(false);
                      }}
                    >
                      <span>
                        <strong>{l.name}</strong>
                        <small dir="ltr">{l.phone}</small>
                      </span>
                      <ArrowUpLeft size={16} />
                    </button>
                  ))
                ) : (
                  <p>مفيش عميل مطابق للاسم أو الرقم.</p>
                )}
              </div>
            )}
          </div>
        )}
        <InstallAppButton />
        <div className="theme-switch" role="group" aria-label="مظهر الواجهة">
          <button
            aria-label="المظهر الفاتح"
            aria-pressed={theme === "light"}
            onClick={() => setTheme("light")}
          >
            <Sun size={16} />
            <span>فاتح</span>
          </button>
          <button
            aria-label="المظهر الداكن"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme("dark")}
          >
            <Moon size={16} />
            <span>داكن</span>
          </button>
        </div>
        <details className="account-menu" ref={accountRef}>
          <summary aria-label="الحساب ونطاق العمل">
            <span className="avatar">
              {effectiveUser.name.replace(/^م\.\s*/, "").charAt(0)}
            </span>
            <ChevronDown size={13} />
          </summary>
          <div className="account-panel">
            <strong>{effectiveUser.name}</strong>
            <p>{roleNames[effectiveUser.role]}</p>
            {(currentUser.role === "admin" || currentUser.role === "general_manager") && (
              <div className="view-as">
                <label>
                  شوف النظام كـ
                  <select
                    aria-label="شوف النظام كـ"
                    value={viewValue}
                    onChange={(e) => applyView(e.target.value, viewBranch)}
                  >
                    <option value="me">حسابي ({roleNames[currentUser.role]})</option>
                    <optgroup label="دور وظيفي">
                      {previewRoles
                        .filter((r) => currentUser.role === "admin" || r !== "general_manager")
                        .map((r) => (
                          <option key={r} value={`role:${r}`}>
                            {previewRoleLabels[r]}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="موظف بعينه">
                      {users
                        .filter((u) => u.id !== currentUser.id)
                        .map((u) => (
                          <option value={`user:${u.id}`} key={u.id}>
                            {u.name} — {roleNames[u.role]}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </label>
                {viewValue.startsWith("role:") && viewValue !== "role:general_manager" && viewValue !== "role:regional_manager" && (
                  <label>
                    في فرع
                    <select aria-label="الفرع" value={viewBranch} onChange={(e) => applyView(viewValue, e.target.value)}>
                      {branches.length === 0 && <option value="">لا توجد فروع بعد</option>}
                      {branches.map((b) => (
                        <option value={b.id} key={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            <p className="account-note">
              <UserRound size={14} />
              {scopeLabel(effectiveUser)}
            </p>
            <button
              type="button"
              className="password-button"
              onClick={() => {
                setPwdOpen(true);
                if (accountRef.current) accountRef.current.open = false;
              }}
            >
              <KeyRound size={14} />
              تغيير كلمة المرور
            </button>
            <button
              type="button"
              className="logout-button"
              onClick={() => logout()}
            >
              <LogOut size={14} />
              تسجيل الخروج
            </button>
          </div>
        </details>
      </div>
      {pwdOpen && (
        <div
          className="dialog-backdrop"
          style={{ zIndex: 90 }}
          onClick={() => setPwdOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="تغيير كلمة المرور"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
            style={{ width: "min(380px,100%)", background: "#1d1d1c", color: "#dfe2ee", borderRadius: 16, padding: 24 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <strong>تغيير كلمة المرور</strong>
              <button className="icon-button" aria-label="إغلاق" onClick={() => setPwdOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <ChangePasswordForm />
          </div>
        </div>
      )}
    </header>
  );
}
