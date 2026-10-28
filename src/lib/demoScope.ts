import type {
  AuditLog, Booking, BrokerEntity, Branch, Company, DepartmentEntity, FollowUp, JobPosition, Lead, NotBoughtRecord,
  NotificationItem, PurchaseInvoice, ReviewNote, ReviewRequest, Team, TimelineEvent, User, Visit, Warehouse,
} from "../types/crm";

export interface DemoWorld {
  users: User[];
  companies: Company[];
  warehouses: Warehouse[];
  branches: Branch[];
  teams: Team[];
  departmentEntities: DepartmentEntity[];
  jobPositions: JobPosition[];
  leads: Lead[];
  visits: Visit[];
  followUps: FollowUp[];
  bookings: Booking[];
  timelineEvents: TimelineEvent[];
  purchaseInvoices: PurchaseInvoice[];
  brokers: BrokerEntity[];
  notBoughtRecords: NotBoughtRecord[];
  reviewRequests: ReviewRequest[];
  reviewNotes: ReviewNote[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}

export type CollectionName = keyof DemoWorld;
/** Ids that older versions loaded without a flag, per collection. */
export type KnownDemoIds = Partial<Record<CollectionName, Set<string>>>;

export interface DemoPlan {
  drop: Record<CollectionName, Set<string>>;
  /** Real customers still pointing at a sample branch or sample employee, which stay as they are. */
  realLinked: number;
  total: number;
}

/**
 * What "remove the sample data" deletes: everything flagged as sample, anything an older version loaded
 * (by id), and everything recorded against a sample customer (visits, purchases, history, reviews).
 * Real records are never matched by branch or employee, so they cannot be removed by mistake.
 */
export function planDemoRemoval(w: DemoWorld, known: KnownDemoIds, keepUserId?: string): DemoPlan {
  const isDemo = (c: CollectionName, x: { id: string; isDemo?: boolean }) => !!x.isDemo || !!known[c]?.has(x.id);
  const drop = Object.fromEntries((Object.keys(w) as CollectionName[]).map((k) => [k, new Set<string>()])) as DemoPlan["drop"];
  const mark = (c: CollectionName) => (x: { id: string }) => drop[c].add(x.id);

  w.users.filter((u) => isDemo("users", u) && u.id !== keepUserId && !u.authUid).forEach(mark("users"));
  (["companies", "warehouses", "branches", "teams", "departmentEntities", "jobPositions", "brokers"] as const).forEach((c) =>
    (w[c] as { id: string; isDemo?: boolean }[]).filter((x) => isDemo(c, x)).forEach(mark(c)),
  );
  w.leads.filter((l) => isDemo("leads", l)).forEach(mark("leads"));

  const lead = drop.leads;
  const onDemoLead = (id?: string) => !!id && lead.has(id);
  w.visits.filter((v) => isDemo("visits", v) || onDemoLead(v.linkedLeadId)).forEach(mark("visits"));
  w.followUps.filter((f) => isDemo("followUps", f) || onDemoLead(f.leadId)).forEach(mark("followUps"));
  w.bookings.filter((b) => isDemo("bookings", b) || onDemoLead(b.leadId)).forEach(mark("bookings"));
  w.purchaseInvoices.filter((i) => isDemo("purchaseInvoices", i) || onDemoLead(i.leadId)).forEach(mark("purchaseInvoices"));
  w.notBoughtRecords.filter((r) => isDemo("notBoughtRecords", r) || onDemoLead(r.leadId)).forEach(mark("notBoughtRecords"));
  w.timelineEvents.filter((e) => isDemo("timelineEvents", e) || onDemoLead(e.leadId)).forEach(mark("timelineEvents"));
  w.reviewRequests.filter((r) => isDemo("reviewRequests", r) || onDemoLead(r.leadId)).forEach(mark("reviewRequests"));
  w.reviewNotes.filter((n) => n.isDemo || drop.reviewRequests.has(n.requestId)).forEach(mark("reviewNotes"));
  w.notifications.filter((n) => isDemo("notifications", n) || onDemoLead(n.leadId)).forEach(mark("notifications"));

  // The audit trail of the sample data goes with it: entries about removed records or written by sample staff.
  const gone = new Set([...Object.values(drop)].flatMap((s) => [...s]));
  w.auditLogs
    .filter((a) => a.isDemo || a.entityId === "demo" || gone.has(a.entityId) || drop.users.has(a.userId))
    .forEach(mark("auditLogs"));

  const realLinked = w.leads.filter(
    (l) => !drop.leads.has(l.id) && (drop.branches.has(l.branchId) || (!!l.assignedAgentId && drop.users.has(l.assignedAgentId))),
  ).length;
  const total = (Object.keys(drop) as CollectionName[]).filter((k) => k !== "auditLogs").reduce((n, k) => n + drop[k].size, 0);
  return { drop, realLinked, total };
}

/** Flags a sample list so it can be told apart from real records later. */
export const asDemo = <T extends object>(items: T[]): (T & { isDemo: true })[] => items.map((i) => ({ ...i, isDemo: true as const }));
