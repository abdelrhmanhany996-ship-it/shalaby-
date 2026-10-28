import { useCRM } from "../../context/CRMContext";
import { canAccessPage, isSales, worksOwnCustomers } from "../../lib/access";
import { LayoutDashboard, Users, PhoneCall, Plus, Menu } from "lucide-react";
interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSidebarOpen: (open: boolean) => void;
}
export function MobileBottomNav({
  activeTab,
  setActiveTab,
  setSidebarOpen,
}: Props) {
  const { effectiveUser } = useCRM();
  const items = [
    { id: "dashboard", label: "الرئيسية", Icon: LayoutDashboard },
    { id: "clients", label: "العملاء", Icon: Users },
    canAccessPage(effectiveUser, "add_client")
      ? { id: "add_client", label: "إضافة عميل", Icon: Plus }
      : { id: "reports", label: "التقارير", Icon: LayoutDashboard },
    {
      id: "followups",
      label: worksOwnCustomers(effectiveUser) ? "متابعاتي" : "المتابعات",
      Icon: PhoneCall,
    },
  ];
  return (
    <nav className="mobile-nav" aria-label="التنقل السريع">
      {items
        .filter((item) => canAccessPage(effectiveUser, item.id))
        .map(({ id, label, Icon }) => (
          <button
            key={id}
            className={id === "add_client" ? "mobile-add" : ""}
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      <button onClick={() => setSidebarOpen(true)}>
        <Menu size={21} />
        <span>المزيد</span>
      </button>
    </nav>
  );
}
