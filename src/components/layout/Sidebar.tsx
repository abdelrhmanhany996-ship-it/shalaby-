import { hasPermission } from "../../lib/permissions";
import { canAccessPage, worksOwnCustomers } from "../../lib/access";
import { useEffect } from "react";
import {
  Users,
  PhoneCall,
  Code2,
  Settings,
  X,
  LayoutDashboard,
  ChevronDown,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { ShalabyLogo } from "../common/ShalabyLogo";
import { followUpStatus } from "../../lib/presentation";

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
  const { effectiveUser, followUps } = useCRM();
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
            worksOwnCustomers(effectiveUser) ? "متابعاتي" : "المتابعات",
            PhoneCall,
            count,
          )}
          {nav("targets", hasPermission(effectiveUser, "targets.view") ? "الأهداف والأداء" : "هدفي", Target)}
          {["users", "audit", "permissions", "developer"].some((page) => canAccessPage(effectiveUser, page)) && (
            <details className="nav-management" open={["users", "audit", "permissions", "developer"].includes(activeTab) || undefined}>
              <summary>
                الإدارة
                <ChevronDown size={15} />
              </summary>
              {nav("users", "الموظفون", Users)}
              {nav("audit", "سجل العمليات", ShieldCheck)}
              {nav("permissions", "مصفوفة الصلاحيات", ShieldCheck)}
              {nav("developer", "قسم المطورين", Code2)}
            </details>
          )}
        </nav>
        <div className="sidebar-bottom">
          {nav("settings", "الإعدادات", Settings)}
          <p>
            شلبي <span>·</span> العملاء والمتابعات والأهداف
          </p>
        </div>
      </aside>
    </>
  );
}
