import { branchLimitMessage, branchQuota, userLimitMessage, userQuota } from "./license";
import { hasPermission, isDirector, withPermissions } from "./permissions";
import type { CRMContextType } from "../context/CRMContext";
import type { Lead, User, UserRole } from "../types/crm";
import * as access from "./access";
import { isComplaint } from "./reviews";
import { ActionDenied } from "./actionDenied";

export function createWorkspace(raw: CRMContextType) {
  const actor = withPermissions(raw.effectiveUser, raw.permissionMatrix);
  const staff = access.visibleStaff(actor, raw.users, raw.branches, raw.teams);
  const leads = access.visibleLeads(
    actor,
    raw.leads,
    raw.branches,
    raw.users,
    raw.teams,
    raw.followUps,
  );
  const followUps = access.visibleFollowUps(
    actor,
    raw.followUps,
    raw.branches,
    raw.users,
    raw.teams,
  );
  const bookings = access.visibleBookings(
    actor,
    raw.bookings,
    raw.branches,
    raw.users,
    raw.teams,
  );
  const invoices = access.visibleInvoices(
    actor,
    raw.purchaseInvoices,
    raw.branches,
    raw.users,
    raw.teams,
  );
  const visits = access.visibleVisits(
    actor,
    raw.visits,
    raw.branches,
    raw.users,
    raw.teams,
  );
  const branches = raw.branches
    .filter((b) => access.canSeeBranch(actor, b.id, raw.branches))
    .map((b) => {
      const manager =
        raw.users.find(
          (u) =>
            u.active &&
            u.role === "branch_manager" &&
            u.branchId === b.id &&
            u.id === b.managerId,
        ) ||
        raw.users.find(
          (u) => u.active && u.role === "branch_manager" && u.branchId === b.id,
        );
      return { ...b, managerId: manager?.id, managerName: manager?.name };
    });
  const leadIds = new Set(leads.map((l) => l.id));
  const branchIds = new Set(branches.map((b) => b.id));
  const teams = hasPermission(actor, "teams.view")
    ? raw.teams.filter((t) => branchIds.has(t.branchId))
    : [];
  const companyIds = new Set(branches.map((b) => b.companyId));
  const governorateIds = new Set(branches.map((b) => b.governorateId));
  // A broker is visible when it belongs to a branch in the viewer's scope, or when it is tied to a customer, visit or invoice they can see.
  const visibleBrokerIds = new Set(
    [
      ...invoices.map((i) => i.brokerId),
      ...leads.map((l) => l.brokerId),
      ...visits.map((v) => v.brokerId),
    ].filter(Boolean),
  );
  const brokers = raw.brokers
    .filter(
      (b) =>
        access.isGlobalManager(actor) ||
        visibleBrokerIds.has(b.id) ||
        !!b.branchIds?.some((id) => branchIds.has(id)),
    )
    .map((b) =>
      access.isGlobalManager(actor)
        ? b
        : {
            ...b,
            totalReferrals: invoices.filter(
              (i) => i.brokerId === b.id && i.status !== "cancelled",
            ).length,
            totalVolume: invoices
              .filter(
                (i) =>
                  i.brokerId === b.id &&
                  !["cancelled", "draft"].includes(i.status),
              )
              .reduce((sum, i) => sum + i.totalAmount, 0),
          },
    );
  const invoiceCustomers = hasPermission(actor, "invoices.manage")
    ? raw.leads
        .filter(
          (l) =>
            branchIds.has(l.branchId) &&
            (!access.isSales(actor) || l.assignedAgentId === actor.id),
        )
        .map((l) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          branchId: l.branchId,
          branchName: l.branchName,
          assignedAgentId: l.assignedAgentId,
        }))
    : [];
  const invoiceAgents = hasPermission(actor, "invoices.manage")
    ? raw.users
        .filter(
          (u) =>
            !!u.branchId &&
            branchIds.has(u.branchId) &&
            (!access.isSales(actor) || u.id === actor.id),
        )
        .map((u) => ({
          id: u.id,
          name: u.name,
          branchId: u.branchId,
          branchName: u.branchName,
          active: u.active,
          role: u.role,
        }))
    : [];
  const pendingStaff = new Set<string>();
  const pendingCustomers = new Map<
    string,
    { branchId: string; assignedAgentId?: string }
  >();
  const deny = () => {
    throw new ActionDenied("الإجراء غير متاح لدورك أو خارج نطاق عملك.");
  };
  const require = (allowed: boolean) => {
    if (!allowed) deny();
  };
  const findLead = (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return deny();
    return lead;
  };
  const eligibleAgent = (id: string, branch: string) =>
    raw.users.some(
      (u) =>
        u.id === id &&
        u.active &&
        // The developer can do anything, including owning a customer in any branch.
        (u.role === "admin" ||
          (u.branchId === branch &&
          ["sales_agent", "team_leader", "supervisor", "branch_manager"].includes(
            u.role,
          )) ||
          // The general sales manager also sells, in any of the branches they oversee.
          u.role === "regional_manager"),
    );
  const requireCustomerWrite = (id: string) => {
    const lead = findLead(id);
    require(access.canEditCustomer(actor, lead));
    return lead;
  };
  const requireAssignment = (branch: string, agent: string) => {
    if (!branchIds.has(branch)) throw new ActionDenied("الفرع ده خارج نطاق عملك.");
    if (!eligibleAgent(agent, branch))
      throw new ActionDenied(
        "الموظف المختار مش تابع للفرع ده أو مش موظف مبيعات. لو الفرع مالوش مدير مبيعات، عيّنه الأول من صفحة الموظفين، وبعدها سجّل العميل باسمه.",
      );
    if (access.isSales(actor) && agent !== actor.id) throw new ActionDenied("السيلز يسجّل العميل باسمه هو بس.");
  };
  const validateStaff = (
    data: Partial<User>,
    changed: Partial<User> = data,
  ) => {
    require(
      isDirector(actor) ||
        (!("specialty" in changed) && !("supervisedBranchIds" in changed)),
    );
    require(
      !data.supervisedBranchIds ||
        data.supervisedBranchIds.every((id) => branchIds.has(id)),
    );
    require(
      !data.teamId ||
        raw.teams.some(
          (t) => t.id === data.teamId && t.branchId === data.branchId,
        ),
    );
    require(
      !data.jobPositionId ||
        raw.jobPositions.some(
          (p) =>
            p.id === data.jobPositionId && p.departmentId === data.departmentId,
        ),
    );
    require(
      !data.directManagerId ||
        staff.some(
          (u) =>
            u.id === data.directManagerId && u.active && !access.isSales(u),
        ),
    );
  };
  const validateTeam = (data: {
    branchId: string;
    memberIds: string[];
    leaderId?: string;
    supervisorId?: string;
  }) => {
    require(branchIds.has(data.branchId));
    require(
      [...data.memberIds, data.leaderId, data.supervisorId]
        .filter(Boolean)
        .every((id) =>
          raw.users.some(
            (u) => u.id === id && u.active && u.branchId === data.branchId,
          ),
        ),
    );
  };
  const visibleReviews = (raw.reviewRequests ?? []).filter(
    (r) =>
      leadIds.has(r.leadId) ||
      // a broker's request is not tied to a customer: it follows the branch (and the salesperson's own work)
      (r.partyKind === "broker" && branchIds.has(r.branchId) && (!access.isSales(actor) || r.agentId === actor.id)),
  );
  const visibleReviewIds = new Set(visibleReviews.map((r) => r.id));
  const view = {
    ...raw,
    effectiveUser: actor,
    invoiceCustomers,
    invoiceAgents,
    permissionMatrix: isDirector(actor) ? raw.permissionMatrix : undefined,
    updatePermissionMatrix: ((matrix) => {
      require(isDirector(actor));
      raw.updatePermissionMatrix(matrix);
    }) as CRMContextType["updatePermissionMatrix"],
    leads,
    followUps,
    bookings,
    visits,
    purchaseInvoices: invoices,
    users: staff,
    branches,
    teams,
    brokers,
    companies: raw.companies.filter(
      (c) => access.isGlobalManager(actor) || companyIds.has(c.id),
    ),
    governorates: raw.governorates.filter(
      (g) => access.isGlobalManager(actor) || governorateIds.has(g.id),
    ),
    warehouses: raw.warehouses.filter(
      (w) =>
        access.isGlobalManager(actor) ||
        (!!w.branchId
          ? branchIds.has(w.branchId)
          : governorateIds.has(w.governorateId)),
    ),
    timelineEvents: raw.timelineEvents.filter((e) => leadIds.has(e.leadId)),
    auditLogs: hasPermission(actor, "audit.view")
      ? raw.auditLogs.filter(
          (log) =>
            isDirector(actor) ||
            (access.isSales(actor)
              ? log.userId === actor.id
              : staff.some((u) => u.id === log.userId)),
        )
      : [],
    notifications: raw.notifications.filter(
      (n) =>
        (!n.targetUserId || n.targetUserId === actor.id) &&
        (!n.targetRole || n.targetRole === actor.role) &&
        (!n.targetBranchId || branchIds.has(n.targetBranchId)) &&
        (!n.leadId || leadIds.has(n.leadId)),
    ),
    // Preview is an explicit prototype feature for the original admin, separate from work data.
    previewUsers:
      raw.currentUser.role === "admin" || raw.currentUser.role === "general_manager"
        ? raw.users
            .filter((u) => u.active && (raw.currentUser.role === "admin" || (u.role !== "admin" && u.role !== "general_manager")))
            .map((u) => ({
              ...u,
              permissions: undefined,
            }))
        : [],
    addNotification: ((data) => {
      require(isDirector(actor));
      return raw.addNotification(data);
    }) as CRMContextType["addNotification"],
    markNotificationRead: ((id) => {
      require(
        raw.notifications.some(
          (n) => n.id === id && n.targetUserId === actor.id,
        ),
      );
      raw.markNotificationRead(id);
    }) as CRMContextType["markNotificationRead"],
    clearAllNotifications: (() => {
      raw.notifications
        .filter((n) => n.targetUserId === actor.id)
        .forEach((n) => raw.markNotificationRead(n.id));
    }) as CRMContextType["clearAllNotifications"],
    loadDemoData: (() => {
      require(raw.currentUser.role === "admin");
      return raw.loadDemoData();
    }) as CRMContextType["loadDemoData"],
    previewDemoRemoval: (() => {
      require(raw.currentUser.role === "admin");
      return raw.previewDemoRemoval();
    }) as CRMContextType["previewDemoRemoval"],
    removeDemoData: (() => {
      require(raw.currentUser.role === "admin");
      return raw.removeDemoData();
    }) as CRMContextType["removeDemoData"],
    createLoginForUser: ((id, loginId, password, info) => {
      const target = staff.find((u) => u.id === id);
      require(
        (!!target && access.canEditStaff(actor, target, raw.branches)) ||
          pendingStaff.has(id),
      );
      require(access.canManageStaff(actor));
      return raw.createLoginForUser(id, loginId, password, info);
    }) as CRMContextType["createLoginForUser"],
    setViewAsUser: ((user) => {
      const me = raw.currentUser.role;
      require(me === "admin" || me === "general_manager");
      if (!user) return raw.setViewAsUser(null);
      // A previewed role is a virtual user: nobody is impersonated, it only changes what the screen shows.
      if (user.id.startsWith("preview:")) {
        const roles: UserRole[] = ["general_manager", "regional_manager", "branch_manager", "supervisor", "sales_agent"];
        require(roles.includes(user.role) && (me === "admin" || user.role !== "general_manager"));
        require(!user.branchId || raw.branches.some((b) => b.id === user.branchId));
        return raw.setViewAsUser({ ...user, active: true, permissions: undefined });
      }
      const actual = raw.users.find((u) => u.id === user.id && u.active);
      if (!actual) return deny();
      require(me === "admin" || (actual.role !== "admin" && actual.role !== "general_manager"));
      raw.setViewAsUser({ ...actual, permissions: undefined });
    }) as CRMContextType["setViewAsUser"],
    addLead: ((data) => {
      if (!access.canCreateCustomer(actor)) throw new ActionDenied("حسابك مش مسموحله يضيف عملاء. راجع مديرك لو محتاج الصلاحية.");
      requireAssignment(data.branchId, data.assignedAgentId || "");
      const assigned = raw.users.find((u) => u.id === data.assignedAgentId)!;
      const lead = raw.addLead({ ...data, teamId: assigned.teamId });
      pendingCustomers.set(lead.id, lead);
      return lead;
    }) as CRMContextType["addLead"],
    updateLead: ((id, data) => {
      requireCustomerWrite(id);
      require(!("id" in data) && !("createdAt" in data));
      if ("assignedAgentId" in data || "branchId" in data || "teamId" in data) {
        require(access.canAssignCustomers(actor));
        requireAssignment(
          data.branchId || findLead(id).branchId,
          data.assignedAgentId || findLead(id).assignedAgentId || "",
        );
      }
      raw.updateLead(id, data);
    }) as CRMContextType["updateLead"],
    reassignLead: ((id, agent, branch, team) => {
      const lead = findLead(id);
      require(access.canAssignCustomers(actor));
      requireAssignment(branch || lead.branchId, agent);
      const assigned = raw.users.find((u) => u.id === agent)!;
      require(!team || team === assigned.teamId);
      raw.reassignLead(id, agent, branch, assigned.teamId);
    }) as CRMContextType["reassignLead"],
    deleteLead: ((id) => {
      deny();
    }) as CRMContextType["deleteLead"],
    addVisit: ((data) => {
      if (!access.canCreateCustomer(actor)) throw new ActionDenied("حسابك مش مسموحله يسجّل زيارات. راجع مديرك لو محتاج الصلاحية.");
      requireAssignment(data.branchId, data.receivedByAgentId);
      if (data.linkedLeadId)
        require(findLead(data.linkedLeadId).branchId === data.branchId);
      if (data.requiresFollowUp) {
        require(hasPermission(actor, "followups.create"));
        require(!!data.followUpDate);
        requireAssignment(
          data.branchId,
          data.followUpAgentId || data.receivedByAgentId,
        );
      }
      const accessibleMatch = data.linkedLeadId || data.visitorType === "broker"
        ? undefined
        : leads.find(
            (l) =>
              l.branchId === data.branchId &&
              l.phone.replace(/\D/g, "") === data.phone.replace(/\D/g, ""),
          );
      const visit = raw.addVisit({
        ...data,
        linkedLeadId: data.linkedLeadId || accessibleMatch?.id,
      });
      if (
        visit.linkedLeadId &&
        !raw.leads.some((l) => l.id === visit.linkedLeadId)
      )
        pendingCustomers.set(visit.linkedLeadId, {
          branchId: data.branchId,
          assignedAgentId: data.receivedByAgentId,
        });
      return visit;
    }) as CRMContextType["addVisit"],
    addFollowUp: ((data) => {
      const lead = findLead(data.leadId);
      require(access.canScheduleFollowUp(actor, lead));
      require(data.branchId === lead.branchId);
      requireAssignment(data.branchId, data.assignedAgentId);
      return raw.addFollowUp(data);
    }) as CRMContextType["addFollowUp"],
    updateFollowUpResult: ((id, ...args) => {
      const task = followUps.find((f) => f.id === id);
      require(!!task && access.canCompleteFollowUp(actor, task));
      raw.updateFollowUpResult(id, ...args);
    }) as CRMContextType["updateFollowUpResult"],
    addBooking: ((data) => {
      // A customer created a moment ago (by a visit or a registration) is not in the list yet.
      const lead = raw.leads.some((l) => l.id === data.leadId) ? findLead(data.leadId) : pendingCustomers.get(data.leadId);
      require(!!lead);
      require(
        hasPermission(actor, "bookings.create") &&
          (!access.isSales(actor) || lead!.assignedAgentId === actor.id),
      );
      require(data.branchId === lead!.branchId);
      requireAssignment(data.branchId, data.agentId);
      return raw.addBooking(data);
    }) as CRMContextType["addBooking"],
    notBoughtRecords: raw.notBoughtRecords.filter((r) => leadIds.has(r.leadId)),
    reviewRequests: visibleReviews,
    reviewNotes: (raw.reviewNotes ?? []).filter((n) => visibleReviewIds.has(n.requestId)),
    addReferralLead: ((input) => {
      const from = findLead(input.fromLeadId);
      require(access.canEditCustomer(actor, from) && access.canCreateCustomer(actor));
      require(!input.reviewId || visibleReviewIds.has(input.reviewId));
      requireAssignment(from.branchId, from.assignedAgentId || actor.id);
      const result = raw.addReferralLead(input);
      if (result.created) pendingCustomers.set(result.lead.id, result.lead);
      return result;
    }) as CRMContextType["addReferralLead"],
    requestReview: ((input) => {
      const lead = findLead(input.lead.id);
      require(access.canEditCustomer(actor, lead));
      return raw.requestReview({ ...input, lead });
    }) as CRMContextType["requestReview"],
    requestBrokerReview: ((input) => {
      require(access.canCreateCustomer(actor) && branchIds.has(input.branchId) && raw.brokers.some((b) => b.id === input.broker.id));
      return raw.requestBrokerReview({ ...input, broker: raw.brokers.find((b) => b.id === input.broker.id)! });
    }) as CRMContextType["requestBrokerReview"],
    saveSuggestions: ((items) => {
      require(items.every((i) => i.agentId === actor.id && branchIds.has(i.branchId) && (!i.leadId || leads.some((l) => l.id === i.leadId))));
      return raw.saveSuggestions(items);
    }) as CRMContextType["saveSuggestions"],
    decideSuggestion: ((id, decision) => {
      const s = raw.aiSuggestions.find((x) => x.id === id);
      require(!!s && s.agentId === actor.id && s.status === "pending");
      if (decision.accept) {
        require(hasPermission(actor, "followups.create"));
        if (s!.leadId) {
          const lead = findLead(s!.leadId);
          require(access.canScheduleFollowUp(actor, lead) && s!.branchId === lead.branchId);
        }
        requireAssignment(s!.branchId, s!.agentId);
        require(!!decision.date && !!decision.reason.trim());
      }
      raw.decideSuggestion(id, decision);
    }) as CRMContextType["decideSuggestion"],
    markReminderDone: ((taskId, branchId) => {
      require(branchIds.has(branchId));
      raw.markReminderDone(taskId, branchId);
    }) as CRMContextType["markReminderDone"],
    markReviewReminderSent: ((id) => {
      require(visibleReviewIds.has(id));
      raw.markReviewReminderSent(id);
    }) as CRMContextType["markReviewReminderSent"],
    cancelReviewRequest: ((id, reason) => {
      require(visibleReviewIds.has(id) && reason.trim().length > 0);
      raw.cancelReviewRequest(id, reason.trim());
    }) as CRMContextType["cancelReviewRequest"],
    saveReviewAnalysis: ((id, ai) => {
      require(visibleReviewIds.has(id));
      raw.saveReviewAnalysis(id, ai);
    }) as CRMContextType["saveReviewAnalysis"],
    // Complaint owners (general manager and branch manager) may add follow-ups only; they cannot edit or remove a complaint.
    addReviewNote: ((requestId, text, kind) => {
      const req = visibleReviews.find((r) => r.id === requestId);
      require(
        !!req &&
          isComplaint(req) &&
          ["admin", "general_manager", "regional_manager", "branch_manager"].includes(actor.role) &&
          text.trim().length > 0,
      );
      raw.addReviewNote(requestId, text.trim(), kind);
    }) as CRMContextType["addReviewNote"],
    addNotBoughtRecord: ((data) => {
      const known = raw.leads.some((l) => l.id === data.leadId);
      const lead = known ? findLead(data.leadId) : pendingCustomers.get(data.leadId);
      require(!!lead);
      require(known ? access.canEditCustomer(actor, lead as Lead) : !access.isSales(actor) || lead!.assignedAgentId === actor.id);
      require(data.branchId === lead!.branchId && data.reasons.length > 0);
      return raw.addNotBoughtRecord(data);
    }) as CRMContextType["addNotBoughtRecord"],
    addPurchaseInvoice: ((data) => {
      require(hasPermission(actor, "invoices.manage"));
      requireAssignment(data.branchId, data.agentId);
      const customer =
        raw.leads.find((l) => l.id === data.leadId) ||
        pendingCustomers.get(data.leadId);
      require(
        !!customer &&
          customer.branchId === data.branchId &&
          (!access.isSales(actor) || customer.assignedAgentId === actor.id),
      );
      require(
        data.items.length > 0 &&
          data.items.every((i) => Number.isFinite(i.amount) && i.amount > 0) &&
          Number.isFinite(data.totalAmount) &&
          Math.abs(
            data.items.reduce((sum, i) => sum + i.amount, 0) - data.totalAmount,
          ) < 0.01,
      );
      return raw.addPurchaseInvoice(data);
    }) as CRMContextType["addPurchaseInvoice"],
    updatePurchaseInvoiceStatus: ((id, status) => {
      require(hasPermission(actor, "invoices.manage"));
      require(invoices.some((i) => i.id === id));
      raw.updatePurchaseInvoiceStatus(id, status);
    }) as CRMContextType["updatePurchaseInvoiceStatus"],
    addPurchaseCategory: ((data) => {
      require(access.canManageCatalog(actor));
      return raw.addPurchaseCategory(data);
    }) as CRMContextType["addPurchaseCategory"],
    updatePurchaseCategory: ((...args) => {
      require(access.canManageCatalog(actor));
      raw.updatePurchaseCategory(...args);
    }) as CRMContextType["updatePurchaseCategory"],
    addBroker: ((data) => {
      // Registering a broker is part of taking a visit or a customer, so anyone who can register customers may do it.
      require(access.canManageCatalog(actor) || access.canCreateCustomer(actor));
      return raw.addBroker({
        ...data,
        branchIds: data.branchIds?.length ? data.branchIds : actor.branchId ? [actor.branchId] : undefined,
      });
    }) as CRMContextType["addBroker"],
    updateBroker: ((...args) => {
      require(access.canManageCatalog(actor));
      raw.updateBroker(...args);
    }) as CRMContextType["updateBroker"],
    addUser: ((data) => {
      validateStaff(data);
      if (data.role !== "admin" && actor.role !== "admin") {
        const q = userQuota(raw.users, raw.license);
        if (q.full) throw new ActionDenied(userLimitMessage(q));
      }
      require(
        access.canManageStaff(actor) &&
          access.assignableRoles(actor).includes(data.role),
      );
      require(
        access.isGlobalManager(actor) ||
          (!!data.branchId && branchIds.has(data.branchId)),
      );
      const branch = raw.branches.find((b) => b.id === data.branchId);
      const user = raw.addUser({
        ...data,
        ...(branch
          ? {
              companyId: branch.companyId,
              companyName: branch.companyName,
              governorateId: branch.governorateId,
              governorateName: branch.governorateName,
            }
          : {}),
        permissions: undefined,
      });
      pendingStaff.add(user.id);
      return user;
    }) as CRMContextType["addUser"],
    updateUser: ((id, data) => {
      const target = staff.find((u) => u.id === id);
      require(!!target && access.canEditStaff(actor, target, raw.branches));
      require(
        isDirector(actor) ||
          (!("specialty" in data) && !("supervisedBranchIds" in data)),
      );
      validateStaff({ ...target, ...data }, data);
      require(!data.role || data.role === target!.role || access.grantableOnEdit(actor).includes(data.role));
      require(
        !("branchId" in data) ||
          (!!data.branchId && branchIds.has(data.branchId)),
      );
      require(!("permissions" in data));
      raw.updateUser(id, data);
    }) as CRMContextType["updateUser"],
    toggleUserActive: ((id) => {
      const target = staff.find((u) => u.id === id);
      require(!!target && access.canEditStaff(actor, target, raw.branches));
      // Switching a stopped user back on counts against the plan too.
      if (target!.active === false && target!.role !== "admin" && actor.role !== "admin") {
        const q = userQuota(raw.users, raw.license);
        if (q.full) throw new ActionDenied(userLimitMessage(q));
      }
      raw.toggleUserActive(id);
    }) as CRMContextType["toggleUserActive"],
    deleteUser: (async (id) => {
      // Only the developer, and not while looking at the system as someone else.
      if (actor.role !== "admin" || raw.currentUser.role !== "admin") throw new ActionDenied("مسح الموظفين للمطوّر فقط.");
      const target = raw.users.find((u) => u.id === id);
      if (!target) throw new ActionDenied("الموظف ده مش موجود.");
      if (target.id === raw.currentUser.id) throw new ActionDenied("مينفعش تمسح حسابك إنت.");
      const owned = raw.leads.filter((l) => l.assignedAgentId === id).length;
      const open = raw.followUps.filter((f) => f.assignedAgentId === id && !["completed", "cancelled"].includes(f.status)).length;
      if (owned || open)
        throw new ActionDenied(
          `${target.name} لسه مسؤول عن ${owned} عميل و${open} متابعة مفتوحة. انقلهم لموظف تاني الأول من صفحة العملاء، أو عطّل الحساب بدل المسح.`,
        );
      await raw.deleteUser(id);
    }) as CRMContextType["deleteUser"],
    updateUserPermissions: ((...args) => {
      deny();
    }) as CRMContextType["updateUserPermissions"],
    setLicense: ((l) => {
      require(raw.currentUser.role === "admin" && Number.isInteger(l.maxBranches) && l.maxBranches >= 1 && l.maxBranches <= 1000);
      require(l.maxUsers === undefined || (Number.isInteger(l.maxUsers) && l.maxUsers >= 1 && l.maxUsers <= 10000));
      const okCap = (n?: number) => n === undefined || (Number.isInteger(n) && n >= 1 && n <= 100000);
      require(okCap(l.aiPerHour) && okCap(l.aiPerDay) && okCap(l.suggestionsPerDay));
      raw.setLicense({
        maxBranches: l.maxBranches,
        ...(l.maxUsers !== undefined ? { maxUsers: l.maxUsers } : {}),
        ...(l.aiPerHour !== undefined ? { aiPerHour: l.aiPerHour } : {}),
        ...(l.aiPerDay !== undefined ? { aiPerDay: l.aiPerDay } : {}),
        ...(l.suggestionsPerDay !== undefined ? { suggestionsPerDay: l.suggestionsPerDay } : {}),
      });
    }) as CRMContextType["setLicense"],
    addBranch: ((data) => {
      require(access.canManageOrganization(actor));
      const quota = branchQuota(raw.branches, raw.license);
      // The plan limits the business; the developer who sets it is not held back by it.
      if (quota.full && actor.role !== "admin") throw new ActionDenied(branchLimitMessage(quota));
      require(
        !data.companyId ||
          raw.companies.some((c) => c.id === data.companyId && c.active),
      );
      require(
        !!data.governorateId &&
          raw.governorates.some((g) => g.id === data.governorateId && g.active),
      );
      return raw.addBranch(data);
    }) as CRMContextType["addBranch"],
    updateBranch: ((...args) => {
      require(access.canManageOrganization(actor));
      // Switching a stopped branch back on counts against the plan too.
      const [id, updates] = args;
      const was = raw.branches.find((b) => b.id === id);
      if (updates.active === true && was && was.active === false && actor.role !== "admin") {
        const quota = branchQuota(raw.branches, raw.license);
        if (quota.full) throw new ActionDenied(branchLimitMessage(quota));
      }
      raw.updateBranch(...args);
    }) as CRMContextType["updateBranch"],
    addCompany: ((data) => {
      require(access.canManageOrganization(actor));
      return raw.addCompany(data);
    }) as CRMContextType["addCompany"],
    addGovernorate: ((data) => {
      require(access.canManageOrganization(actor));
      return raw.addGovernorate(data);
    }) as CRMContextType["addGovernorate"],
    addWarehouse: ((data) => {
      require(access.canManageOrganization(actor));
      require(
        raw.governorates.some((g) => g.id === data.governorateId && g.active),
      );
      require(
        !data.branchId ||
          raw.branches.some(
            (b) =>
              b.id === data.branchId && b.governorateId === data.governorateId,
          ),
      );
      return raw.addWarehouse(data);
    }) as CRMContextType["addWarehouse"],
    addTeam: ((data) => {
      require(access.canManageTeams(actor) && branchIds.has(data.branchId));
      validateTeam(data);
      return raw.addTeam(data);
    }) as CRMContextType["addTeam"],
    updateTeam: ((id, data) => {
      require(access.canManageTeams(actor) && teams.some((t) => t.id === id));
      const team = teams.find((t) => t.id === id)!;
      validateTeam({ ...team, ...data });
      raw.updateTeam(id, data);
    }) as CRMContextType["updateTeam"],
    addDepartmentEntity: ((data) => {
      require(access.canManageOrganization(actor));
      return raw.addDepartmentEntity(data);
    }) as CRMContextType["addDepartmentEntity"],
    updateDepartmentEntity: ((...args) => {
      require(access.canManageOrganization(actor));
      raw.updateDepartmentEntity(...args);
    }) as CRMContextType["updateDepartmentEntity"],
    addJobPosition: ((data) => {
      require(access.canManageOrganization(actor));
      return raw.addJobPosition(data);
    }) as CRMContextType["addJobPosition"],
    updateJobPosition: ((...args) => {
      require(access.canManageOrganization(actor));
      raw.updateJobPosition(...args);
    }) as CRMContextType["updateJobPosition"],
    addTimelineEvent: ((data) => {
      requireCustomerWrite(data.leadId);
      raw.addTimelineEvent(data);
    }) as CRMContextType["addTimelineEvent"],
    updateDistributionRule: ((data) => {
      require(access.canManageOrganization(actor));
      raw.updateDistributionRule(data);
    }) as CRMContextType["updateDistributionRule"],
    clearOrganizationData: (() => {
      require(raw.currentUser.role === "admin");
      return raw.clearOrganizationData();
    }) as CRMContextType["clearOrganizationData"],
    resetAllData: (() => {
      require(actor.role === "admin");
      raw.resetAllData();
    }) as CRMContextType["resetAllData"],
    findDuplicateLeadsByPhone: ((phone, exclude) =>
      raw
        .findDuplicateLeadsByPhone(phone, exclude)
        .filter((l) =>
          leadIds.has(l.id),
        )) as CRMContextType["findDuplicateLeadsByPhone"],
  };
  return view;
}
