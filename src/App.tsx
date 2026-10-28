import { PWAProvider } from "./pwa/PWAContext";
import { PWAStatus } from "./pwa/PWAControls";
import { canAccessPage } from "./lib/access";
import React, { Suspense, lazy, useState } from "react";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CRMProvider, useCRM } from "./context/CRMContext";
import { useMaintenance } from "./lib/maintenance";
import {
  LoginPage,
  LoadingScreen,
  BlockedScreen,
  MaintenanceScreen,
  MustChangePasswordScreen,
} from "./pages/LoginPage";
import { ViewAsBar } from "./components/layout/ViewAsBar";
import { DemoBanner } from "./components/layout/DemoBanner";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar } from "./components/layout/Sidebar";
import { MobileBottomNav } from "./components/layout/MobileBottomNav";
import {
  LeadDetailsModal,
  LeadQuickAction,
} from "./components/common/LeadDetailsModal";

import { DashboardPage } from "./pages/DashboardPage";
import { LeadsPage } from "./pages/LeadsPage";
import { AddLeadPage } from "./pages/AddLeadPage";
import { VisitsPage } from "./pages/VisitsPage";
import { FollowUpsPage } from "./pages/FollowUpsPage";
import { BookingsPage } from "./pages/BookingsPage";
import { ReviewWatcher } from "./components/reviews/ReviewWatcher";
import { LateComplaintsBanner } from "./components/reviews/LateComplaintsBanner";
import { ZakiChat } from "./components/zaki/ZakiChat";
import { SaveErrorToast } from "./components/common/SaveErrorToast";
import { useStackTables } from "./components/common/useStackTables";
import { Lead } from "./types/crm";

// Pages most people open rarely are downloaded on first visit, keeping the first load small.
const PermissionsPage = lazy(() => import("./pages/PermissionsPage").then((m) => ({ default: m.PermissionsPage })));
const DepartmentDashboardPage = lazy(() => import("./pages/DepartmentDashboardPage").then((m) => ({ default: m.DepartmentDashboardPage })));
const StaffUsersPage = lazy(() => import("./pages/StaffUsersPage").then((m) => ({ default: m.StaffUsersPage })));
const BranchesTeamsPage = lazy(() => import("./pages/BranchesTeamsPage").then((m) => ({ default: m.BranchesTeamsPage })));
const TeamsPage = lazy(() => import("./pages/TeamsPage").then((m) => ({ default: m.TeamsPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage").then((m) => ({ default: m.AuditLogPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const BrokersPage = lazy(() => import("./pages/BrokersPage").then((m) => ({ default: m.BrokersPage })));
const OverviewPage = lazy(() => import("./pages/OverviewPage").then((m) => ({ default: m.OverviewPage })));
const DeveloperPage = lazy(() => import("./pages/DeveloperPage").then((m) => ({ default: m.DeveloperPage })));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage").then((m) => ({ default: m.FeedbackPage })));

const AppContent: React.FC = () => {
  const { leads, effectiveUser } = useCRM();

  const [requestedTab, setRequestedTab] = useState("dashboard");
  const activeTab = canAccessPage(effectiveUser, requestedTab)
    ? requestedTab
    : "dashboard";
  const setActiveTab = (tab: string) =>
    setRequestedTab(canAccessPage(effectiveUser, tab) ? tab : "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useStackTables();

  // Selected lead modal state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadModalAction, setLeadModalAction] =
    useState<LeadQuickAction | null>(null);

  const handleOpenLead = (leadId: string, action?: LeadQuickAction) => {
    if (!leads.some((l) => l.id === leadId)) return;
    setSelectedLeadId(leadId);
    setLeadModalAction(action ?? null);
    setIsLeadModalOpen(true);
  };

  const handleOpenExistingLead = (lead: Lead, action?: LeadQuickAction) => {
    if (!leads.some((l) => l.id === lead.id)) return;
    setSelectedLeadId(lead.id);
    setLeadModalAction(action ?? null);
    setIsLeadModalOpen(true);
  };

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || null;

  return (
    <div className="shalaby-app">
      <a className="skip-link" href="#main-content">
        انتقل للمحتوى
      </a>
      {/* Executive Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Layout Area with Dynamic Right Padding for Collapsed/Expanded Sidebar */}
      <div className="workspace-content">
        {/* View As Notice Bar */}
        <ViewAsBar />

        {/* Executive Sticky Top Navigation */}
        <Navbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeView={activeTab}
          onOpenLead={handleOpenLead}
        />

        {/* Viewport Content Area */}
        <main id="main-content" className="workspace-main">
          {activeTab !== "settings" && <DemoBanner onOpenSettings={() => setActiveTab("settings")} />}
          {activeTab !== "feedback" && <LateComplaintsBanner onOpen={() => setActiveTab("feedback")} />}
          <div key={activeTab} className="animate-page-enter min-w-0">
            <Suspense fallback={<div className="quiet-note" style={{ padding: 30 }}>جاري التحميل…</div>}>
            {activeTab === "dept_dashboard" && (
              <DepartmentDashboardPage
                setActiveTab={setActiveTab}
                onOpenLead={handleOpenLead}
              />
            )}

            {(activeTab === "analytics_dashboard" ||
              activeTab === "dashboard") && (
              <DashboardPage
                setActiveTab={setActiveTab}
                onOpenLead={handleOpenLead}
              />
            )}

            {activeTab === "clients" && (
              <LeadsPage
                onOpenLead={handleOpenLead}
                onNavigateAddLead={() => setActiveTab("add_client")}
              />
            )}

            {activeTab === "add_client" && (
              <AddLeadPage
                onSuccessNavigate={() => setActiveTab("clients")}
                onOpenExistingLead={handleOpenExistingLead}
              />
            )}

            {(activeTab === "visits" || activeTab === "record_visit") && (
              <VisitsPage onOpenLead={handleOpenLead} />
            )}

            {(activeTab === "followups" ||
              activeTab === "due_followups" ||
              activeTab === "overdue_followups") && (
              <FollowUpsPage
                initialTab={
                  activeTab === "overdue_followups" ? "overdue" : "due"
                }
                onOpenLead={handleOpenLead}
              />
            )}

            {activeTab === "bookings" && (
              <BookingsPage onOpenLead={handleOpenLead} />
            )}

            {activeTab === "brokers" && <BrokersPage />}

            {activeTab === "developer" && canAccessPage(effectiveUser, "developer") && (
              <DeveloperPage />
            )}

            {activeTab === "feedback" && <FeedbackPage onOpenLead={handleOpenLead} />}

            {activeTab === "overview" && (
              <OverviewPage onOpenLead={handleOpenLead} />
            )}

            {activeTab === "users" && <StaffUsersPage />}

            {activeTab === "branches" && (
              <BranchesTeamsPage
                onOpenLead={handleOpenLead}
                onAddClientForBranch={() => setActiveTab("add_client")}
              />
            )}

            {activeTab === "teams" && <TeamsPage onOpenLead={handleOpenLead} />}

            {activeTab === "reports" && <ReportsPage />}

            {activeTab === "audit" && <AuditLogPage />}

            {activeTab === "settings" && <SettingsPage />}
            {activeTab === "permissions" && <PermissionsPage />}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Touch Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Central Lead Detail & Actions Modal */}
      <LeadDetailsModal
        lead={selectedLead}
        isOpen={isLeadModalOpen}
        initialAction={leadModalAction}
        onOpenLead={(id) => handleOpenLead(id)}
        onClose={() => {
          setIsLeadModalOpen(false);
          setLeadModalAction(null);
        }}
      />
      <SaveErrorToast />
      <ReviewWatcher />
      <ZakiChat />
    </div>
  );
};

function WorkspaceShell() {
  const { effectiveUser } = useCRM();
  return (
    <AppContent
      key={`${effectiveUser.id}:${effectiveUser.role}:${effectiveUser.specialty}:${JSON.stringify(effectiveUser.permissions)}`}
    />
  );
}

const AuthGate: React.FC = () => {
  const { status, profile } = useAuth();
  const maintenance = useMaintenance();
  const [developerLogin, setDeveloperLogin] = useState(false);
  if (status === "loading" || maintenance.loading) return <LoadingScreen />;
  // While the site is closed only the developer gets in; everyone else (signed in or not) sees "under development",
  // and nothing of the system is loaded for them.
  if (maintenance.enabled && !(status === "ready" && profile?.role === "admin")) {
    if (status === "signed_out" && developerLogin) return <LoginPage />;
    return <MaintenanceScreen message={maintenance.message} onDeveloperLogin={status === "signed_out" ? () => setDeveloperLogin(true) : undefined} />;
  }
  if (status === "signed_out") return <LoginPage />;
  if (status === "no_profile" || status === "inactive")
    return <BlockedScreen kind={status} />;
  if (profile?.mustChangePassword) return <MustChangePasswordScreen />;
  return (
    <CRMProvider>
      {maintenance.enabled && (
        <div role="status" className="fixed bottom-3 left-3 z-[100] rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-black shadow-lg">
          وضع «تحت التطوير» شغال: الموظفين مش شايفين السيستم
        </div>
      )}
      <WorkspaceShell />
    </CRMProvider>
  );
};

export default function App() {
  return (
    <PWAProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
      <PWAStatus />
    </PWAProvider>
  );
}
