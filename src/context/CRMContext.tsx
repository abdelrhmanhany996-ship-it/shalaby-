import {
  normalizeUser,
  sanitizeMatrix,
  type PermissionMatrix,
} from "../lib/permissions";
import { createWorkspace } from "../lib/workspace";
import { newReviewToken } from "../lib/reviews";
import { REFERRAL_FOLLOWUP_DAYS, isReferralPhone, phoneKey } from "../lib/referrals";
import { scopesFor, seesAll } from "../lib/scopes";
import { defaultLicense, type License } from "../lib/license";
import { asDemo, planDemoRemoval, type DemoWorld, type KnownDemoIds } from "../lib/demoScope";
import { egyptGovernorates, findEgyptGovernorate } from "../data/egypt";
import { today, followUpStatus, statusNames, sourceNames, followUpTypeNames } from "../lib/presentation";
import {
  upcomingPostSale,
  addToDate,
} from "../lib/postSale";
import {
  reasonLabel,
  unknownReasonQuestion,
  unknownReasonFollowUpDays,
} from "../lib/notBought";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { deleteLoginOnServer } from "../lib/adminClient";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import {
  useFirestoreCollection,
  useFirestoreDocument,
} from "../lib/useFirestoreSync";
import {
  User,
  Branch,
  Team,
  Course,
  Lead,
  Visit,
  FollowUp,
  Booking,
  TimelineEvent,
  AuditLog,
  NotBoughtRecord,
  DistributionRule,
  LeadStatus,
  Company,
  Governorate,
  Warehouse,
  DepartmentEntity,
  JobPosition,
  ReviewRequest,
  ReviewNote,
  ReviewAnalysis,
  PurchaseCategory,
  BrokerEntity,
  ReminderDone,
  AiSuggestion,
  PurchaseInvoice,
  NotificationItem,
} from "../types/crm";
import { purchaseCategoryList } from "../lib/purchases";

export interface FollowUpExtra {
  satisfactionRating?: number;
  satisfactionComment?: string;
  referralNote?: string;
}

export interface CRMContextType {
  notBoughtRecords: NotBoughtRecord[];
  reminderDone: ReminderDone[];
  aiSuggestions: AiSuggestion[];
  saveSuggestions: (items: Omit<AiSuggestion, "id" | "createdAt" | "dayKey">[]) => AiSuggestion[];
  decideSuggestion: (
    id: string,
    decision:
      | { accept: true; date: string; reason: string; type: FollowUp["type"]; edited: boolean }
      | { accept: false; reason?: string },
  ) => void;
  markReminderDone: (taskId: string, branchId: string) => void;
  reviewRequests: ReviewRequest[];
  reviewNotes: ReviewNote[];
  requestReview: (input: {
    lead: Lead;
    subjectKind: ReviewRequest["subjectKind"];
    subjectId?: string;
    subjectLabel: string;
  }) => ReviewRequest;
  requestBrokerReview: (input: {
    broker: BrokerEntity;
    branchId: string;
    subjectId?: string;
    subjectLabel: string;
  }) => ReviewRequest;
  markReviewReminderSent: (id: string) => void;
  cancelReviewRequest: (id: string, reason: string) => void;
  addReviewNote: (requestId: string, text: string, kind: ReviewNote["kind"]) => void;
  saveReviewAnalysis: (id: string, ai: ReviewAnalysis) => void;
  currentUser: User;
  logout: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearOrganizationData: () => Promise<void>;
  removeDemoData: () => Promise<void>;
  /** Registers someone a customer recommended; returns the existing customer when the number is already known. */
  addReferralLead: (input: { fromLeadId: string; name: string; phone: string; reviewId?: string; followUpId?: string }) => { lead: Lead; created: boolean };
  previewDemoRemoval: () => Promise<{ total: number; realLinked: number }>;
  /** How much flagged sample data is loaded right now. */
  demoSummary: { customers: number; branches: number; staff: number; brokers: number; any: boolean };
  createLoginForUser: (
    userId: string,
    loginId: string,
    password: string,
    info: { name: string; role: User["role"]; branchId?: string },
  ) => Promise<void>;
  viewAsUser: User | null;
  setViewAsUser: (user: User | null) => void;
  effectiveUser: User;
  permissionMatrix: PermissionMatrix;
  updatePermissionMatrix: (matrix: PermissionMatrix) => void;

  users: User[];
  companies: Company[];
  governorates: Governorate[];
  warehouses: Warehouse[];
  branches: Branch[];
  teams: Team[];
  courses: Course[];
  leads: Lead[];
  visits: Visit[];
  followUps: FollowUp[];
  bookings: Booking[];
  timelineEvents: TimelineEvent[];
  auditLogs: AuditLog[];
  distributionRule: DistributionRule;
  /** The plan the company is on (how many branches it may have). Only the developer changes it. */
  license: License;
  setLicense: (l: License) => void;
  departmentEntities: DepartmentEntity[];
  jobPositions: JobPosition[];
  purchaseCategories: PurchaseCategory[];
  brokers: BrokerEntity[];
  purchaseInvoices: PurchaseInvoice[];
  notifications: NotificationItem[];

  // Purchase Categories & Invoices
  addPurchaseCategory: (cat: Omit<PurchaseCategory, "id">) => PurchaseCategory;
  updatePurchaseCategory: (
    id: string,
    updates: Partial<PurchaseCategory>,
  ) => void;
  addBroker: (
    broker: Omit<BrokerEntity, "id" | "totalReferrals" | "totalVolume">,
  ) => BrokerEntity;
  updateBroker: (id: string, updates: Partial<BrokerEntity>) => void;
  addPurchaseInvoice: (
    inv: Omit<PurchaseInvoice, "id" | "createdAt" | "invoiceNumber">,
  ) => PurchaseInvoice;
  updatePurchaseInvoiceStatus: (
    id: string,
    status: PurchaseInvoice["status"],
  ) => void;

  // Notifications
  addNotification: (
    notif: Omit<NotificationItem, "id" | "createdAt" | "read">,
  ) => NotificationItem;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Organizational CRUD
  addCompany: (cmp: Omit<Company, "id">) => Company;
  addGovernorate: (gov: Omit<Governorate, "id">) => Governorate;
  addWarehouse: (wh: Omit<Warehouse, "id">) => Warehouse;
  addDepartmentEntity: (dept: Omit<DepartmentEntity, "id">) => DepartmentEntity;
  updateDepartmentEntity: (
    id: string,
    updates: Partial<DepartmentEntity>,
  ) => void;
  addJobPosition: (pos: Omit<JobPosition, "id">) => JobPosition;
  updateJobPosition: (id: string, updates: Partial<JobPosition>) => void;

  // Duplicate Check
  findDuplicateLeadsByPhone: (phone: string, excludeId?: string) => Lead[];

  // Lead CRUD & Operations
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => Lead;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  reassignLead: (
    leadId: string,
    newAgentId: string,
    newBranchId?: string,
    newTeamId?: string,
  ) => void;
  deleteLead: (id: string) => void;

  // Visit Operations
  addVisit: (visit: Omit<Visit, "id">) => Visit;

  // FollowUp Operations
  addFollowUp: (followUp: Omit<FollowUp, "id" | "status">) => FollowUp;
  updateFollowUpResult: (
    id: string,
    status: "completed" | "cancelled",
    result: string,
    nextFollowUpDate?: string,
    extra?: FollowUpExtra,
  ) => void;

  // Booking Operations
  addBooking: (booking: Omit<Booking, "id" | "createdAt">) => Booking;
  addNotBoughtRecord: (
    data: Omit<NotBoughtRecord, "id" | "createdAt" | "agentName">,
  ) => NotBoughtRecord;

  // User & Structure CRUD
  addUser: (user: Omit<User, "id" | "createdAt">) => User;
  updateUser: (id: string, updates: Partial<User>) => void;
  toggleUserActive: (id: string) => void;
  /** Developer only: removes the staff record, its access record and its sign-in account. */
  deleteUser: (id: string) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: string[]) => void;
  addBranch: (branch: Omit<Branch, "id">) => Branch;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  addTeam: (team: Omit<Team, "id">) => Team;
  updateTeam: (id: string, updates: Partial<Team>) => void;

  // Timeline & Audit
  addTimelineEvent: (event: Omit<TimelineEvent, "id" | "timestamp">) => void;
  logAudit: (
    action: string,
    entity: string,
    entityId: string,
    details: string,
  ) => void;

  // Settings & Reset
  updateDistributionRule: (rules: Partial<DistributionRule>) => void;
  resetAllData: () => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const STORAGE_PREFIX = "almasar_crm_v1_";

// Customer data is never copied to the browser's disk: Firestore is the only source of truth and it
// enforces who may read what. These helpers stay so every collection keeps one place to start from.
function loadStorage<T>(_key: string, fallback: T): T {
  return fallback;
}

function saveStorage<T>(_key: string, _value: T) {
  /* intentionally not persisted */
}

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<User[]>(() =>
    loadStorage<User[]>("users", []).map(normalizeUser),
  );
  const [companies, setCompanies] = useState<Company[]>(() =>
    loadStorage<Company[]>("companies", []),
  );
  const [governorates, setGovernorates] = useState<Governorate[]>(() =>
    loadStorage<Governorate[]>("governorates", []),
  );
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() =>
    loadStorage<Warehouse[]>("warehouses", []),
  );
  const [branches, setBranches] = useState<Branch[]>(() =>
    loadStorage<Branch[]>("branches", []),
  );
  const [teams, setTeams] = useState<Team[]>(() =>
    loadStorage<Team[]>("teams", []),
  );
  const [departmentEntities, setDepartmentEntities] = useState<
    DepartmentEntity[]
  >(() => loadStorage<DepartmentEntity[]>("departments", []));
  const [jobPositions, setJobPositions] = useState<JobPosition[]>(() =>
    loadStorage<JobPosition[]>("job_positions", []),
  );
  const [purchaseCategories, setPurchaseCategories] = useState<
    PurchaseCategory[]
  >(() => loadStorage("purchase_categories", purchaseCategoryList.map((c) => ({ ...c, code: c.id.replace("cat-", "").toUpperCase(), active: true }))));
  const [brokers, setBrokers] = useState<BrokerEntity[]>(() =>
    loadStorage("brokers", []),
  );
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(
    () => loadStorage("purchase_invoices", []),
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadStorage("notifications", []),
  );
  const [courses, setCourses] = useState<Course[]>(() =>
    loadStorage<Course[]>("courses", []),
  );
  const [notBoughtRecords, setNotBoughtRecords] = useState<NotBoughtRecord[]>(
    () => loadStorage("not_bought", []),
  );
  useEffect(() => saveStorage("not_bought", notBoughtRecords), [notBoughtRecords]);
  const [reminderDone, setReminderDone] = useState<ReminderDone[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [reviewNotes, setReviewNotes] = useState<ReviewNote[]>([]);
  const [leads, setLeads] = useState<Lead[]>(() =>
    loadStorage("leads", []),
  );
  const [visits, setVisits] = useState<Visit[]>(() =>
    loadStorage("visits", []),
  );
  const [followUps, setFollowUps] = useState<FollowUp[]>(() =>
    loadStorage("followups", []),
  );
  const [bookings, setBookings] = useState<Booking[]>(() =>
    loadStorage("bookings", []),
  );
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(() =>
    loadStorage("timeline", []),
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadStorage("audit", []),
  );
  const [license, setLicense] = useState<License>(defaultLicense);
  const [distributionRule, setDistributionRule] = useState<DistributionRule>(
    () =>
      loadStorage("dist_rule", {
        autoDistribute: true,
        method: "round_robin",
        maxLeadsPerAgentDay: 20,
      }),
  );

  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(
    () => sanitizeMatrix(loadStorage("permission_matrix", null)),
  );
  useEffect(
    () => saveStorage("permission_matrix", permissionMatrix),
    [permissionMatrix],
  );
  const updatePermissionMatrix = (matrix: PermissionMatrix) => {
    setPermissionMatrix(sanitizeMatrix(matrix));
    logAudit(
      "تحديث مصفوفة الصلاحيات",
      "permissions",
      "roles",
      "تم تحديث صلاحيات الوظائف بواسطة صاحب البيزنس",
    );
  };

  // What this person may read. The security rules enforce the same scope on the server.
  const authForScope = useAuth().profile;
  const scope = useMemo(
    () =>
      scopesFor(
        authForScope
          ? { role: authForScope.role, userId: authForScope.userId, branchId: authForScope.branchId, supervisedBranchIds: authForScope.supervisedBranchIds }
          : null,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authForScope?.role, authForScope?.userId, authForScope?.branchId, JSON.stringify(authForScope?.supervisedBranchIds ?? [])],
  );

  // Only top management may write the shared setup (structure, catalogue, settings), so only they seed it.
  const topWriter = !!authForScope && ["admin", "general_manager"].includes(authForScope.role);

  // Firestore is the single source of truth
  useFirestoreCollection("users", users, setUsers, {
    scope: scope.users,
    seedIfEmpty: topWriter,
    transform: normalizeUser,
  });
  useFirestoreCollection("companies", companies, setCompanies, { seedIfEmpty: topWriter });
  useFirestoreCollection("governorates", governorates, setGovernorates, { seedIfEmpty: topWriter });
  useFirestoreCollection("warehouses", warehouses, setWarehouses, { seedIfEmpty: topWriter });
  useFirestoreCollection("branches", branches, setBranches, { seedIfEmpty: topWriter });
  useFirestoreCollection("teams", teams, setTeams, { seedIfEmpty: topWriter });
  useFirestoreCollection("departments", departmentEntities, setDepartmentEntities, { seedIfEmpty: topWriter });
  useFirestoreCollection("jobPositions", jobPositions, setJobPositions, { seedIfEmpty: topWriter });
  useFirestoreCollection("purchaseCategories", purchaseCategories, setPurchaseCategories, { seedIfEmpty: topWriter });
  useFirestoreCollection("brokers", brokers, setBrokers, { scope: scope.brokers });
  useFirestoreCollection("purchaseInvoices", purchaseInvoices, setPurchaseInvoices, { scope: scope.invoices });
  useFirestoreCollection("notifications", notifications, setNotifications, { scope: scope.notifications });
  useFirestoreCollection("leads", leads, setLeads, { scope: scope.leads });
  useFirestoreCollection("notBoughtRecords", notBoughtRecords, setNotBoughtRecords, { scope: scope.notBought });
  useFirestoreCollection("reminderDone", reminderDone, setReminderDone, { scope: scope.reminderDone });
  useFirestoreCollection("aiSuggestions", aiSuggestions, setAiSuggestions, { scope: scope.aiSuggestions });
  useFirestoreCollection("reviewRequests", reviewRequests, setReviewRequests, { scope: scope.reviews });
  useFirestoreCollection("reviewNotes", reviewNotes, setReviewNotes, { scope: scope.reviewNotes });
  useFirestoreCollection("visits", visits, setVisits, { scope: scope.visits });
  useFirestoreCollection("followUps", followUps, setFollowUps, { scope: scope.followUps });
  useFirestoreCollection("bookings", bookings, setBookings, { scope: scope.bookings });
  useFirestoreCollection("timelineEvents", timelineEvents, setTimelineEvents, { scope: scope.timeline });
  useFirestoreCollection("activityLogs", auditLogs, setAuditLogs, { scope: scope.audit });
  useFirestoreDocument(["settings", "license"], license, setLicense, { canWrite: authForScope?.role === "admin" });
  useFirestoreDocument(["settings", "distribution"], distributionRule, setDistributionRule, { canWrite: topWriter });
  useFirestoreDocument(["settings", "permissions"], permissionMatrix, (m) =>
    setPermissionMatrix(sanitizeMatrix(m)),
  { canWrite: topWriter });

  // The signed-in user comes from Firebase Auth; role/branch/active are the
  // server-trusted values from authProfiles, not whatever the users doc says.
  const { profile, logout, createStaffLogin } = useAuth();
  const currentUser = useMemo<User>(() => {
    const p = profile!;
    const record = users.find((u) => u.id === p.userId);
    return normalizeUser({
      id: p.userId,
      name: p.name,
      email: p.email,
      phone: "",
      createdAt: "",
      ...record,
      role: p.role,
      branchId: p.branchId ?? record?.branchId,
      active: p.active,
    });
  }, [profile, users]);

  // Top management gets the full list of Egyptian governorates (idempotent: ids are fixed, existing ones are kept).
  useEffect(() => {
    if (currentUser.role !== "admin" && currentUser.role !== "general_manager") return;
    const missing = egyptGovernorates.filter(
      (e) => !governorates.some((g) => g.id === e.id || findEgyptGovernorate(g.name)?.key === e.key),
    );
    if (!missing.length) return;
    setGovernorates((prev) => [
      ...prev,
      ...missing.map((e) => ({ id: e.id, name: `محافظة ${e.name}`, code: e.key.toUpperCase(), region: e.region, phone: "", active: true })),
    ]);
  }, [currentUser.role, governorates]);

  const profilesBackfilled = useRef(false);
  // One-time backfill, run by top management: older rows get the fields the security rules scope on.
  // Safe to run repeatedly; it only fills what is missing.
  useEffect(() => {
    if (!authForScope || !seesAll({ role: authForScope.role, userId: authForScope.userId, supervisedBranchIds: authForScope.supervisedBranchIds })) return;
    if (!leads.length) return;
    const byLead = new Map(leads.map((l) => [l.id, l]));
    if (timelineEvents.some((e) => !e.branchId && byLead.has(e.leadId)))
      setTimelineEvents((prev) =>
        prev.map((e) => {
          const l = byLead.get(e.leadId);
          return !e.branchId && l ? { ...e, branchId: l.branchId, leadOwnerId: l.assignedAgentId } : e;
        }),
      );
    const byReq = new Map(reviewRequests.map((r) => [r.id, r]));
    if (reviewNotes.some((n) => !n.branchId && byReq.has(n.requestId)))
      setReviewNotes((prev) =>
        prev.map((n) => {
          const r = byReq.get(n.requestId);
          return !n.branchId && r ? { ...n, branchId: r.branchId, agentId: r.agentId } : n;
        }),
      );
    const brokerBranches = new Map<string, Set<string>>();
    const note = (id: string | undefined, branch: string | undefined) => {
      if (!id || !branch) return;
      if (!brokerBranches.has(id)) brokerBranches.set(id, new Set());
      brokerBranches.get(id)!.add(branch);
    };
    leads.forEach((l) => note(l.brokerId, l.branchId));
    visits.forEach((v) => note(v.brokerId, v.branchId));
    purchaseInvoices.forEach((i) => note(i.brokerId, i.branchId));
    if (brokers.some((b) => [...(brokerBranches.get(b.id) || [])].some((x) => !(b.branchIds || []).includes(x))))
      setBrokers((prev) =>
        prev.map((b) => {
          const want = [...new Set([...(b.branchIds || []), ...(brokerBranches.get(b.id) || [])])];
          return want.length !== (b.branchIds || []).length ? { ...b, branchIds: want } : b;
        }),
      );
    // Supervisors' branch lists must be on their server-trusted profile for the rules to see them.
    if (!profilesBackfilled.current && users.length) {
      profilesBackfilled.current = true;
      users.forEach((u) => {
        if (u.authUid && u.supervisedBranchIds?.length)
          updateDoc(doc(db, "authProfiles", u.authUid), { supervisedBranchIds: u.supervisedBranchIds }).catch(() => {});
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authForScope?.role, leads.length > 0, timelineEvents.length, reviewNotes.length, brokers.length]);

  const [viewAsUser, setViewAsUser] = useState<User | null>(null);

  const effectiveUser = useMemo(() => {
    const selected = viewAsUser || currentUser;
    return users.find((u) => u.id === selected.id) || selected;
  }, [viewAsUser, currentUser, users]);

  // Sync to local storage
  useEffect(() => saveStorage("users", users), [users]);
  useEffect(() => saveStorage("companies", companies), [companies]);
  useEffect(() => saveStorage("governorates", governorates), [governorates]);
  useEffect(() => saveStorage("warehouses", warehouses), [warehouses]);
  useEffect(() => saveStorage("branches", branches), [branches]);
  useEffect(() => saveStorage("teams", teams), [teams]);
  useEffect(
    () => saveStorage("departments", departmentEntities),
    [departmentEntities],
  );
  useEffect(() => saveStorage("job_positions", jobPositions), [jobPositions]);
  useEffect(
    () => saveStorage("purchase_categories", purchaseCategories),
    [purchaseCategories],
  );
  useEffect(() => saveStorage("brokers", brokers), [brokers]);
  useEffect(
    () => saveStorage("purchase_invoices", purchaseInvoices),
    [purchaseInvoices],
  );
  useEffect(() => saveStorage("notifications", notifications), [notifications]);
  useEffect(() => saveStorage("courses", courses), [courses]);
  useEffect(() => saveStorage("leads", leads), [leads]);
  useEffect(() => saveStorage("visits", visits), [visits]);
  useEffect(() => saveStorage("followups", followUps), [followUps]);
  useEffect(() => saveStorage("bookings", bookings), [bookings]);
  useEffect(() => saveStorage("timeline", timelineEvents), [timelineEvents]);
  useEffect(() => saveStorage("audit", auditLogs), [auditLogs]);
  useEffect(
    () => saveStorage("dist_rule", distributionRule),
    [distributionRule],
  );

  // Helper Audit
  const logAudit = (
    action: string,
    entity: string,
    entityId: string,
    details: string,
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: effectiveUser.id,
      userName: effectiveUser.name,
      userRole: effectiveUser.role,
      action,
      entity,
      entityId,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Customers created in this render are not in `leads` yet; remember where they belong.
  const justCreated = useRef(new Map<string, { branchId: string; assignedAgentId?: string }>());
  const addTimelineEvent = (event: Omit<TimelineEvent, "id" | "timestamp">) => {
    const lead = leads.find((l) => l.id === event.leadId) || justCreated.current.get(event.leadId);
    const newEv: TimelineEvent = {
      branchId: lead?.branchId,
      leadOwnerId: lead?.assignedAgentId,
      ...event,
      id: `tle-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    setTimelineEvents((prev) => [newEv, ...prev]);
  };

  // ---- Customer reviews ----
  const requestReview: CRMContextType["requestReview"] = ({ lead, subjectKind, subjectId, subjectLabel }) => {
    // The rating belongs to who served the customer: the employee who received that visit, else the customer's own employee.
    const visit = subjectKind === "visit" ? visits.find((v) => v.id === subjectId) : undefined;
    // A salesperson always asks for their own customers, which the security rules require.
    const salesperson = ["sales_agent", "team_leader"].includes(effectiveUser.role);
    const servedBy = salesperson ? effectiveUser : users.find((u) => u.id === visit?.receivedByAgentId) || users.find((u) => u.id === lead.assignedAgentId) || effectiveUser;
    const req: ReviewRequest = {
      id: newReviewToken(),
      leadId: lead.id,
      leadName: lead.name,
      branchId: lead.branchId,
      branchName: lead.branchName,
      agentId: servedBy.id,
      agentName: servedBy.name,
      subjectKind,
      subjectId,
      subjectLabel,
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    setReviewRequests((prev) => [req, ...prev]);
    addTimelineEvent({
      leadId: lead.id,
      authorId: req.agentId,
      authorName: req.agentName || "",
      type: "review_requested",
      title: "تم إرسال طلب تقييم للعميل",
      details: subjectLabel,
    });
    return req;
  };
  // One time: every purchase made before this change counts as delivered on its purchase date, and gets its post-sale
  // follow-ups that are still ahead. Done by the developer's session only, with fixed ids, and marked done in settings.
  const latest = useRef({ bookings, followUps });
  latest.current = { bookings, followUps };
  const backfillStarted = useRef(false);
  useEffect(() => {
    if (authForScope?.role !== "admin" || backfillStarted.current || !bookings.length) return;
    backfillStarted.current = true;
    const timer = window.setTimeout(async () => {
      try {
        const flag = doc(db, "settings", "postSaleBackfill");
        if ((await getDoc(flag)).exists()) return;
        const { bookings: bs, followUps: fs } = latest.current;
        const open = bs.filter((b) => b.bookingStatus !== "cancelled");
        const created = open.flatMap((b) => {
          const have = new Set(fs.filter((f) => f.bookingId === b.id && f.category === "post_sale").map((f) => f.milestone));
          // A purchase that already has its post-sale follow-ups was delivered and scheduled before: leave it alone.
          return have.size ? [] : postSaleFollowUps(b, have);
        });
        setBookings((prev) => prev.map((b) => (b.bookingStatus !== "cancelled" && !b.deliveredAt ? { ...b, bookingStatus: "completed", deliveredAt: b.bookingDate } : b)));
        if (created.length) setFollowUps((prev) => [...created, ...prev]);
        await setDoc(flag, { done: true, at: new Date().toISOString(), purchases: open.length, followUps: created.length });
      } catch (e) {
        console.error("post-sale backfill failed", e);
        backfillStarted.current = false;
      }
    }, 8000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authForScope?.role, bookings.length > 0]);

  const saveSuggestions: CRMContextType["saveSuggestions"] = (items) => {
    const made = items.map((i) => ({ ...i, id: `sug-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), dayKey: today() }));
    setAiSuggestions((prev) => [...made, ...prev]);
    return made;
  };
  /** The salesperson's decision on a suggestion: accepting schedules the follow-up and writes it into the customer's history. */
  const decideSuggestion: CRMContextType["decideSuggestion"] = (id, decision) => {
    const s = aiSuggestions.find((x) => x.id === id);
    if (!s || s.status !== "pending") return;
    const at = new Date().toISOString();
    const who = { decidedAt: at, decidedById: effectiveUser.id, decidedByName: effectiveUser.name };
    if (!decision.accept) {
      setAiSuggestions((prev) => prev.map((x) => (x.id === id ? { ...x, ...who, status: "rejected", rejectReason: decision.reason } : x)));
      logAudit("رفض اقتراح زكي", "اقتراح", id, `${s.name}: ${decision.reason || "من غير سبب"}`);
      return;
    }
    const lead = s.leadId ? leads.find((l) => l.id === s.leadId) : undefined;
    const broker = s.brokerId ? brokers.find((b) => b.id === s.brokerId) : undefined;
    const fu = addFollowUp({
      leadId: s.leadId ?? "",
      brokerId: s.brokerId,
      leadName: s.name,
      leadPhone: lead?.phone ?? broker?.phone ?? "",
      assignedAgentId: s.agentId,
      branchId: s.branchId,
      scheduledAt: decision.date,
      reason: decision.reason,
      type: decision.type,
      notes: s.evidence ? `اقتراح زكي: ${s.evidence}` : "",
      origin: "zaki",
      suggestionId: s.id,
    });
    setAiSuggestions((prev) => prev.map((x) => (x.id === id ? { ...x, ...who, status: "accepted", finalDate: decision.date, finalReason: decision.reason, edited: decision.edited, followUpId: fu.id } : x)));
    if (s.leadId)
      addTimelineEvent({
        leadId: s.leadId,
        authorId: effectiveUser.id,
        authorName: effectiveUser.name,
        type: "followup_created",
        title: `زكي اقترح متابعة، و${effectiveUser.name} وافق وجدولها يوم ${decision.date}`,
        details: `السبب: ${decision.reason}.${s.evidence ? ` اللي اتقال: «${s.evidence}»${s.source ? ` (${s.source})` : ""}.` : ""}${decision.edited ? " السيلز عدّل تفاصيل الاقتراح قبل الجدولة." : ""}`,
      });
    logAudit("قبول اقتراح زكي", "اقتراح", id, `${s.name}: متابعة يوم ${decision.date}`);
  };
  /** A reminder the salesperson says is done: it stays done, and the system will not bring it back. */
  const markReminderDone = (taskId: string, branchId: string) => {
    if (reminderDone.some((r) => r.id === taskId)) return;
    setReminderDone((prev) => [{ id: taskId, branchId, agentId: effectiveUser.id, agentName: effectiveUser.name, doneAt: new Date().toISOString() }, ...prev]);
  };
  /** The same ask for a broker who came on a visit: it is kept with the broker, never on a customer's file. */
  const requestBrokerReview: CRMContextType["requestBrokerReview"] = ({ broker, branchId, subjectId, subjectLabel }) => {
    const visit = visits.find((v) => v.id === subjectId);
    const salesperson = ["sales_agent", "team_leader"].includes(effectiveUser.role);
    const servedBy = salesperson ? effectiveUser : users.find((u) => u.id === visit?.receivedByAgentId) || effectiveUser;
    const req: ReviewRequest = {
      id: newReviewToken(),
      leadId: "",
      leadName: broker.name,
      partyKind: "broker",
      brokerId: broker.id,
      branchId,
      branchName: branches.find((b) => b.id === branchId)?.name,
      agentId: servedBy.id,
      agentName: servedBy.name,
      subjectKind: "visit",
      subjectId,
      subjectLabel,
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    setReviewRequests((prev) => [req, ...prev]);
    logAudit("طلب تقييم من وسيط", "وسيط", broker.id, `${subjectLabel}`);
    return req;
  };
  /**
   * A customer recommended someone: register them as a prospect under the same branch and employee, linked to the
   * customer who recommended them, and schedule the first call. A number we already have is not added twice.
   */
  const addReferralLead: CRMContextType["addReferralLead"] = ({ fromLeadId, name, phone, reviewId, followUpId }) => {
    const from = leads.find((l) => l.id === fromLeadId);
    if (!from) throw new Error("العميل اللي رشّحه مش موجود.");
    const person = name.trim();
    if (!person || !isReferralPhone(phone)) throw new Error("اكتب اسم المرشَّح ورقم هاتف صحيح.");
    const mark = (leadId: string) => {
      if (reviewId) setReviewRequests((prev) => prev.map((r) => (r.id === reviewId ? { ...r, referralLeadId: leadId } : r)));
      if (followUpId) setFollowUps((prev) => prev.map((f) => (f.id === followUpId ? { ...f, referralLeadId: leadId } : f)));
    };
    const existing = leads.find((l) => [l.phone, l.whatsappPhone || ""].some((p) => p && phoneKey(p) === phoneKey(phone)));
    if (existing) {
      addTimelineEvent({
        leadId: from.id,
        authorId: effectiveUser.id,
        authorName: effectiveUser.name,
        type: "note",
        title: `رشّح ${person} (مسجّل عندنا بالفعل)`,
        details: `الرقم ده تبع العميل ${existing.name}.`,
      });
      mark(existing.id);
      return { lead: existing, created: false };
    }
    const agentId = from.assignedAgentId || effectiveUser.id;
    const lead = addLead({
      name: person,
      phone: phone.trim(),
      whatsappPhone: phone.trim(),
      isSameWhatsApp: true,
      source: "referral",
      customerCategory: "individual",
      branchId: from.branchId,
      assignedAgentId: agentId,
      status: "uncontacted",
      classification: "B",
      department: from.department,
      interests: from.interests?.length ? from.interests : [from.department],
      departmentName: from.departmentName,
      notes: `رشّحه العميل ${from.name}`,
      referredByLeadId: from.id,
      referredByName: from.name,
    });
    addFollowUp({
      leadId: lead.id,
      leadName: lead.name,
      leadPhone: lead.phone,
      assignedAgentId: agentId,
      branchId: lead.branchId,
      origin: "auto",
      scheduledAt: addToDate(today(), { days: REFERRAL_FOLLOWUP_DAYS }),
      reason: `كلّم ${lead.name}: رشّحه ${from.name}. افتح الكلام بـ«${from.name} قالنا إنك ممكن تحتاج شغل» وانسق معاه زيارة للفرع.`,
      type: "call",
      notes: "",
    });
    addTimelineEvent({
      leadId: from.id,
      authorId: effectiveUser.id,
      authorName: effectiveUser.name,
      type: "note",
      title: `رشّح عميل جديد: ${person}`,
      details: "اتسجل كعميل محتمل وهيتم التواصل معاه.",
    });
    mark(lead.id);
    return { lead, created: true };
  };
  const patchReview = (id: string, patch: Partial<ReviewRequest>) =>
    setReviewRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const markReviewReminderSent = (id: string) => patchReview(id, { reminderSentAt: new Date().toISOString() });
  const cancelReviewRequest = (id: string, reason: string) =>
    patchReview(id, { status: "cancelled", cancelReason: reason, cancelledAt: new Date().toISOString() });
  const saveReviewAnalysis = (id: string, ai: ReviewAnalysis) => patchReview(id, { ai });
  const addReviewNote = (requestId: string, text: string, kind: ReviewNote["kind"]) => {
    // The signed-in person writes the note (the rules check this), even while previewing another role.
    setReviewNotes((prev) => [
      {
        id: `rvn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        requestId,
        branchId: reviewRequests.find((r) => r.id === requestId)?.branchId,
        agentId: reviewRequests.find((r) => r.id === requestId)?.agentId,
        text,
        kind,
        byId: currentUser.id,
        byName: currentUser.name,
        at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  // Duplicate Check
  const findDuplicateLeadsByPhone = (
    phone: string,
    excludeId?: string,
  ): Lead[] => {
    if (!phone) return [];
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 6) return [];

    return leads.filter((l) => {
      if (excludeId && l.id === excludeId) return false;
      const mainClean = l.phone ? l.phone.replace(/\D/g, "") : "";
      const waClean = l.whatsappPhone ? l.whatsappPhone.replace(/\D/g, "") : "";
      return (
        (mainClean && mainClean.includes(cleanPhone)) ||
        (waClean && waClean.includes(cleanPhone))
      );
    });
  };

  // Lead CRUD
  const addLead = (leadData: Omit<Lead, "id" | "createdAt">): Lead => {
    const id = `ld-${crypto.randomUUID()}`;
    const branch = branches.find((b) => b.id === leadData.branchId);
    const agent = users.find((u) => u.id === leadData.assignedAgentId);

    const newLead: Lead = {
      ...leadData,
      id,
      branchName: branch ? branch.name : leadData.branchName,
      assignedAgentName: agent ? agent.name : leadData.assignedAgentName,
      createdAt: new Date().toISOString(),
    };

    setLeads((prev) => [newLead, ...prev]);
    justCreated.current.set(id, { branchId: newLead.branchId, assignedAgentId: newLead.assignedAgentId });
    // A broker linked from another branch now works with this branch too.
    if (newLead.brokerId)
      setBrokers((prev) =>
        prev.map((b) =>
          b.id === newLead.brokerId && !(b.branchIds || []).includes(newLead.branchId)
            ? { ...b, branchIds: [...(b.branchIds || []), newLead.branchId] }
            : b,
        ),
      );

    addTimelineEvent({
      leadId: id,
      authorId: effectiveUser.id,
      authorName: effectiveUser.name,
      type: "created",
      title: "إضافة العميل للنظام",
      details: `المصدر: ${sourceNames[newLead.source] ?? newLead.source}`,
    });

    logAudit(
      "إضافة عميل",
      "عميل",
      id,
      `تم إضافة العميل ${newLead.name} - هاتف: ${newLead.phone}`,
    );
    return newLead;
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...updates };

        if (updates.status && updates.status !== l.status) {
          addTimelineEvent({
            leadId: id,
            authorId: effectiveUser.id,
            authorName: effectiveUser.name,
            type: "status_change",
            title: `تحديث حالة العميل إلى (${statusNames[updates.status]})`,
            details: `تغيرت الحالة من ${statusNames[l.status]} إلى ${statusNames[updates.status]}`,
          });
        }

        return updated;
      }),
    );
    logAudit("تعديل عميل", "عميل", id, `تم تعديل بيانات العميل رقم ${id}`);
  };

  const reassignLead = (
    leadId: string,
    newAgentId: string,
    newBranchId?: string,
    newTeamId?: string,
  ) => {
    const targetAgent = users.find((u) => u.id === newAgentId);
    const targetBranch = newBranchId
      ? branches.find((b) => b.id === newBranchId)
      : undefined;

    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        const updated = {
          ...l,
          assignedAgentId: newAgentId,
          assignedAgentName: targetAgent?.name || l.assignedAgentName,
          branchId: newBranchId || l.branchId,
          branchName: targetBranch?.name || l.branchName,
          teamId: newTeamId || targetAgent?.teamId,
        };
        return updated;
      }),
    );

    // The customer's history stays readable by the new owner.
    setTimelineEvents((prev) =>
      prev.map((e) =>
        e.leadId === leadId ? { ...e, leadOwnerId: newAgentId, branchId: newBranchId || e.branchId } : e,
      ),
    );
    // Outstanding work follows the new owner; completed history keeps its original author.
    setFollowUps((prev) =>
      prev.map((task) => {
        if (
          task.leadId !== leadId ||
          ["completed", "cancelled"].includes(task.status)
        )
          return task;
        const updated = {
          ...task,
          assignedAgentId: newAgentId,
          assignedAgentName: targetAgent?.name,
          branchId: newBranchId || task.branchId,
        };
        return updated;
      }),
    );

    addTimelineEvent({
      leadId,
      authorId: effectiveUser.id,
      authorName: effectiveUser.name,
      type: "agent_reassigned",
      title: "إعادة تعيين مسؤول المبيعات",
      details: `تم نقل العميل إلى المسؤول: ${targetAgent?.name || newAgentId}`,
    });

    logAudit(
      "إعادة توزيع عميل",
      "عميل",
      leadId,
      `تم نقل العميل إلى الموظف ${targetAgent?.name}`,
    );
  };

  const deleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    logAudit("حذف عميل", "عميل", id, `تم حذف العميل رقم ${id}`);
  };

  // Visit Operations
  const addVisit = (visitData: Omit<Visit, "id">): Visit => {
    const id = `vst-${crypto.randomUUID()}`;
    const branch = branches.find((b) => b.id === visitData.branchId);
    const agent = users.find((u) => u.id === visitData.receivedByAgentId);

    // Auto check duplicate / existing lead
    const brokerOnly = visitData.visitorType === "broker";
    const existing = !brokerOnly && visitData.phone
      ? findDuplicateLeadsByPhone(visitData.phone).filter(
          (l) =>
            l.branchId === visitData.branchId &&
            (effectiveUser.role !== "sales_agent" ||
              l.assignedAgentId === effectiveUser.id),
        )
      : [];
    let linkedLeadId = brokerOnly
      ? undefined
      : visitData.linkedLeadId ||
        (existing.length > 0 ? existing[0].id : undefined);

    // If no lead exists and phone exists, create lead automatically
    if (!brokerOnly && !linkedLeadId && visitData.phone && visitData.visitorName) {
      const createdLead = addLead({
        name: visitData.visitorName,
        phone: visitData.phone,
        whatsappPhone: visitData.whatsappPhone || visitData.phone,
        source: visitData.source || "walk_in",
        branchId: visitData.branchId,
        branchName: branch?.name,
        assignedAgentId: visitData.receivedByAgentId,
        assignedAgentName: agent?.name,
        status: visitData.requiresFollowUp ? "needs_followup" : "interested",
        classification: "B",
        department: visitData.interests?.[0] || visitData.department || "decor",
        interests: visitData.interests,
        brokerId: visitData.brokerId,
        brokerName: visitData.brokerName,
        courseOfInterest: visitData.courseOfInterest,
        locationRating: visitData.locationRating,
        treatmentRating: visitData.treatmentRating,
        priceRating: visitData.priceRating,
        notes: `مسجل تلقائياً من زيارة مقر الفرع: ${visitData.notes}`,
      });
      linkedLeadId = createdLead.id;
    }

    const newVisit: Visit = {
      ...visitData,
      id,
      branchName: branch?.name || visitData.branchName,
      receivedByAgentName: agent?.name || visitData.receivedByAgentName,
      hasPreviousRecord: !!visitData.linkedLeadId || existing.length > 0,
      linkedLeadId,
    };

    setVisits((prev) => [newVisit, ...prev]);

    // If linked to lead, add timeline event & optional follow up
    if (linkedLeadId) {
      addTimelineEvent({
        leadId: linkedLeadId,
        authorId: effectiveUser.id,
        authorName: effectiveUser.name,
        type: "visit",
        title: `تسجيل زيارة فرع (${branch?.name || "مقر الفرع"})`,
        details: [`استقبله الموظف: ${agent?.name}`, `النتيجة: ${visitData.outcome}`, visitData.notes ? `الملاحظات: ${visitData.notes}` : ""].filter(Boolean).join(". "),
      });

      if (visitData.requiresFollowUp && visitData.followUpDate) {
        addFollowUp({
          leadId: linkedLeadId,
          leadName: visitData.visitorName,
          leadPhone: visitData.phone,
          assignedAgentId:
            visitData.followUpAgentId || visitData.receivedByAgentId,
          assignedAgentName: agent?.name,
          branchId: visitData.branchId,
          scheduledAt: visitData.followUpDate,
          reason: visitData.followUpReason || `متابعة نتيجة زيارة المقر بتاريخ ${visitData.date}`,
          type: "call",
          notes: visitData.notes,
          origin: visitData.followUpOrigin,
        });
      }
    }

    logAudit(
      "تسجيل زيارة",
      "زيارة",
      id,
      `تسجيل زيارة للزائر ${visitData.visitorName}`,
    );
    return newVisit;
  };

  // FollowUp Operations
  const addFollowUp = (
    followUpData: Omit<FollowUp, "id" | "status">,
  ): FollowUp => {
    const id = `flw-${crypto.randomUUID()}`;
    const agent = users.find((u) => u.id === followUpData.assignedAgentId);

    const nowStr = today();
    const schedDate = followUpData.scheduledAt.slice(0, 10);
    const initialStatus =
      schedDate < nowStr
        ? "overdue"
        : schedDate === nowStr
          ? "due"
          : "upcoming";

    const newFollowUp: FollowUp = {
      ...followUpData,
      id,
      assignedAgentName: agent?.name || followUpData.assignedAgentName,
      status: initialStatus,
    };

    setFollowUps((prev) => [newFollowUp, ...prev]);

    // A follow-up given to someone other than the owner lets them open that customer.
    const owner = leads.find((l) => l.id === followUpData.leadId);
    const delegatedTo =
      owner && followUpData.assignedAgentId && followUpData.assignedAgentId !== owner.assignedAgentId && !(owner.delegatedTo || []).includes(followUpData.assignedAgentId)
        ? [...(owner.delegatedTo || []), followUpData.assignedAgentId]
        : undefined;

    // A follow-up about a broker has no customer file to update.
    if (followUpData.leadId) updateLead(followUpData.leadId, {
      ...(delegatedTo ? { delegatedTo } : {}),
      nextFollowUpDate: [
        ...followUps
          .filter(
            (f) =>
              f.leadId === followUpData.leadId &&
              !["completed", "cancelled"].includes(followUpStatus(f)),
          )
          .map((f) => f.scheduledAt),
        followUpData.scheduledAt,
      ].sort()[0],
      status:
        leads.find((l) => l.id === followUpData.leadId)?.status === "booked"
          ? "booked"
          : "needs_followup",
    });

    // A Zaki suggestion writes its own, fuller timeline entry when it is accepted.
    if (followUpData.leadId && followUpData.origin !== "zaki")
      addTimelineEvent({
        leadId: followUpData.leadId,
        authorId: effectiveUser.id,
        authorName: effectiveUser.name,
        type: "followup_created",
        title: `جدولة متابعة جديدة (${followUpTypeNames[followUpData.type] ?? followUpData.type})`,
        details: `موعد المتابعة: ${followUpData.scheduledAt}. السبب: ${followUpData.reason}`,
      });

    logAudit(
      "إضافة متابعة",
      "متابعة",
      id,
      `جدولة متابعة للعميل ${followUpData.leadName}`,
    );
    return newFollowUp;
  };

  const updateFollowUpResult = (
    id: string,
    status: "completed" | "cancelled",
    result: string,
    nextFollowUpDate?: string,
    extra?: FollowUpExtra,
  ) => {
    const original = followUps.find((f) => f.id === id);
    if (!original) return;
    setFollowUps((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status,
              outcomeResult: result,
              completedAt: new Date().toISOString(),
              nextFollowUpDate,
              ...(status === "completed" && extra ? extra : {}),
            }
          : f,
      ),
    );
    if (status === "completed" && extra?.satisfactionRating && original.leadId) {
      updateLead(original.leadId, {
        customerRatingStars: extra.satisfactionRating,
        customerRatingComment: extra.satisfactionComment,
        hasSubmittedRating: true,
      });
    }
    const lead = leads.find((l) => l.id === original.leadId);
    // A follow-up about a broker has no customer history to write into.
    if (original.leadId)
      addTimelineEvent({
        leadId: original.leadId,
        authorId: effectiveUser.id,
        authorName: effectiveUser.name,
        type: "followup_result",
        title: status === "completed" ? "تسجيل نتيجة المتابعة" : "إلغاء متابعة",
        details: result,
      });
    if (lead && status === "completed") {
      const remainingDates = followUps
        .filter(
          (f) =>
            f.leadId === lead.id &&
            f.id !== id &&
            !["completed", "cancelled"].includes(followUpStatus(f)),
        )
        .map((f) => f.scheduledAt);
      if (nextFollowUpDate) remainingDates.push(nextFollowUpDate);
      remainingDates.sort();
      updateLead(lead.id, {
        lastContactDate: today(),
        nextFollowUpDate: remainingDates[0],
        status:
          lead.status === "booked"
            ? "booked"
            : remainingDates.length
              ? "needs_followup"
              : "contacted",
      });
      if (nextFollowUpDate)
        addFollowUp({
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          assignedAgentId: original.assignedAgentId,
          branchId: original.branchId,
          scheduledAt: nextFollowUpDate,
          reason: `متابعة إضافية: ${result}`,
          type: original.type,
          notes: result,
        });
    }
    logAudit("تحديث متابعة", "متابعة", id, `تحديث نتيجة المتابعة برقم ${id}`);
  };

  // Booking Operations
  /** The post-sale follow-ups still ahead for a purchase, with fixed ids so doing it twice can never double them. */
  const postSaleFollowUps = (booking: Booking, have: Set<string | undefined>): FollowUp[] => {
    const lead = leads.find((l) => l.id === booking.leadId);
    const agentId = users.some((u) => u.id === booking.agentId) ? booking.agentId : lead?.assignedAgentId || booking.agentId;
    return upcomingPostSale(booking.bookingDate, today(), have).map((m) => ({
      id: `flw-ps-${booking.id}-${m.milestone}`,
      leadId: booking.leadId,
      leadName: booking.leadName,
      leadPhone: booking.leadPhone,
      assignedAgentId: agentId,
      assignedAgentName: users.find((u) => u.id === agentId)?.name,
      branchId: booking.branchId,
      scheduledAt: m.date,
      reason: m.reason,
      type: "call" as const,
      notes: "",
      status: (m.date === today() ? "due" : "upcoming") as FollowUp["status"],
      category: "post_sale" as const,
      origin: "auto" as const,
      bookingId: booking.id,
      milestone: m.milestone,
    }));
  };

  const addBooking = (
    bookingData: Omit<Booking, "id" | "createdAt">,
  ): Booking => {
    const id = `bkg-${crypto.randomUUID()}`;
    const branch = branches.find((b) => b.id === bookingData.branchId);
    const agent = users.find((u) => u.id === bookingData.agentId);

    // Buying means receiving: a purchase is delivered the day it is made.
    const cancelled = bookingData.bookingStatus === "cancelled";
    const newBooking: Booking = {
      ...bookingData,
      id,
      branchName: branch?.name || bookingData.branchName,
      agentName: agent?.name || bookingData.agentName,
      bookingStatus: cancelled ? "cancelled" : "completed",
      ...(cancelled ? {} : { deliveredAt: bookingData.bookingDate }),
      createdAt: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);
    const post = cancelled ? [] : postSaleFollowUps(newBooking, new Set());

    // Automatically update Lead status to 'booked'!
    updateLead(bookingData.leadId, {
      status: "booked",
      ...(post.length
        ? {
            nextFollowUpDate: [
              ...followUps.filter((f) => f.leadId === bookingData.leadId && !["completed", "cancelled"].includes(followUpStatus(f))).map((f) => f.scheduledAt),
              post[0].scheduledAt,
            ].sort()[0],
          }
        : {}),
    });
    if (post.length) setFollowUps((prev) => [...post, ...prev]);

    addTimelineEvent({
      leadId: bookingData.leadId,
      authorId: effectiveUser.id,
      authorName: effectiveUser.name,
      type: "booking_created",
      title: `تسجيل مشتريات: ${bookingData.courseName}`,
      details: [`إجمالي المشتريات: ${bookingData.amount.toLocaleString("en-US")} ج.م`, bookingData.visitId ? "من زيارة الفرع" : "", post.length ? `جُدولت ${post.length} متابعات بعد البيع` : "", bookingData.notes ? `الملاحظات: ${bookingData.notes}` : ""].filter(Boolean).join(" · "),
    });

    logAudit(
      "إضافة حجز",
      "حجز",
      id,
      `إتمام حجز كورس ${bookingData.courseName} للعميل ${bookingData.leadName}`,
    );
    return newBooking;
  };

  /** Records why a customer has not bought yet; an unknown reason schedules a follow-up question. */
  const addNotBoughtRecord: CRMContextType["addNotBoughtRecord"] = (data) => {
    const record: NotBoughtRecord = {
      ...data,
      id: `nbr-${crypto.randomUUID()}`,
      agentName: users.find((u) => u.id === data.agentId)?.name,
      createdAt: new Date().toISOString(),
    };
    setNotBoughtRecords((prev) => [record, ...prev]);
    const labels = data.reasons
      .map((r) => (r === "other" && data.otherText ? `أخرى: ${data.otherText}` : reasonLabel(r)))
      .join("، ");
    addTimelineEvent({
      leadId: data.leadId,
      authorId: effectiveUser.id,
      authorName: effectiveUser.name,
      type: "note",
      title: `لسه ما اشترى: ${labels}`,
      details: data.note || "",
    });
    if (data.reasons.includes("unknown") && data.agentId) {
      addFollowUp({
        leadId: data.leadId,
        leadName: data.leadName,
        leadPhone: leads.find((l) => l.id === data.leadId)?.phone || "",
        assignedAgentId: data.agentId,
        branchId: data.branchId,
        origin: "auto",
        scheduledAt: addToDate(today(), { days: unknownReasonFollowUpDays }),
        reason: unknownReasonQuestion,
        type: "call",
        notes: "",
      });
    }
    logAudit("سبب عدم الشراء", "عميل", data.leadId, `${data.leadName}: ${labels}`);
    return record;
  };


  // User & Organization CRUD
  const addUser = (userData: Omit<User, "id" | "createdAt">): User => {
    const id = `usr-${crypto.randomUUID()}`;
    const newUser: User = {
      ...userData,
      id,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    logAudit(
      "إضافة موظف",
      "مستخدم",
      id,
      `إنشاء حساب للموظف ${newUser.name} بدور ${newUser.role}`,
    );
    return newUser;
  };

  // Keep the server-trusted access record in step with the user document.
  const syncAuthProfile = (
    userId: string,
    patch: { role?: User["role"]; branchId?: string; active?: boolean; name?: string; supervisedBranchIds?: string[] },
  ) => {
    const authUid = users.find((u) => u.id === userId)?.authUid;
    if (!authUid) return;
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(clean).length) {
      updateDoc(doc(db, "authProfiles", authUid), clean).catch((e) =>
        console.error("authProfile sync failed", e),
      );
    }
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    syncAuthProfile(id, {
      role: updates.role,
      branchId: updates.branchId,
      name: updates.name,
      supervisedBranchIds: updates.supervisedBranchIds,
    });
    const target = users.find((u) => u.id === id);
    const labels: Record<string, string> = { name: "الاسم", phone: "الهاتف", email: "الإيميل", role: "الدور", branchId: "الفرع", teamId: "الفريق", departmentId: "القسم", jobPositionId: "المسمى الوظيفي", directManagerId: "المدير المباشر", supervisedBranchIds: "نطاق الإشراف", specialty: "الاختصاص" };
    const changed = Object.keys(updates)
      .filter((k) => labels[k] && JSON.stringify((target as unknown as Record<string, unknown> | undefined)?.[k]) !== JSON.stringify((updates as Record<string, unknown>)[k]))
      .map((k) => labels[k]);
    logAudit("تعديل موظف", "مستخدم", id, `${effectiveUser.name} عدّل بيانات ${target?.name ?? id}${changed.length ? `: ${changed.join("، ")}` : ""}`);
  };

  const toggleUserActive = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const active = !target.active;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));
    syncAuthProfile(id, { active });
    logAudit(
      "تغيير حالة حساب",
      "مستخدم",
      id,
      `تغيير تفعيل الحساب إلى ${active ? "مفعل" : "معطل"}`,
    );
  };

  const deleteUser = async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    // The server finds the sign-in account through the staff record, so it goes first.
    if (target.authUid) {
      await deleteLoginOnServer(id);
      // Without the access record nobody can get in, even if the sign-in account could not be removed.
      await deleteDoc(doc(db, "authProfiles", target.authUid)).catch((e) => console.error("authProfile delete failed", e));
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    logAudit("مسح موظف", "مستخدم", id, `مسح ${target.name} نهائيًا`);
  };

  /** Creates a Firebase login for a staff record and links the two. */
  const createLoginForUser: CRMContextType["createLoginForUser"] = async (
    userId,
    loginId,
    password,
    info,
  ) => {
    const authUid = await createStaffLogin({ userId, loginId, password, ...info });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, authUid } : u)),
    );
    logAudit(
      "إنشاء حساب دخول",
      "مستخدم",
      userId,
      `تم إنشاء حساب دخول للموظف ${info.name}`,
    );
  };

  const addBranch = (branchData: Omit<Branch, "id">): Branch => {
    const id = `br-${crypto.randomUUID()}`;
    const newBranch: Branch = { ...branchData, id };
    setBranches((prev) => [...prev, newBranch]);
    logAudit("إضافة فرع", "فرع", id, `إنشاء الفرع ${newBranch.name}`);
    return newBranch;
  };

  const updateBranch = (id: string, updates: Partial<Branch>) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    );
    logAudit("تعديل فرع", "فرع", id, `تعديل بيانات الفرع ${id}`);
  };

  const addTeam = (teamData: Omit<Team, "id">): Team => {
    const id = `tm-${crypto.randomUUID()}`;
    const newTeam: Team = { ...teamData, id };
    setTeams((prev) => [...prev, newTeam]);
    logAudit("إضافة فريق", "فريق", id, `إنشاء فريق جديد ${newTeam.name}`);
    return newTeam;
  };

  const updateTeam = (id: string, updates: Partial<Team>) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
    logAudit("تعديل فريق", "فريق", id, `تعديل فريق ${id}`);
  };

  const updateDistributionRule = (rules: Partial<DistributionRule>) => {
    setDistributionRule((prev) => ({ ...prev, ...rules }));
    logAudit(
      "تحديث إعدادات التوزيع",
      "إعدادات",
      "dist_rule",
      "تعديل قواعد توزيع العملاء",
    );
  };

  // Demo data lets the director explore every role with realistic records.
  // Everything added here can be removed again by id with removeDemoData().
  const addMissing = <T extends { id: string }>(prev: T[], extra: T[]) => {
    const have = new Set(prev.map((i) => i.id));
    return [...prev, ...extra.filter((i) => !have.has(i.id))];
  };
  const dropDemo = <T extends { id: string }>(prev: T[], demo: T[]) => {
    const ids = new Set(demo.map((i) => i.id));
    return prev.filter((i) => !ids.has(i.id));
  };
  // The sample data lives in its own chunk, downloaded only when someone asks for it.
  const sampleData = async () => {
    const [demo, seed] = await Promise.all([import("../data/demoData"), import("../data/initialData")]);
    return { ...demo, ...seed };
  };
  const loadDemoData = async () => {
    const {
      initialCompanies, initialWarehouses, initialBranches, initialTeams, initialDepartments, initialJobPositions,
      demoUsers, demoLeads, demoVisits, demoFollowUps, demoBookings, demoTimeline, demoInvoices, demoBrokers, demoNotBought, demoReviews,
    } = await sampleData();
    // Everything is flagged as sample data, so it can be removed later without touching real records.
    // The sample org structure comes along, so the sample staff and customers have branches to belong to.
    setCompanies((p) => addMissing(p, asDemo(initialCompanies)));
    setWarehouses((p) => addMissing(p, asDemo(initialWarehouses)));
    setBranches((p) => addMissing(p, asDemo(initialBranches)));
    setTeams((p) => addMissing(p, asDemo(initialTeams)));
    setDepartmentEntities((p) => addMissing(p, asDemo(initialDepartments)));
    setJobPositions((p) => addMissing(p, asDemo(initialJobPositions)));
    setUsers((p) => addMissing(p, asDemo(demoUsers.map(normalizeUser))));
    setLeads((p) => addMissing(p, asDemo(demoLeads)));
    setVisits((p) => addMissing(p, asDemo(demoVisits)));
    setFollowUps((p) => addMissing(p, asDemo(demoFollowUps)));
    setBookings((p) => addMissing(p, asDemo(demoBookings)));
    setTimelineEvents((p) => addMissing(p, asDemo(demoTimeline)));
    setPurchaseInvoices((p) => addMissing(p, asDemo(demoInvoices)));
    setBrokers((p) => addMissing(p, asDemo(demoBrokers)));
    setNotBoughtRecords((p) => addMissing(p, asDemo(demoNotBought)));
    setReviewRequests((p) => addMissing(p, asDemo(demoReviews)));
  };

  /** Ids that older versions of the sample data loaded without a flag. */
  const knownDemoIds = async (): Promise<KnownDemoIds> => {
    const d = await sampleData();
    const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
    return {
      companies: ids(d.initialCompanies), warehouses: ids(d.initialWarehouses), branches: ids(d.initialBranches), teams: ids(d.initialTeams),
      departmentEntities: ids(d.initialDepartments), jobPositions: ids(d.initialJobPositions), users: ids(d.allSampleUsers), leads: ids(d.demoLeads),
      visits: ids(d.demoVisits), followUps: ids(d.demoFollowUps), bookings: ids(d.demoBookings), timelineEvents: ids(d.demoTimeline),
      purchaseInvoices: ids(d.demoInvoices), brokers: ids(d.demoBrokers), notBoughtRecords: ids(d.demoNotBought), reviewRequests: ids(d.demoReviews),
    };
  };
  const demoSummary = useMemo(() => {
    const n = (xs: { isDemo?: boolean }[]) => xs.filter((x) => x.isDemo).length;
    const d = { customers: n(leads), branches: n(branches), staff: n(users), brokers: n(brokers) };
    return { ...d, any: d.customers + d.branches + d.staff + d.brokers > 0 };
  }, [leads, branches, users, brokers]);
  const demoWorld = (): DemoWorld => ({
    users, companies, warehouses, branches, teams, departmentEntities, jobPositions, leads, visits, followUps, bookings,
    timelineEvents, purchaseInvoices, brokers, notBoughtRecords, reviewRequests, reviewNotes, notifications, auditLogs,
  });
  /** What removing the sample data would delete, and how many real customers are tied to sample branches or staff. */
  const previewDemoRemoval = async () => {
    const { total, realLinked } = planDemoRemoval(demoWorld(), await knownDemoIds(), currentUser.id);
    return { total, realLinked };
  };
  const removeDemoData = async () => {
    const { drop } = planDemoRemoval(demoWorld(), await knownDemoIds(), currentUser.id);
    const keep = <T extends { id: string }>(c: keyof typeof drop) => (prev: T[]) => prev.filter((i) => !drop[c].has(i.id));
    setCompanies(keep("companies"));
    setWarehouses(keep("warehouses"));
    setBranches(keep("branches"));
    setTeams(keep("teams"));
    setDepartmentEntities(keep("departmentEntities"));
    setJobPositions(keep("jobPositions"));
    setUsers(keep("users"));
    setLeads(keep("leads"));
    setVisits(keep("visits"));
    setFollowUps(keep("followUps"));
    setBookings(keep("bookings"));
    setTimelineEvents(keep("timelineEvents"));
    setPurchaseInvoices(keep("purchaseInvoices"));
    setBrokers(keep("brokers"));
    setNotBoughtRecords(keep("notBoughtRecords"));
    setReviewRequests(keep("reviewRequests"));
    setReviewNotes(keep("reviewNotes"));
    setNotifications(keep("notifications"));
    setAuditLogs(keep("auditLogs"));
  };

  /** Developer-only: empties branches, companies, warehouses, teams, departments and job titles so the real structure can be entered from scratch. */
  const clearOrganizationData = async () => {
    const { allSampleUsers } = await import("../data/demoData");
    setCompanies([]);
    setWarehouses([]);
    setBranches([]);
    setTeams([]);
    setDepartmentEntities([]);
    setJobPositions([]);
    // The sample staff go too; anyone with a real login (or the signed-in developer) stays.
    const sample = new Set(allSampleUsers.map((u) => u.id));
    setUsers((prev) => prev.filter((u) => u.id === currentUser.id || u.authUid || !sample.has(u.id)));
    logAudit("تفريغ الهيكل الإداري", "إعدادات", "org", "تفريغ الفروع والشركات والمخازن والفرق والأقسام والمسميات");
  };

  // Data lives in Firestore, so a reset only clears this browser's session/cache.
  const resetAllData = () => {
    setViewAsUser(null);
    localStorage.clear();
  };

  // Organizational Methods
  const addCompany = (cmpData: Omit<Company, "id">): Company => {
    const newCmp: Company = {
      ...cmpData,
      id: `cmp-${Date.now().toString().slice(-5)}`,
    };
    setCompanies((prev) => [...prev, newCmp]);
    logAudit(
      "إضافة شركة",
      "شركة",
      newCmp.id,
      `تم إضافة شركة جديدة: ${newCmp.name}`,
    );
    return newCmp;
  };

  const addGovernorate = (govData: Omit<Governorate, "id">): Governorate => {
    const newGov: Governorate = {
      ...govData,
      id: `gov-${Date.now().toString().slice(-5)}`,
    };
    setGovernorates((prev) => [...prev, newGov]);
    logAudit(
      "إضافة محافظة",
      "محافظة",
      newGov.id,
      `تم إضافة محافظة/إقليم جديد: ${newGov.name}`,
    );
    return newGov;
  };

  const addWarehouse = (whData: Omit<Warehouse, "id">): Warehouse => {
    const newWh: Warehouse = {
      ...whData,
      id: `wh-${Date.now().toString().slice(-5)}`,
    };
    setWarehouses((prev) => [...prev, newWh]);
    logAudit(
      "إضافة مخزن/مستودع",
      "مخزن",
      newWh.id,
      `تم إضافة مخزن/مستودع جديد: ${newWh.name}`,
    );
    return newWh;
  };

  const addDepartmentEntity = (
    deptData: Omit<DepartmentEntity, "id">,
  ): DepartmentEntity => {
    const newDept: DepartmentEntity = {
      ...deptData,
      id: `dept-${Date.now().toString().slice(-5)}`,
    };
    setDepartmentEntities((prev) => [...prev, newDept]);
    logAudit(
      "إضافة قسم جديد",
      "قسم",
      newDept.id,
      `تم إضافة قسم جديد: ${newDept.name}`,
    );
    return newDept;
  };

  const updateDepartmentEntity = (
    id: string,
    updates: Partial<DepartmentEntity>,
  ) => {
    setDepartmentEntities((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    );
    logAudit("تحديث بيانات قسم", "قسم", id, `تحديث بيانات قسم ${id}`);
  };

  const addJobPosition = (posData: Omit<JobPosition, "id">): JobPosition => {
    const dept = departmentEntities.find((d) => d.id === posData.departmentId);
    const newPos: JobPosition = {
      ...posData,
      id: `pos-${Date.now().toString().slice(-5)}`,
      departmentName: dept ? dept.name : posData.departmentName,
    };
    setJobPositions((prev) => [...prev, newPos]);
    logAudit(
      "إضافة مسمى وظيفي",
      "وظيفة",
      newPos.id,
      `تم إضافة مسمى وظيفي جديد: ${newPos.title}`,
    );
    return newPos;
  };

  const updateJobPosition = (id: string, updates: Partial<JobPosition>) => {
    setJobPositions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
    logAudit("تحديث المسمى الوظيفي", "وظيفة", id, `تحديث المسمى الوظيفي ${id}`);
  };

  const updateUserPermissions = (userId: string, permissions: string[]) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        logAudit(
          "تحديث صلاحيات الموظف",
          "موظف",
          u.id,
          `تحديث صلاحيات الموظف ${u.name}`,
        );
        return { ...u, permissions };
      }),
    );
  };

  // Purchase Categories CRUD
  const addPurchaseCategory = (
    catData: Omit<PurchaseCategory, "id">,
  ): PurchaseCategory => {
    const newCat: PurchaseCategory = {
      ...catData,
      id: `cat-${Date.now().toString().slice(-5)}`,
    };
    setPurchaseCategories((prev) => [...prev, newCat]);
    logAudit(
      "إضافة تصنيف مشتريات",
      "تصنيفات",
      newCat.id,
      `إضافة تصنيف جديد: ${newCat.name}`,
    );
    return newCat;
  };

  const updatePurchaseCategory = (
    id: string,
    updates: Partial<PurchaseCategory>,
  ) => {
    setPurchaseCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
    logAudit(
      "تحديث تصنيف مشتريات",
      "تصنيفات",
      id,
      `تحديث تصنيف المشتريات ${id}`,
    );
  };

  // Brokers CRUD
  const addBroker = (
    brokerData: Omit<BrokerEntity, "id" | "totalReferrals" | "totalVolume">,
  ): BrokerEntity => {
    const newBroker: BrokerEntity = {
      ...brokerData,
      id: `brk-${crypto.randomUUID()}`,
      totalReferrals: 0,
      totalVolume: 0,
    };
    setBrokers((prev) => [...prev, newBroker]);
    logAudit(
      "إضافة وسيط / جهة ترشيح",
      "وسيط",
      newBroker.id,
      `إضافة وسيط جديد: ${newBroker.name}`,
    );
    return newBroker;
  };

  const updateBroker = (id: string, updates: Partial<BrokerEntity>) => {
    setBrokers((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const updated = { ...b, ...updates };
        return updated;
      }),
    );
    logAudit("تحديث بيانات الوسيط", "وسيط", id, `تحديث بيانات الوسيط ${id}`);
  };

  // Purchase Invoices CRUD
  const addPurchaseInvoice = (
    invData: Omit<PurchaseInvoice, "id" | "createdAt" | "invoiceNumber">,
  ): PurchaseInvoice => {
    const newInv: PurchaseInvoice = {
      ...invData,
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
    };
    setPurchaseInvoices((prev) => [newInv, ...prev]);

    // If invoice is assigned to a broker, update broker volume
    if (newInv.brokerId) {
      setBrokers((prev) =>
        prev.map((b) =>
          b.id === newInv.brokerId
            ? {
                ...b,
                totalReferrals: b.totalReferrals + 1,
                totalVolume: b.totalVolume + newInv.totalAmount,
              }
            : b,
        ),
      );
    }

    // Add event timeline to lead
    addTimelineEvent({
      leadId: newInv.leadId,
      authorId: effectiveUser.id,
      authorName: effectiveUser.name,
      type: "booking_created",
      title: "إصدار فاتورة مشتريات",
      details: `تم إصدار فاتورة رقم ${newInv.invoiceNumber} بقيمة ${newInv.totalAmount.toLocaleString()} ج.م`,
    });

    logAudit(
      "إصدار فاتورة مشتريات",
      "فاتورة",
      newInv.id,
      `إصدار فاتورة برقم ${newInv.invoiceNumber}`,
    );
    return newInv;
  };

  const updatePurchaseInvoiceStatus = (
    id: string,
    status: PurchaseInvoice["status"],
  ) => {
    setPurchaseInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status } : inv)),
    );
    logAudit(
      "تحديث حالة الفاتورة",
      "فاتورة",
      id,
      `تحديث حالة الفاتورة إلى ${status}`,
    );
  };

  // Notifications
  const addNotification = (
    notifData: Omit<NotificationItem, "id" | "createdAt" | "read">,
  ): NotificationItem => {
    const newNotif: NotificationItem = {
      ...notifData,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    return newNotif;
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const clearAllNotifications = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <CRMContext.Provider
      value={{
        currentUser,
        logout,
        loadDemoData,
        clearOrganizationData,
        removeDemoData,
        addReferralLead,
        previewDemoRemoval,
        demoSummary,
        createLoginForUser,
        viewAsUser,
        setViewAsUser,
        effectiveUser,
        permissionMatrix,
        updatePermissionMatrix,

        users,
        companies,
        governorates,
        warehouses,
        branches,
        teams,
        courses,
        leads,
        visits,
        followUps,
        bookings,
        timelineEvents,
        auditLogs,
        distributionRule,
        license,
        setLicense,

        addCompany,
        addGovernorate,
        addWarehouse,
        addDepartmentEntity,
        updateDepartmentEntity,
        addJobPosition,
        updateJobPosition,
        departmentEntities,
        jobPositions,
        purchaseCategories,
        brokers,
        purchaseInvoices,
        notifications,

        addPurchaseCategory,
        updatePurchaseCategory,
        addBroker,
        updateBroker,
        addPurchaseInvoice,
        updatePurchaseInvoiceStatus,
        addNotification,
        markNotificationRead,
        clearAllNotifications,

        findDuplicateLeadsByPhone,
        addLead,
        updateLead,
        reassignLead,
        deleteLead,

        addVisit,

        addFollowUp,
        updateFollowUpResult,

        addBooking,
        addNotBoughtRecord,
        notBoughtRecords,
        reminderDone,
        markReminderDone,
        aiSuggestions,
        saveSuggestions,
        decideSuggestion,
        reviewRequests,
        reviewNotes,
        requestReview,
        requestBrokerReview,
        markReviewReminderSent,
        cancelReviewRequest,
        addReviewNote,
        saveReviewAnalysis,

        addUser,
        updateUser,
        toggleUserActive,
        deleteUser,
        updateUserPermissions,
        addBranch,
        updateBranch,
        addTeam,
        updateTeam,

        addTimelineEvent,
        logAudit,

        updateDistributionRule,
        resetAllData,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error("useCRM must be used within a CRMProvider");
  }
  return useMemo(() => createWorkspace(context), [context]);
};
