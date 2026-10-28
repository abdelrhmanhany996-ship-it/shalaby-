import type {
  User,
  UserRole,
  Branch,
  Team,
  Lead,
  Visit,
  FollowUp,
  Booking,
  PurchaseInvoice,
} from "../types/crm";
import { hasPermission as has, isDirector, isSalesCapable, positionRoles } from "./permissions";
export { isSalesCapable };
export const isGlobalManager = isDirector;
export const isExecutive = (u: User) =>
  isDirector(u) || ["regional_manager", "supervisor"].includes(u.role);
export const isFieldManager = (u: User) => u.role === "branch_manager";
export const isSales = (u: User) =>
  ["sales_agent", "team_leader"].includes(u.role);
/** People who can own customers at a branch: its salespeople and sales manager, and the general sales manager. */
export const branchAgents = (users: User[], branchId: string) =>
  users.filter(
    (u) =>
      u.active &&
      ((u.branchId === branchId && ["sales_agent", "team_leader", "branch_manager"].includes(u.role)) ||
        u.role === "regional_manager"),
  );
/** Who a new customer goes to by default: the person registering them if they sell there, else the branch's sales manager. */
export const defaultAgent = (users: User[], me: User, branchId: string) => {
  const here = branchAgents(users, branchId);
  if (here.some((u) => u.id === me.id)) return me.id;
  return (here.find((u) => u.role === "branch_manager") ?? here.find((u) => u.role === "sales_agent") ?? here[0])?.id ?? me.id;
};
/** Works their own customers day to day: salespeople and the branch sales manager (who is the branch's salesperson). */
export const worksOwnCustomers = (u: User) => isSales(u) || u.role === "branch_manager";
export const canCreateCustomer = (u: User) => has(u, "customers.create");
export const canManageOrganization = (u: User) => has(u, "organization.manage");
export const canManageCatalog = (u: User) => has(u, "catalog.manage");
// The general sales manager always runs the people side (edit anyone below the owner, reset passwords), whatever the matrix says.
export const canManageStaff = (u: User) => has(u, "staff.manage") || u.role === "regional_manager";
export const canManageTeams = (u: User) => has(u, "teams.manage");
export const canAssignCustomers = (u: User) => has(u, "customers.assign");
export const canSeeBranch = (u: User, id: string, branches: Branch[]) => {
  if (!branches.some((b) => b.id === id)) return false;
  if (isGlobalManager(u)) return true;
  // The general sales manager covers every branch, including ones added after the account was made.
  if (u.role === "regional_manager") return true;
  if (u.role === "supervisor")
    return u.supervisedBranchIds?.length
      ? u.supervisedBranchIds.includes(id)
      : !!u.branchId && id === u.branchId;
  return !!u.branchId && id === u.branchId;
};
export function visibleStaff(
  user: User,
  users: User[],
  branches: Branch[],
  teams: Team[],
) {
  return users
    .filter((u) => u.role !== "admin" || user.role === "admin") // developers are invisible to everyone else
    .filter(
      (u) =>
        isGlobalManager(user) ||
        (has(user, "staff.view") &&
          !!u.branchId &&
          canSeeBranch(user, u.branchId, branches)) ||
        u.id === user.id,
    )
    .map((u) => ({ ...u, permissions: undefined }));
}
export function visibleLeads(
  user: User,
  leads: Lead[],
  branches: Branch[],
  users: User[],
  teams: Team[],
  followUps: FollowUp[],
) {
  if (!has(user, "customers.view")) return [];
  const delegated = new Set(
    followUps
      .filter(
        (f) =>
          f.assignedAgentId === user.id &&
          !["completed", "cancelled"].includes(f.status),
      )
      .map((f) => f.leadId),
  );
  return leads.filter(
    (l) =>
      canSeeBranch(user, l.branchId, branches) &&
      (!isSales(user) || l.assignedAgentId === user.id || delegated.has(l.id)),
  );
}
export function visibleFollowUps(
  user: User,
  rows: FollowUp[],
  branches: Branch[],
  users: User[],
  teams: Team[],
) {
  return has(user, "followups.view")
    ? rows.filter(
        (f) =>
          canSeeBranch(user, f.branchId, branches) &&
          (!isSales(user) || f.assignedAgentId === user.id),
      )
    : [];
}
export function visibleBookings(
  user: User,
  rows: Booking[],
  branches: Branch[],
  users: User[],
  teams: Team[],
) {
  return has(user, "bookings.view")
    ? rows.filter(
        (b) =>
          canSeeBranch(user, b.branchId, branches) &&
          (!isSales(user) || b.agentId === user.id),
      )
    : [];
}
export function visibleInvoices(
  user: User,
  rows: PurchaseInvoice[],
  branches: Branch[],
  users: User[],
  teams: Team[],
) {
  return has(user, "invoices.view")
    ? rows.filter(
        (i) =>
          canSeeBranch(user, i.branchId, branches) &&
          (!isSales(user) || i.agentId === user.id),
      )
    : [];
}
export function visibleVisits(
  user: User,
  rows: Visit[],
  branches: Branch[],
  users: User[],
  teams: Team[],
) {
  return has(user, "visits.view")
    ? rows.filter(
        (v) =>
          canSeeBranch(user, v.branchId, branches) &&
          (!isSales(user) || v.receivedByAgentId === user.id),
      )
    : [];
}
export const canEditCustomer = (u: User, l: Lead) =>
  has(u, "customers.edit") && (!isSales(u) || l.assignedAgentId === u.id);
export const canContactCustomer = (u: User, l: Lead, tasks: FollowUp[]) =>
  has(u, "customers.contact") &&
  (l.assignedAgentId === u.id ||
    tasks.some(
      (f) =>
        f.leadId === l.id &&
        f.assignedAgentId === u.id &&
        !["completed", "cancelled"].includes(f.status),
    ));
/** Anyone who may edit a customer may ask them for a review (the workspace enforces the same). */
export const canRequestReview = (u: User, l: Lead) => canEditCustomer(u, l);
export const canScheduleFollowUp = (u: User, l: Lead) =>
  has(u, "followups.create") && (!isSales(u) || l.assignedAgentId === u.id);
export const canCompleteFollowUp = (u: User, f: FollowUp) =>
  has(u, "followups.complete") &&
  f.assignedAgentId === u.id &&
  !["completed", "cancelled"].includes(f.status);
/** Who a person may ADD: the developer everyone, the owner the sales side, a branch manager their own salespeople. */
export const assignableRoles = (u: User): UserRole[] =>
  !canManageStaff(u)
    ? []
    : u.role === "admin"
      ? (["general_manager", "regional_manager", "branch_manager", "sales_agent", "admin"] as UserRole[])
      : isDirector(u)
        ? ["regional_manager", "branch_manager", "sales_agent"]
        : u.role === "regional_manager"
          ? [] // the owner adds the sales managers; the general sales manager edits and supports them
          : ["sales_agent"]; // a branch manager's own salespeople
/** Roles whose accounts a person may change (data, password, on/off). Older roles stay editable until they are gone. */
export const editableRoles = (u: User): UserRole[] => {
  if (!canManageStaff(u)) return [];
  const old: UserRole[] = ["supervisor", "team_leader"];
  if (u.role === "admin") return ["general_manager", "regional_manager", "branch_manager", "sales_agent", "admin", ...old];
  if (isDirector(u)) return ["regional_manager", "branch_manager", "sales_agent", ...old];
  if (u.role === "regional_manager") return ["branch_manager", "sales_agent", ...old];
  return ["sales_agent", ...old];
};
/** The roles an existing account may be switched to by this person. */
export const grantableOnEdit = (u: User): UserRole[] =>
  u.role === "regional_manager" ? ["branch_manager", "sales_agent"] : assignableRoles(u);
export const canEditStaff = (actor: User, target: User, branches: Branch[]) =>
  canManageStaff(actor) &&
  actor.id !== target.id &&
  editableRoles(actor).includes(target.role) &&
  (isGlobalManager(actor) ||
    actor.role === "regional_manager" ||
    (!!target.branchId && canSeeBranch(actor, target.branchId, branches)));
export function canAccessPage(u: User, page: string) {
  if (["dashboard", "analytics_dashboard", "settings"].includes(page))
    return true;
  if (page === "permissions") return isDirector(u);
  if (page === "developer") return u.role === "admin";
  // The top-customers board compares people and branches: it is for management, not for each salesperson.
  if (page === "overview")
    return !isSales(u) && has(u, "bookings.view") && has(u, "customers.view");
  const key: Record<string, Parameters<typeof has>[1]> = {
    clients: "customers.view",
    feedback: "customers.view",
    add_client: "customers.create",
    record_visit: "customers.create",
    visits: "visits.view",
    followups: "followups.view",
    due_followups: "followups.view",
    overdue_followups: "followups.view",
    bookings: "bookings.view",
    invoices: "invoices.view",
    reports: "reports.view",
    users: "staff.view",
    teams: "teams.view",
    branches: "branches.view",
    dept_dashboard: "branches.view",
    brokers: "brokers.view",
    audit: "audit.view",
  };
  return !!key[page] && has(u, key[page]);
}
export function scopeLabel(u: User) {
  if (isGlobalManager(u)) return "جميع الفروع";
  if (u.role === "regional_manager") return "جميع الفروع";
  if (u.role === "supervisor")
    return u.supervisedBranchIds?.length
      ? `${u.supervisedBranchIds.length} فرع ضمن الإشراف`
      : u.branchName || "لم يُحدد نطاق الإشراف";
  return u.branchName || "لم يُحدد فرع";
}
