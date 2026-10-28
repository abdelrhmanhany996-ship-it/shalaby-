import type { Branch, User } from "../types/crm";

/** The current plan allows this many branches. Raising it is a commercial decision made by the developer. */
export const DEFAULT_MAX_BRANCHES = 2;

/** Sign-in accounts for the company's own people. The developer account is not counted. */
export const DEFAULT_MAX_USERS = 10;

export const DEFAULT_AI_PER_HOUR = 120;
export const DEFAULT_AI_PER_DAY = 600;
export const DEFAULT_SUGGESTIONS_PER_DAY = 10;

export interface License {
  maxBranches: number;
  maxUsers?: number;
  /** Zaki / AI requests allowed per account; enforced by the server (api/ai.php). */
  aiPerHour?: number;
  aiPerDay?: number;
  /** Follow-up suggestions Zaki may make to each salesperson per day. */
  suggestionsPerDay?: number;
}
export const defaultLicense: License = { maxBranches: DEFAULT_MAX_BRANCHES, maxUsers: DEFAULT_MAX_USERS, aiPerHour: DEFAULT_AI_PER_HOUR, aiPerDay: DEFAULT_AI_PER_DAY, suggestionsPerDay: DEFAULT_SUGGESTIONS_PER_DAY };

export interface BranchQuota {
  max: number;
  used: number;
  left: number;
  full: boolean;
}

/** Sample branches never count: they come and go with the sample data. */
export function branchQuota(branches: Pick<Branch, "active" | "isDemo">[], license: License = defaultLicense): BranchQuota {
  const max = Math.max(0, Math.floor(Number(license.maxBranches)) || 0);
  const used = branches.filter((b) => !b.isDemo && b.active !== false).length;
  return { max, used, left: Math.max(0, max - used), full: used >= max };
}

export const branchLimitMessage = (q: BranchQuota) =>
  `الباقة الحالية للشركة بتسمح بـ ${q.max === 1 ? "فرع واحد" : q.max === 2 ? "فرعين" : `${q.max} فروع`} فقط. للتوسعة كلّم المطوّر.`;

export interface UserQuota {
  max: number;
  used: number;
  left: number;
  full: boolean;
}

/** Developer accounts, sample users and stopped users do not count. Older license documents have no maxUsers, so the default applies. */
export function userQuota(users: Pick<User, "role" | "active" | "isDemo">[], license: License = defaultLicense): UserQuota {
  const max = Math.max(0, Math.floor(Number(license.maxUsers ?? DEFAULT_MAX_USERS)) || 0);
  const used = users.filter((u) => u.role !== "admin" && !u.isDemo && u.active !== false).length;
  return { max, used, left: Math.max(0, max - used), full: used >= max };
}

export const userLimitMessage = (q: UserQuota) =>
  `الباقة الحالية للشركة بتسمح بـ ${q.max} مستخدم فقط. للتوسعة كلّم المطوّر.`;
