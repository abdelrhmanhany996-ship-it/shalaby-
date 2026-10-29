export type UserRole =
  | "admin"
  | "general_manager"
  | "regional_manager"
  | "branch_manager"
  | "supervisor"
  | "team_leader"
  | "sales_agent";

export interface JobPosition {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  title: string;
  departmentId: string;
  departmentName?: string;
  description?: string;
  active: boolean;
}

export interface DepartmentEntity {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  name: string;
  code: string;
  description?: string;
  active: boolean;
}

export interface User {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  companyId?: string;
  companyName?: string;
  governorateId?: string;
  governorateName?: string;
  branchId?: string;
  branchName?: string;
  warehouseId?: string;
  warehouseName?: string;
  teamId?: string;
  teamName?: string;
  department?: Department | string;
  departmentId?: string;
  departmentName?: string;
  jobPositionId?: string;
  jobPositionTitle?: string;
  directManagerId?: string;
  directManagerName?: string;
  active: boolean;
  createdAt: string;
  permissions?: string[];
  specialty?: "sales" | "accounts" | "operations";
  supervisedBranchIds?: string[];
  authUid?: string; // Firebase Auth uid once a login exists
}

export interface Company {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  name: string;
  code: string;
  description: string;
  ceoName?: string;
  phone: string;
  active: boolean;
}

export interface Governorate {
  id: string;
  name: string;
  code: string;
  region: string;
  managerName?: string;
  phone: string;
  active: boolean;
}

export interface Warehouse {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  name: string;
  code: string;
  governorateId: string;
  governorateName?: string;
  branchId?: string;
  managerName?: string;
  phone: string;
  address: string;
  capacity: string;
  active: boolean;
}

export type BranchType =
  | "main_hq"
  | "showroom"
  | "warehouse"
  | "store"
  | "project_site";

export interface Branch {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  name: string;
  code: string;
  city: string;
  companyId?: string;
  companyName?: string;
  governorateId?: string;
  governorateName?: string;
  branchType?: BranchType;
  managerId?: string;
  managerName?: string;
  phone: string;
  address: string;
  active: boolean;
}

export interface Team {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  name: string;
  branchId: string;
  branchName?: string;
  supervisorId?: string;
  supervisorName?: string;
  leaderId?: string;
  leaderName?: string;
  memberIds: string[];
}

export type Department = "construction" | "decor" | "garden" | "general";

export interface ProductService {
  id: string;
  name: string;
  code: string;
  department: Department;
  category: string;
  price: number;
  duration: string;
  active: boolean;
}

export type Course = ProductService;

export type LeadStatus =
  | "new"
  | "uncontacted"
  | "contacted"
  | "interested"
  | "prospect"
  | "needs_followup"
  | "not_interested"
  | "booked";

export type LeadClassification = "A" | "B" | "C" | "VIP";

export type LeadSource =
  | "facebook"
  | "instagram"
  | "google"
  | "walk_in"
  | "referral"
  | "phone_inquiry"
  | "whatsapp"
  | "exhibition"
  | "other";

export type CustomerCategory =
  | "individual"
  | "engineering_company"
  | "decor_company"
  | "contractor"
  | "engineer"
  | "painter"
  | "technician"
  | "broker_individual"
  | "broker_company";

export interface Lead {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  name: string;
  phone: string;
  whatsappPhone?: string;
  isSameWhatsApp?: boolean;
  email?: string;
  source: LeadSource;
  customerCategory?: CustomerCategory;
  companyNameRelationship?: string;
  branchId: string;
  branchName?: string;
  teamId?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  createdAt: string;
  status: LeadStatus;
  classification: LeadClassification;
  department: Department;
  departmentName?: string;
  /** Salespeople handling a follow-up on this customer for its owner (they may read and update it). */
  delegatedTo?: string[];
  /** Everything the customer is interested in; `department` is the first of them. */
  interests?: Department[];
  courseOfInterest?: string; // alias for department / service details
  locationRating?: number; // 1-5 rating for location
  treatmentRating?: number; // 1-5 rating for staff treatment
  priceRating?: number; // 1-5 rating for pricing
  lastContactDate?: string;
  nextFollowUpDate?: string;
  notes: string;
  lostReason?: string;
  whatsappMessageSent?: boolean;
  whatsappSentBy?: string;
  whatsappSentAt?: string;
  uniqueEvaluationUrl?: string;
  hasOpenedEvaluationLink?: boolean;
  evaluationOpenedAt?: string;
  hasSubmittedRating?: boolean;
  customerRatingStars?: number;
  customerRatingComment?: string;
  brokerId?: string; // broker who referred this customer
  brokerName?: string;
  /** The customer who recommended this one (a prospect added from a review or a post-sale call). */
  referredByLeadId?: string;
  referredByName?: string;
}

export type VisitorType = "client" | "broker" | "both";

export interface Visit {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  /** Who came: a customer, a broker on their own, or a customer who came with a broker. */
  visitorType?: VisitorType;
  brokerId?: string;
  brokerName?: string;
  /** Interests chosen for a customer registered through this visit. */
  interests?: Department[];
  visitorName: string;
  phone: string;
  whatsappPhone?: string;
  date: string;
  time: string;
  branchId: string;
  branchName?: string;
  receivedByAgentId: string;
  receivedByAgentName?: string;
  source: LeadSource;
  department: Department;
  courseOfInterest?: string;
  locationRating?: number;
  treatmentRating?: number;
  priceRating?: number;
  reason: string;
  outcome: string;
  notes: string;
  hasPreviousRecord: boolean;
  linkedLeadId?: string;
  requiresFollowUp: boolean;
  followUpAgentId?: string;
  followUpDate?: string;
  followUpReason?: string;
  /** "auto" when the system chose the follow-up (after a purchase), not the salesperson. */
  followUpOrigin?: "auto";
}

export type FollowUpStatus =
  | "due"
  | "upcoming"
  | "completed"
  | "overdue"
  | "cancelled";
export type FollowUpType =
  | "call"
  | "whatsapp"
  | "branch_visit"
  | "email"
  | "meeting";

export interface FollowUp {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  assignedAgentId: string;
  assignedAgentName?: string;
  branchId: string;
  scheduledAt: string;
  reason: string;
  type: FollowUpType;
  notes: string;
  status: FollowUpStatus;
  outcomeResult?: string;
  completedAt?: string;
  nextFollowUpDate?: string;
  // Post-sale follow-ups are generated when a booking is delivered.
  category?: "sales" | "post_sale";
  bookingId?: string;
  milestone?: "7d" | "30d" | "6m" | "12m";
  satisfactionRating?: number; // 1-5
  satisfactionComment?: string;
  referralNote?: string; // relatives / acquaintances the customer mentioned
  referralLeadId?: string; // the prospect registered from what the customer said
  /** Who made it: the salesperson (default), the system's own rules ("auto"), or a Zaki suggestion the salesperson accepted ("zaki"). */
  origin?: "auto" | "zaki";
  /** The accepted suggestion this follow-up came from. */
  suggestionId?: string;
  /** The broker it is about, when it is not for a customer. */
  brokerId?: string;
  /** How urgent it is. Missing means "normal" (every follow-up made before this field existed). */
  priority?: FollowUpPriority;
  /** How many times the date was moved, with each move kept so nothing is lost. */
  rescheduleCount?: number;
  rescheduleLog?: FollowUpReschedule[];
}

export type FollowUpPriority = "high" | "normal" | "low";

export interface FollowUpReschedule {
  at: string;
  from: string;
  to: string;
  byId: string;
  byName: string;
  reason: string;
}

export type BookingStatus =
  | "confirmed"
  | "pending_payment"
  | "completed"
  | "cancelled";
export type PaymentStatus = "full" | "deposit" | "pending" | "refunded";

export interface Booking {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  branchId: string;
  branchName?: string;
  agentId: string;
  agentName?: string;
  department: Department;
  courseId: string;
  courseName: string;
  bookingDate: string;
  amount: number;
  paymentStatus?: PaymentStatus; // legacy: payments are handled by the accounts team
  departmentAmounts?: Partial<Record<Department, number>>; // purchase split across the 4 departments
  /** What was bought, line by line (optional; typed by the salesperson). */
  lines?: PurchaseLine[];
  bookingStatus: BookingStatus;
  source: LeadSource;
  notes: string;
  createdAt: string;
  deliveredAt?: string; // set when the work is finished and handed over
  /** The visit this purchase was made in, when it was recorded with the visit. */
  visitId?: string;
}

export type TimelineEventType =
  | "created"
  | "visit"
  | "inquiry"
  | "call"
  | "note"
  | "status_change"
  | "followup_created"
  | "followup_result"
  | "agent_reassigned"
  | "branch_transferred"
  | "booking_created"
  | "review_requested"
  | "review_received"
  | "admin_action";

export interface TimelineEvent {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  leadId: string;
  timestamp: string;
  authorId: string;
  authorName: string;
  type: TimelineEventType;
  title: string;
  details: string;
  /** Copied from the customer so the security rules can scope history without reading the customer. */
  branchId?: string;
  leadOwnerId?: string;
}

export interface AuditLog {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export interface DistributionRule {
  autoDistribute: boolean;
  method: "round_robin" | "load_balanced" | "manual";
  maxLeadsPerAgentDay: number;
}

export interface PurchaseCategory {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

/** One thing a customer bought, typed by hand (products are not registered in the system). */
export interface PurchaseLine {
  name: string;
  /** Price of one piece, when the salesperson typed it. */
  price?: number;
  qty?: number;
  /** price x qty when both are given, otherwise the amount typed directly. */
  total: number;
}

export interface InvoiceLineItem {
  categoryId: string;
  categoryName: string;
  amount: number;
}

export interface PurchaseInvoice {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  invoiceNumber: string;
  date: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  companyId?: string;
  companyName?: string;
  branchId: string;
  branchName?: string;
  agentId: string;
  agentName?: string;
  brokerId?: string;
  brokerName?: string;
  items: InvoiceLineItem[];
  totalAmount: number;
  status: "recorded" | "draft" | "paid" | "partial" | "cancelled"; // payment states are legacy
  notes?: string;
  createdAt: string;
}

export interface BrokerEntity {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  name: string;
  type: "individual" | "company" | "engineering_company" | "contractor";
  phone: string;
  whatsappPhone?: string;
  isSameWhatsApp?: boolean;
  email?: string;
  address?: string;
  totalReferrals: number;
  totalVolume: number;
  active: boolean;
  notes?: string;
  /** Branches that registered or work with this broker; staff see the brokers of their own branch. */
  branchIds?: string[];
}

export interface NotificationItem {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  title: string;
  message: string;
  type: "visit" | "booking" | "followup" | "system";
  targetRole?: UserRole;
  targetUserId?: string;
  targetBranchId?: string;
  dueDate: string;
  read: boolean;
  createdAt: string;
  linkTab?: string;
  leadId?: string;
}

export interface NotBoughtRecord {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  /** The visit after which the customer had not bought yet. */
  visitId?: string;
  leadId: string;
  leadName: string;
  branchId: string;
  agentId: string;
  agentName?: string;
  createdAt: string;
  reasons: (
    | "price"
    | "comparing"
    | "competitor"
    | "unavailable"
    | "postponed"
    | "needs_approval"
    | "service"
    | "just_asking"
    | "other"
    | "unknown"
  )[];
  otherText?: string;
  note?: string;
}

// ---------- Customer reviews (a unique link per customer per visit/booking) ----------
export type ReviewStatus = "sent" | "answered" | "cancelled";

export interface ReviewAnalysis {
  kind: "complaint" | "note" | "praise";
  category?: string; // e.g. جودة، تأخير، تعامل، سعر
  severity?: "low" | "medium" | "high";
  summary?: string;
}

export interface ReviewRequest {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  /** The document id IS the secret token in the customer's link. */
  id: string;
  leadId: string;
  leadName: string;
  branchId: string;
  branchName?: string;
  agentId: string;
  agentName?: string;
  /** Who was asked: the customer (default) or a broker; a broker's request is kept on the broker, not on any customer. */
  partyKind?: "client" | "broker";
  brokerId?: string;
  subjectKind: "visit" | "booking" | "general";
  subjectId?: string;
  subjectLabel: string; // shown to the customer, e.g. "زيارة فرع الإسكندرية يوم 12 أكتوبر"
  sentAt: string; // ISO
  status: ReviewStatus;
  /** The single 48h nudge: when the salesperson sent it. */
  reminderSentAt?: string;
  cancelReason?: string;
  cancelledAt?: string;
  // Filled by the customer from the public page.
  answeredAt?: string;
  isComplaint?: boolean;
  response?: {
    rating: number; // 1-5 overall
    treatment?: number;
    price?: number;
    quality?: number;
    wouldRecommend?: boolean;
    comment?: string;
    /** Someone the customer recommends us to, left on the public review page. */
    referral?: { name: string; phone: string };
  };
  /** The customer record made (or found) from the referral. */
  referralLeadId?: string;
  ai?: ReviewAnalysis;
}

/** Managers can only add follow-up notes to a complaint; nothing is ever edited or deleted. */
export interface ReviewNote {
  /** Sample data loaded from Settings; it can be removed again without touching real records. */
  isDemo?: boolean;
  id: string;
  requestId: string;
  branchId?: string;
  agentId?: string;
  text: string;
  kind: "note" | "resolved";
  byId: string;
  byName: string;
  at: string;
}

/** A reminder task the salesperson marked as done (for example "send the review request"). */
export interface ReminderDone {
  isDemo?: boolean;
  /** Same as the task key, so a task can only be done once. */
  id: string;
  branchId: string;
  agentId: string;
  agentName?: string;
  doneAt: string;
}

/**
 * A follow-up Zaki noticed nobody scheduled (for example "the customer said he will build a villa next month").
 * "checked" is only a marker that the data was already reviewed with nothing to suggest, so it is not read again.
 */
export interface AiSuggestion {
  isDemo?: boolean;
  id: string;
  status: "pending" | "accepted" | "rejected" | "checked";
  partyKind: "client" | "broker";
  leadId?: string;
  brokerId?: string;
  /** Customer or broker name. */
  name: string;
  branchId: string;
  agentId: string;
  agentName?: string;
  createdAt: string;
  /** YYYY-MM-DD it was made: the daily limit counts these. */
  dayKey: string;
  /** What was reviewed, so the same data is not reviewed twice. */
  fingerprint: string;
  // The proposal.
  proposedDate?: string;
  reason?: string;
  evidence?: string;
  source?: string;
  confidence?: number;
  /** The facts Zaki was given, as plain lines, so the salesperson can see the whole picture before deciding. */
  snapshot?: string[];
  // The decision.
  decidedAt?: string;
  decidedById?: string;
  decidedByName?: string;
  rejectReason?: string;
  finalDate?: string;
  finalReason?: string;
  edited?: boolean;
  followUpId?: string;
}

/** A monthly sales target for one employee. One row per employee per month (the id says so), so a target can never be doubled. */
export interface EmployeeTarget {
  isDemo?: boolean;
  /** `tgt-<userId>-<YYYY-MM>` */
  id: string;
  userId: string;
  userName: string;
  /** The employee's branch when the target was set: the security rules scope rows by it. */
  branchId: string;
  /** YYYY-MM */
  month: string;
  /** Target in EGP. */
  amount: number;
  note?: string;
  setById: string;
  setByName: string;
  createdAt: string;
  updatedAt: string;
  /** Every change to the amount, newest last. */
  history?: { at: string; byId: string; byName: string; from: number; to: number }[];
}

/** How achievement is judged. Stored in settings/targets and editable by whoever may manage targets. */
export interface TargetSettings {
  /** Percent of the target: below "behind" is behind, from "onTrack" is on track, from "achieved" is achieved. */
  behindBelow: number;
  achievedFrom: number;
  /** Departments whose purchases count toward a target. Empty means all of them. */
  departments: Department[];
  /** Used for an employee that has no row for the month (0 = no default, they simply have no target). */
  defaultAmount: number;
  /** Compare against the share of the month already passed instead of the whole target. */
  paceAware: boolean;
}

/** A Telegram group the team uses: kept as a directory so everyone finds the right group and link in one place. */
export interface TelegramGroup {
  isDemo?: boolean;
  id: string;
  name: string;
  /** A checked Telegram link; may be empty when the group is linked to its chat through the bot. */
  link: string;
  /** The Telegram chat the CRM bot mirrors for this group (set when a manager links it). */
  chatId?: string;
  chatTitle?: string;
  description?: string;
  /** The branch it is for; missing means the whole company. */
  branchId?: string;
  active: boolean;
  createdAt: string;
  createdById: string;
  createdByName: string;
  updatedAt?: string;
}

export type AccountEntryType = "income" | "expense";
export type AccountEntryStatus = "posted" | "void";

/**
 * One financial transaction. Entries are never edited or deleted: a mistake is voided (kept, with who and why)
 * and the corrected entry points back to it through `replacesId`, so every balance can be traced.
 */
export interface AccountEntry {
  isDemo?: boolean;
  id: string;
  /** YYYY-MM-DD */
  date: string;
  type: AccountEntryType;
  /** Always positive; the type gives it its sign. */
  amount: number;
  accountId: string;
  categoryId: string;
  description: string;
  /** The employee responsible (who collected it, who spent it), when it applies. */
  employeeId?: string;
  employeeName?: string;
  branchId?: string;
  /** A purchase (booking) this receipt is for, kept only as a reference. */
  bookingId?: string;
  reference?: string;
  status: AccountEntryStatus;
  replacesId?: string;
  createdAt: string;
  createdById: string;
  createdByName: string;
  voidedAt?: string;
  voidedById?: string;
  voidedByName?: string;
  voidReason?: string;
}

export interface AccountDef {
  id: string;
  name: string;
  openingBalance: number;
  active: boolean;
}
export interface AccountCategoryDef {
  id: string;
  name: string;
  type: AccountEntryType;
  active: boolean;
}
export interface AccountingSettings {
  accounts: AccountDef[];
  categories: AccountCategoryDef[];
}

/** An uploaded sales statement (بيان بيع): the file's details and totals. The rows live in salesStatementRows/{id}. */
export interface SalesStatement {
  id: string;
  title: string;
  fileName: string;
  sheetName: string;
  branchId: string;
  branchName?: string;
  /** The month it covers (YYYY-MM), when given. */
  month?: string;
  note?: string;
  headers: string[];
  rowCount: number;
  totals: { column: string; sum: number }[];
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}

export interface SalesStatementRows {
  id: string;
  branchId: string;
  uploadedById: string;
  /** The rows as JSON (string[][]): Firestore cannot store a list of lists. */
  rowsJson: string;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "lost";

/** A price quote (عرض سعر / بيان بيع) a salesperson prepares for one of their customers. */
export interface Quote {
  isDemo?: boolean;
  id: string;
  /** Printed number, for example Q-261029-01. */
  number: string;
  /** YYYY-MM-DD */
  date: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  /** Who it is addressed to on the paper (the customer's name or company). */
  addressedTo: string;
  branchId: string;
  agentId: string;
  agentName?: string;
  /** Typed by hand, same shape as a purchase so accepting a quote carries its lines into the sale as they are. */
  lines: PurchaseLine[];
  total: number;
  /** The bullet notes printed under the table. */
  terms: string[];
  status: QuoteStatus;
  sentAt?: string;
  /** The follow-up scheduled for this quote (by the system, or the salesperson's own). */
  followUpId?: string;
  /** The sale it became. */
  bookingId?: string;
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
}
