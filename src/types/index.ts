export type Role = 'Super Admin' | 'Manager' | 'Team Leader' | 'User';

export type UserStatus = 'Active' | 'Inactive' | 'Archived' | 'On Leave';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  jobTitle?: string; // الوظيفة / المسمى الوظيفي
  teamId: string;
  teamName: string;
  assignedToolIds?: string[];
  status: UserStatus;
  lastLogin?: string;
  activeStatus?: 'online' | 'offline';
}

export interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  toolCount: number;
  monthlyCost: number;
  monthlyBudget: number;
  color: string;
  leaderId?: string;
  leaderName?: string;
  targetRole?: string;
  assignedUserIds?: string[];
  selectedToolId?: string;
  selectedToolName?: string;
  selectedSubscriptionId?: string;
  selectedAccountEmail?: string;
}

export type AiCategory = 'Chat & Writing' | 'Coding' | 'Image & Video' | 'Workflow & Agents' | 'Search & Knowledge';

export interface AiTool {
  id: string;
  name: string;
  provider: string;
  category: AiCategory;
  logo: string;
  badgeColor: string;
  description: string;
  subscriptionsCount: number;
  usersCount: number;
  monthlySpending: number;
  websiteUrl?: string;
}

export type BillingCycle = 'Monthly' | 'Yearly';

export type SubscriptionStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Archived';

export interface ReminderConfig {
  d30: boolean;
  d14: boolean;
  d7: boolean;
  d2: boolean;
  d1: boolean;
}

export interface Subscription {
  id: string;
  toolId: string;
  toolName: string;
  provider: string;
  planName: string;
  licenseCode?: string; // كود التفعيل / الترخيص (Promotional/License Key)
  purchasedSeats?: number;
  assignedSeats?: number;
  activeSeats?: number;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  teamId: string;
  teamName: string;
  assignedUserIds: string[];
  startDate: string;
  renewalDate: string;
  paymentMethod: string;
  paymentUrl?: string;
  autoRenewal: boolean;
  status: SubscriptionStatus;
  reminders: ReminderConfig;
  notes?: string;
  planType?: 'Individual' | 'Team' | 'Family' | 'Enterprise';
}

// 1. USAGE TRACKING
export interface UsageRecord {
  id: string;
  subscriptionId: string;
  toolName: string;
  userId: string;
  userName: string;
  teamName: string;
  lastActivity: string;
  activeDaysLast30Days: number;
  promptsCount: number;
  status: 'active' | 'low_usage' | 'inactive';
  costPerActiveUser: number;
  dataType: 'real' | 'imported' | 'manual' | 'estimated';
}

// 2. LICENSE OPTIMIZATION
export interface LicenseOptimization {
  id: string;
  subscriptionId: string;
  toolName: string;
  type: 'unused_seats' | 'inactive_user' | 'duplicate_tool' | 'plan_downgrade';
  severity: 'high' | 'medium' | 'low';
  title: string;
  recommendation: string;
  reason: string;
  potentialSavingsMonthly: number;
  affectedCount: number;
  status: 'pending' | 'applied' | 'dismissed';
}

// 3. BUDGET & EXPENSES
export interface BudgetEntry {
  id: string;
  entityType: 'org' | 'team' | 'project';
  entityId: string;
  entityName: string;
  monthlyBudget: number;
  yearlyBudget: number;
  spentMonthly: number;
  taxAmount: number;
  alertThresholdPercent: number; // e.g., 75, 90, 100
  status: 'normal' | 'warning' | 'exceeded';
}

// 4. APPROVAL WORKFLOW
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export interface ApprovalStep {
  role: 'User' | 'Team Leader' | 'Manager' | 'Finance' | 'Super Admin';
  approverName?: string;
  status: ApprovalStatus;
  comment?: string;
  date?: string;
}

export interface ApprovalRequest {
  id: string;
  toolName: string;
  planName: string;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  requesterId: string;
  requesterName: string;
  teamId: string;
  teamName: string;
  reason: string;
  businessPurpose: string;
  requiredPeriod: string;
  licenseCodeRequested?: boolean;
  status: ApprovalStatus;
  currentStepRole: string;
  chain: ApprovalStep[];
  createdAt: string;
}

// 5. INVOICE & DOCUMENT MANAGEMENT
export interface DocumentItem {
  id: string;
  title: string;
  type: 'invoice' | 'receipt' | 'contract' | 'license_agreement' | 'payment_proof' | 'tax_doc';
  subscriptionId?: string;
  toolName?: string;
  fileName: string;
  fileSize: string;
  amount?: number;
  currency?: string;
  invoiceNumber?: string;
  uploadDate: string;
  dueDate?: string;
  expirationDate?: string;
  status: 'active' | 'expiring_soon' | 'expired';
}

// 6. AUDIT LOG & SECURITY
export interface AuditLogItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: string;
  resource: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  ipAddress: string;
  device: string;
  status: 'success' | 'failed' | 'warning';
}

export interface SecuritySession {
  id: string;
  userId: string;
  userName: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

// 7. AUTOMATION CENTER
export interface AutomationRule {
  id: string;
  name: string;
  whenTrigger: string;
  ifCondition: string;
  thenAction: string;
  enabled: boolean;
  lastExecuted?: string;
  triggerCount: number;
}

// AI CHATBOT
export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  insights?: string[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'add' | 'assign' | 'renew' | 'edit' | 'archive' | 'user' | 'approval' | 'budget';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'warning' | 'info' | 'success' | 'alert';
  subscriptionId?: string;
}

export type NavTab = 
  | 'dashboard' 
  | 'subscriptions' 
  | 'accounts'
  | 'users' 
  | 'teams' 
  | 'ai-tools' 
  | 'archive'
  | 'usage-tracking'
  | 'approvals'
  | 'audit-security'
  | 'automation'
  | 'ai-assistant'
  | 'expenses'
  | 'wallet'
  | 'google-codes'
  | 'renewals'
  | 'notifications'
  | 'settings';

// Subscription wallet: money put in (deposit) and money taken out by subscriptions (charge)
export interface WalletEntry {
  id: string;
  type: 'deposit' | 'charge' | 'adjust';
  amount: number;          // in the entry's own currency (negative for an adjustment that lowers the balance)
  currency: string;        // 'ج.م' | '$' | 'EUR' | 'SAR'
  amountEgp: number;       // converted at the rate of that day, used for the balance (signed for 'adjust')
  rate: number;            // EGP per 1 unit of currency at the time (1 for EGP)
  note: string;
  date: string;            // YYYY-MM-DD
  subscriptionId?: string;
  createdBy?: string;
  createdAt: string;
}

// A batch of Google AI codes bought together (same plan and price)
export interface GoogleCode {
  code: string;
  used: boolean;
  usedBy?: string;
}

export interface GoogleCodeBatch {
  id: string;
  plan: 'pro' | 'plus';    // pro = Google AI Pro (regular), plus = Google AI Plus
  unitPrice: number;
  currency: string;
  quantity: number;
  codes: GoogleCode[];     // may be empty when the codes themselves weren't entered
  supplier?: string;       // who the codes were bought from (older purchases have none)
  date: string;
  note: string;
  walletEntryId?: string;  // the wallet charge for this purchase, kept in sync when the batch is edited
  createdBy?: string;
  createdAt: string;
}

// EGP value of 1 unit of each foreign currency
export interface ExchangeRates {
  USD: number;
  EUR: number;
  SAR: number;
  updatedAt: string;
}

export type Language = 'ar' | 'en';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}
