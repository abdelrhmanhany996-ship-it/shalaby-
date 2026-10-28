import { canAccessPage, scopeLabel, isSales, worksOwnCustomers } from "../../lib/access";
import { useEffect } from "react";
import {
  Users,
  Building2,
  PhoneCall,
  ShoppingBag,
  BarChart3,
  Award,
  Code2,
  Settings,
  Compass,
  FileText,
  UserRound,
  X,
  LayoutDashboard,
  ChevronDown,
  ArrowUpLeft,
  Network,
  ShieldCheck,
  MessageSquareWarning,
} from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { ShalabyLogo } from "../common/ShalabyLogo";
import { followUpStatus, isManagement } from "../../lib/presentation";
import { complaintState, isComplaint, reviewPhase } from "../../lib/reviews";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}
export function Sidebar({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
}: Props) {
  const { effectiveUser, followUps, branches, leads, reviewRequests, reviewNotes } = useCRM();
  // Managers see open complaints; salespeople see reviews that need their 48-hour nudge.
  const manager = ["admin", "general_manager", "regional_manager", "branch_manager"].includes(effectiveUser.role);
  const feedbackCount = reviewRequests.filter((r) =>
    manager ? isComplaint(r) && complaintState(r, reviewNotes) === "open" : reviewPhase(r) === "reminder_due",
  ).length;
  const count = followUps.filter((f) =>
    ["due", "overdue"].includes(followUpStatus(f)),
  ).length;
  useEffect(() => {
    if (!sidebarOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [sidebarOpen, setSidebarOpen]);
  const go = (id: string) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };
  const nav = (
    id: string,
    label: string,
    Icon: typeof Users,
    badge?: number,
  ) =>
    canAccessPage(effectiveUser, id) ? (
      <button
        key={id}
        aria-label={label}
        onClick={() => go(id)}
        aria-current={
          activeTab === id ||
          (id === "followups" && activeTab.endsWith("_followups"))
            ? "page"
            : undefined
        }
        className="side-link"
      >
        <Icon size={19} strokeWidth={1.6} />
        <span>{label}</span>
        {!!badge && <span className="nav-count">{badge}</span>}
      </button>
    ) : null;
  return (
    <>
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="إغلاق القائمة"
        />
      )}
      <aside
        className={`shalaby-sidebar ${sidebarOpen ? "is-open" : ""}`}
        aria-label="القائمة الرئيسية"
      >
        <div className="sidebar-brand">
          <ShalabyLogo size="lg" />
          <button
            className="icon-button mobile-only"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="brand-dot" />
          مساحة العمل
        </div>
        <nav>
          <p className="nav-group-label">العمل اليومي</p>
          {nav("dashboard", "الرئيسية", LayoutDashboard)}
          {nav("clients", "العملاء", Users)}
          {nav(
            "followups",
            worksOwnCustomers(effectiveUser) ? "متابعاتي" : "متابعة أداء الموظفين",
            PhoneCall,
            count,
          )}
          {nav("visits", "الزيارات", Compass)}
          {nav("feedback", "التقييمات والشكاوى", MessageSquareWarning, feedbackCount)}
          <p className="nav-group-label">المبيعات</p>
          {nav("bookings", "المشتريات", ShoppingBag)}
          {nav("overview", "كبار العملاء والوسطاء", Award)}
          {nav("brokers", "الوسطاء والشركاء", UserRound)}
          {nav(
            "reports",
            isManagement(effectiveUser) ? "التقارير" : "أدائي",
            BarChart3,
          )}
          {[
            "users",
            "branches",
            "audit",
            "dept_dashboard",
            "permissions",
            "developer",
          ].some((page) => canAccessPage(effectiveUser, page)) && (
            <details
              className="nav-management"
              open={
                [
                  "users",
                  "branches",
                  "audit",
                  "dept_dashboard",
                  "permissions",
                  "developer",
                ].includes(activeTab) || undefined
              }
            >
              <summary>
                إدارة المؤسسة
                <ChevronDown size={15} />
              </summary>
              {nav("users", "الموظفون", Users)}
              {nav("branches", "الهيكل الإداري", Network)}
              {nav("dept_dashboard", "الأقسام والفروع", Building2)}
              {nav("audit", "سجل العمليات", ShieldCheck)}
              {nav("permissions", "مصفوفة الصلاحيات", ShieldCheck)}
              {nav("developer", "قسم المطورين", Code2)}
            </details>
          )}
        </nav>
        <div className="sidebar-bottom">
          {nav("settings", "الإعدادات", Settings)}
          <div className="branch-caption">
            <Building2 size={17} />
            <div>
              <small>نطاق العمل</small>
              <span>{scopeLabel(effectiveUser)}</span>
            </div>
            <ArrowUpLeft size={15} />
          </div>
          <p>
            شلبي <span>·</span> تفاصيل وجودة تليق بذوقك
          </p>
        </div>
      </aside>
    </>
  );
}
