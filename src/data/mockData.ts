import { 
  User, Team, AiTool, Subscription, ActivityLog, NotificationItem,
  UsageRecord, LicenseOptimization, BudgetEntry, ApprovalRequest,
  DocumentItem, AuditLogItem, AutomationRule, SecuritySession
} from '../types';

export const initialTeams: Team[] = [];

export const initialUsers: User[] = [
  {
    id: 'usr-admin',
    name: 'Abdelrahman Hany',
    email: 'abdelrhmanhany996@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    role: 'Super Admin',
    teamId: 'team-admin',
    teamName: 'Executive',
    assignedToolIds: [],
    status: 'Active',
    lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
    activeStatus: 'online'
  }
];

export const initialAiTools: AiTool[] = [];

export const initialSubscriptions: Subscription[] = [];

export const initialUsageRecords: UsageRecord[] = [];

export const initialOptimizations: LicenseOptimization[] = [];

export const initialBudgets: BudgetEntry[] = [];

export const initialApprovals: ApprovalRequest[] = [];

export const initialDocuments: DocumentItem[] = [];

export const initialAuditLogs: AuditLogItem[] = [];

export const initialSecuritySessions: SecuritySession[] = [];

export const initialAutomations: AutomationRule[] = [];

export const initialActivities: ActivityLog[] = [];

export const initialNotifications: NotificationItem[] = [];

export const monthlySpendingHistory: { month: string; spending: number }[] = [];
