import type { Scope, ScopeFilter } from "./useFirestoreSync";

/** The server-trusted facts the security rules use (from authProfiles). */
export interface ScopeProfile {
  role: string;
  userId: string;
  branchId?: string;
  supervisedBranchIds?: string[];
}

const SALES = ["sales_agent", "team_leader"];
const chunks = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

/** Mirrors seesAll() in firestore.rules. The general sales manager covers every branch, including ones added later. */
export function seesAll(p: ScopeProfile): boolean {
  return ["admin", "general_manager"].includes(p.role) || p.role === "regional_manager";
}

/** Mirrors scopeBranches() in firestore.rules. */
export function scopeBranches(p: ScopeProfile): string[] {
  if (p.role === "supervisor" && p.supervisedBranchIds?.length) return p.supervisedBranchIds;
  return p.branchId ? [p.branchId] : [];
}

const isSales = (p: ScopeProfile) => SALES.includes(p.role);

/** Filters that pin a query to the person's branches (one query per 30 branches, Firestore's "in" limit). */
function branchFilters(p: ScopeProfile, field = "branchId"): ScopeFilter[] {
  const list = scopeBranches(p);
  return chunks(list, 30).map((part): ScopeFilter => (part.length === 1 ? [field, "==", part[0]] : [field, "in", part]));
}

/** Rows owned by a person (rowOk in the rules): their branches, and their own rows if they are in sales. */
export function rowScope(p: ScopeProfile, ownerField: string, extra: ScopeFilter[][] = []): Scope {
  if (seesAll(p)) return "all";
  const branches = branchFilters(p);
  if (!branches.length) return "none";
  if (!isSales(p)) return branches.map((b) => [b]);
  return [...branches.map((b): ScopeFilter[] => [b, [ownerField, "==", p.userId]]), ...extra.flatMap((e) => branches.map((b) => [b, ...e]))];
}

export function scopesFor(p: ScopeProfile | null) {
  if (!p) {
    const none: Scope = "none";
    return { leads: none, followUps: none, visits: none, bookings: none, invoices: none, notBought: none, reminderDone: none, aiSuggestions: none, reviews: none, reviewNotes: none, timeline: none, brokers: none, users: none, notifications: none, audit: none };
  }
  const all = seesAll(p);
  const branches = scopeBranches(p);
  const sales = isSales(p);
  return {
    leads: rowScope(p, "assignedAgentId", [[["delegatedTo", "array-contains", p.userId]]]),
    followUps: rowScope(p, "assignedAgentId"),
    visits: rowScope(p, "receivedByAgentId"),
    bookings: rowScope(p, "agentId"),
    invoices: rowScope(p, "agentId"),
    notBought: rowScope(p, "agentId"),
    reminderDone: rowScope(p, "agentId"),
    aiSuggestions: rowScope(p, "agentId"),
    reviews: rowScope(p, "agentId"),
    reviewNotes: rowScope(p, "agentId"),
    timeline: rowScope(p, "leadOwnerId", sales ? [[["authorId", "==", p.userId]]] : []),
    brokers: (all ? "all" : branches.length ? chunks(branches, 30).map((part) => [["branchIds", "array-contains-any", part] as ScopeFilter]) : "none") as Scope,
    users: (all ? "all" : [...branchFilters(p).map((b) => [b]), [["id", "==", p.userId] as ScopeFilter]]) as Scope,
    notifications: (["admin", "general_manager"].includes(p.role) ? "all" : [[["targetUserId", "==", p.userId]]]) as Scope,
    audit: (["admin", "general_manager"].includes(p.role) ? "all" : "none") as Scope,
  };
}
