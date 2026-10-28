import test from "node:test";
import assert from "node:assert/strict";
import * as seed from "../src/data/initialData";
import type { User, Lead } from "../src/types/crm";
import type { CRMContextType } from "../src/context/CRMContext";
import { createWorkspace } from "../src/lib/workspace";
import { tempOverrides } from "../src/lib/permissions";

// The tests assert the real permission matrix, not the temporary director override.
tempOverrides.directorAllPermissions = false;
import {
  canAccessPage,
  canCompleteFollowUp,
  canContactCustomer,
  canEditCustomer,
  canSeeBranch,
} from "../src/lib/access";
import { seesAll } from "../src/lib/scopes";
import {
  defaultPermissionMatrix,
  normalizeUser,
  positionRoles,
  sanitizeMatrix,
  togglePermission,
} from "../src/lib/permissions";
const users = seed.initialUsers.map(normalizeUser);
const developer = users.find((u) => u.role === "admin")!;
const director = { ...developer, id: "test-director", role: "general_manager" as const };
const employee = users.find((u) => u.role === "sales_agent")!;
const manager = users.find(
  (u) => u.role === "branch_manager" && u.branchId === employee.branchId,
)!;
const other = users.find(
  (u) => u.role === "sales_agent" && u.branchId !== employee.branchId,
)!;
const makeUser = (role: User["role"], extra: Partial<User> = {}): User => ({
  ...employee,
  id: `test-${role}`,
  role,
  ...extra,
});
function fixture(actor: User, overrides: Partial<CRMContextType> = {}) {
  const calls: string[] = [];
  const noop =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(name);
      return args[0];
    };
  const raw = {
    currentUser: director,
    effectiveUser: actor,
    viewAsUser: null,
    users: users.some((u) => u.id === actor.id) ? users : [...users, actor],
    branches: seed.initialBranches,
    teams: seed.initialTeams,
    leads: seed.initialLeads,
    followUps: seed.initialFollowUps,
    bookings: seed.initialBookings,
    visits: seed.initialVisits,
    purchaseInvoices: seed.initialPurchaseInvoices,
    notBoughtRecords: [],
    companies: seed.initialCompanies,
    governorates: seed.initialGovernorates,
    warehouses: seed.initialWarehouses,
    brokers: seed.initialBrokers,
    timelineEvents: seed.initialTimelineEvents,
    notifications: seed.initialNotifications,
    auditLogs: seed.initialAuditLogs,
    jobPositions: seed.initialJobPositions,
    departmentEntities: seed.initialDepartments,
    permissionMatrix: structuredClone(defaultPermissionMatrix),
    ...Object.fromEntries(
      [
        "addBranch",
        "updateBranch",
        "setLicense",
        "addLead",
        "updateLead",
        "deleteLead",
        "reassignLead",
        "addVisit",
        "addBooking",
        "addFollowUp",
        "updateFollowUpResult",
        "addPurchaseInvoice",
        "updatePurchaseInvoiceStatus",
        "addUser",
        "updateUser",
        "toggleUserActive",
        "deleteUser",
        "decideSuggestion",
        "saveSuggestions",
        "markReminderDone",
        "requestBrokerReview",
        "updateUserSalaryInfo",
        "updatePermissionMatrix",
        "resetAllData",
        "addTeam",
        "updateTeam",
        "setViewAsUser",
        "addNotBoughtRecord",
      ].map((k) => [k, noop(k)]),
    ),
    findDuplicateLeadsByPhone: () => seed.initialLeads,
    ...overrides,
  } as CRMContextType;
  return { raw, calls, view: createWorkspace(raw) };
}
test("the available roles are developer, owner, general sales manager and branch sales manager, and legacy ones keep their saved IDs", () => {
  assert.deepEqual(positionRoles, ["admin", "general_manager", "regional_manager", "branch_manager", "sales_agent"]);
  assert.equal(normalizeUser(makeUser("general_manager")).role, "general_manager");
  assert.equal(
    normalizeUser(makeUser("team_leader", { jobPositionTitle: "قائد تنفيذ" }))
      .jobPositionTitle,
    "قائد تنفيذ",
  );
  assert.equal(normalizeUser(makeUser("team_leader")).role, "sales_agent");
});
test("director monitors all branches with no operational customer actions by default", () => {
  const { view, calls } = fixture(director);
  assert.equal(view.leads.length, seed.initialLeads.length);
  assert.equal(view.branches.length, seed.initialBranches.length);
  assert.ok(canAccessPage(view.effectiveUser, "permissions"));
  assert.equal(canAccessPage(view.effectiveUser, "add_client"), false);
  assert.throws(() =>
    view.updateLead(view.leads[0].id, { status: "contacted" }),
  );
  assert.throws(() => view.addLead({} as never));
  assert.throws(() => view.addFollowUp({ leadId: view.leads[0].id } as never));
  assert.equal(
    canContactCustomer(view.effectiveUser, view.leads[0], view.followUps),
    false,
  );
  assert.deepEqual(calls, []);
});
test("employee data, totals, search and staff directory stay within ownership and branch", () => {
  const { view } = fixture(employee);
  assert.ok(
    view.leads.every(
      (l) =>
        l.branchId === employee.branchId &&
        (l.assignedAgentId === employee.id ||
          view.followUps.some((f) => f.leadId === l.id)),
    ),
  );
  assert.ok(view.bookings.every((b) => b.agentId === employee.id));
  assert.ok(view.visits.every((v) => v.receivedByAgentId === employee.id));
  assert.ok(view.purchaseInvoices.every((i) => i.agentId === employee.id));
  assert.deepEqual(
    view.users.map((u) => u.id),
    [employee.id],
  );
  assert.ok(
    view
      .findDuplicateLeadsByPhone("010")
      .every((l) => view.leads.some((v) => v.id === l.id)),
  );
  assert.equal(canAccessPage(view.effectiveUser, "permissions"), false);
  assert.equal(canAccessPage(view.effectiveUser, "users"), false);
});
test("delegating a task gives access to that customer without unrelated employee transactions", () => {
  const foreignLead = seed.initialLeads.find(
    (l) =>
      l.branchId === employee.branchId && l.assignedAgentId !== employee.id,
  )!;
  assert.ok(foreignLead);
  const task = {
    ...seed.initialFollowUps[0],
    id: "delegated",
    branchId: employee.branchId!,
    leadId: foreignLead.id,
    assignedAgentId: employee.id,
    status: "due" as const,
  };
  const { view } = fixture(employee, { followUps: [task] });
  assert.ok(view.leads.some((l) => l.id === foreignLead.id));
  assert.ok(
    canContactCustomer(view.effectiveUser, foreignLead, view.followUps),
  );
  assert.ok(view.bookings.every((b) => b.agentId === employee.id));
  assert.throws(() => view.updateLead(foreignLead.id, { notes: "forbidden" }));
});
test("branch manager cannot edit directors, see other branches, promote staff or finish another employee task", () => {
  const { view, calls } = fixture(manager);
  assert.ok(view.leads.every((l) => l.branchId === manager.branchId));
  assert.ok(
    view.users.every(
      (u) => u.id === manager.id || u.branchId === manager.branchId,
    ),
  );
  assert.throws(() => view.updateUser(employee.id, { role: "admin" }));
  assert.throws(() => view.updateUser(employee.id, { specialty: "accounts" }));
  assert.throws(() => view.updateUser(director.id, { name: "forbidden" }));
  assert.throws(() => view.addUser({ ...employee, role: "regional_manager" }));
  assert.throws(() =>
    view.addTeam({
      name: "invalid",
      branchId: manager.branchId!,
      memberIds: [other.id],
    }),
  );
  const task = seed.initialFollowUps.find(
    (f) => f.branchId === manager.branchId && f.assignedAgentId !== manager.id,
  )!;
  assert.ok(task);
  assert.equal(canCompleteFollowUp(view.effectiveUser, task), false);
  assert.throws(() =>
    view.updateFollowUpResult(task.id, "completed", "forbidden"),
  );
  assert.deepEqual(calls, []);
});
test("supervisors are limited to assigned branches and specialization", () => {
  const general = fixture(
    makeUser("regional_manager", { supervisedBranchIds: [employee.branchId!] }),
  ).view;
  // the general sales manager is not limited by a branch list
  assert.ok(general.leads.some((l) => l.branchId !== employee.branchId));
  assert.equal(general.permissionMatrix, undefined);
  const accounts = fixture(
    makeUser("supervisor", {
      specialty: "accounts",
      supervisedBranchIds: [employee.branchId!],
    }),
  ).view;
  assert.deepEqual(accounts.leads, []);
  assert.deepEqual(accounts.followUps, []);
  assert.deepEqual(accounts.visits, []);
  assert.equal(canAccessPage(accounts.effectiveUser, "invoices"), true);
  assert.equal(canAccessPage(accounts.effectiveUser, "clients"), false);
  assert.ok(
    accounts.invoiceCustomers.every((l) => l.branchId === employee.branchId),
  );
  assert.ok(accounts.invoiceCustomers.every((l) => !("notes" in l)));
  assert.throws(() => accounts.updatePermissionMatrix(defaultPermissionMatrix));
  const noScope = fixture(
    makeUser("supervisor", { branchId: undefined, supervisedBranchIds: [] }),
  ).view;
  assert.deepEqual(noScope.branches, []);
  assert.deepEqual(noScope.leads, []);
});
test("only director can modify matrix; saving a policy changes both navigation and mutation guards", () => {
  const { view, calls } = fixture(director);
  view.updatePermissionMatrix(defaultPermissionMatrix);
  assert.deepEqual(calls, ["updatePermissionMatrix"]);
  assert.throws(() =>
    fixture(manager).view.updatePermissionMatrix(defaultPermissionMatrix),
  );
  const matrix = structuredClone(defaultPermissionMatrix);
  matrix.employee = matrix.employee.filter((p) => !p.startsWith("customers."));
  const changed = fixture(employee, { permissionMatrix: matrix }).view;
  assert.equal(canAccessPage(changed.effectiveUser, "clients"), false);
  assert.deepEqual(changed.leads, []);
  assert.throws(() => changed.addLead({} as never));
  const enabled = togglePermission([], "followups.create", true);
  assert.ok(enabled.includes("customers.view"));
  assert.ok(enabled.includes("followups.view"));
  assert.equal(
    togglePermission(enabled, "customers.view", false).includes(
      "followups.create",
    ),
    false,
  );
  assert.deepEqual(
    sanitizeMatrix({ ...defaultPermissionMatrix, employee: [] }).employee,
    [],
  );
});
test("reassignment rejects outside-branch employees and permitted assignment uses target team", () => {
  // the general sales manager moves customers between salespeople; a branch sales manager only sells
  const gsm = { ...manager, id: "test-gsm", role: "regional_manager" as const, branchId: undefined };
  const { view, calls } = fixture(gsm);
  const lead = view.leads[0];
  assert.ok(lead);
  assert.throws(() => view.reassignLead(lead.id, other.id));
  view.reassignLead(lead.id, employee.id);
  assert.deepEqual(calls, ["reassignLead"]);
});
test("hidden foreign invoices, staff salaries, and customer actions remain denied even if handlers are invoked", () => {
  const { view, calls } = fixture(employee);
  const foreign = seed.initialLeads.find(
    (l) => l.branchId !== employee.branchId,
  )!;
  assert.throws(() => view.updateLead(foreign.id, { notes: "forbidden" }));
  assert.throws(() =>
    view.addVisit({
      branchId: other.branchId!,
      receivedByAgentId: other.id,
    } as never),
  );
  assert.throws(() =>
    view.updatePurchaseInvoiceStatus("foreign-invoice", "paid"),
  );
  assert.deepEqual(calls, []);
});

test("completed follow-ups cannot be submitted again", () => {
  const task = {
    ...seed.initialFollowUps[0],
    assignedAgentId: employee.id,
    branchId: employee.branchId!,
    status: "completed" as const,
  };
  const { view, calls } = fixture(employee, { followUps: [task] });
  assert.equal(canCompleteFollowUp(view.effectiveUser, task), false);
  assert.throws(() =>
    view.updateFollowUpResult(task.id, "completed", "duplicate"),
  );
  assert.deepEqual(calls, []);
});
test("a customer and its optional invoice can be created in one UI submission", () => {
  const customer = {
    ...seed.initialLeads[0],
    id: "new-customer",
    branchId: employee.branchId!,
    assignedAgentId: employee.id,
  };
  const { view, calls } = fixture(employee, { addLead: () => customer });
  const created = view.addLead(customer);
  view.addPurchaseInvoice({
    leadId: created.id,
    branchId: employee.branchId!,
    agentId: employee.id,
    totalAmount: 4321,
    items: [{ categoryId: "paint", categoryName: "دهانات", amount: 4321 }],
  } as never);
  assert.deepEqual(calls, ["addPurchaseInvoice"]);
  assert.throws(() =>
    view.addPurchaseInvoice({
      leadId: created.id,
      branchId: employee.branchId!,
      agentId: employee.id,
      totalAmount: 999,
      items: [{ categoryId: "paint", categoryName: "دهانات", amount: 4321 }],
    } as never),
  );
});
test("a customer created a moment ago can get its purchase or its not-bought reason, but not in another branch", () => {
  const customer = {
    ...seed.initialLeads[0],
    id: "new-customer-2",
    branchId: employee.branchId!,
    assignedAgentId: employee.id,
  };
  const { view, calls } = fixture(employee, { addLead: () => customer });
  const created = view.addLead(customer);
  view.addBooking({
    leadId: created.id,
    branchId: employee.branchId!,
    agentId: employee.id,
    amount: 1000,
  } as never);
  view.addNotBoughtRecord({
    leadId: created.id,
    branchId: employee.branchId!,
    agentId: employee.id,
    reasons: ["price"],
  } as never);
  assert.deepEqual(calls, ["addBooking", "addNotBoughtRecord"]);
  assert.throws(() =>
    view.addNotBoughtRecord({ leadId: created.id, branchId: other.branchId!, agentId: employee.id, reasons: ["price"] } as never),
  );
  assert.throws(() => view.addNotBoughtRecord({ leadId: created.id, branchId: employee.branchId!, agentId: employee.id, reasons: [] } as never));
  assert.throws(() => view.addBooking({ leadId: "ghost", branchId: employee.branchId!, agentId: employee.id, amount: 1 } as never));
});
test("a branch cannot be added past the company plan, and a stopped branch cannot be switched back on past it", () => {
  const company = seed.initialCompanies.find((c) => c.active)!,
    gov = seed.initialGovernorates.find((g) => g.active)!;
  const branch = (id: string, over = {}) => ({ id, name: id, code: id, active: true, companyId: company.id, governorateId: gov.id, ...over }) as never;
  const full = fixture(director, { branches: [branch("a"), branch("b"), branch("old", { active: false }), branch("sample", { isDemo: true })], license: { maxBranches: 2 } });
  const data = { name: "c", code: "C", companyId: company.id, governorateId: gov.id } as never;
  assert.throws(() => full.view.addBranch(data), /الباقة الحالية/);
  assert.throws(() => full.view.updateBranch("old", { active: true }), /الباقة الحالية/);
  assert.deepEqual(full.calls, []);
  const roomy = fixture(director, { branches: [branch("a")], license: { maxBranches: 2 } });
  assert.doesNotThrow(() => roomy.view.addBranch(data));
  // only the developer changes the plan
  assert.throws(() => roomy.view.setLicense({ maxBranches: 10 }));
  assert.doesNotThrow(() => fixture(developer, { currentUser: developer, license: { maxBranches: 2 } }).view.setLicense({ maxBranches: 10 }));
});

test("creating a branch requires a real company and governorate instead of an unscoped branch", () => {
  const { view } = fixture(director, { branches: [] });
  assert.throws(() => view.addBranch({ name: "unscoped", code: "X" } as never));
  const company = seed.initialCompanies.find((c) => c.active)!,
    gov = seed.initialGovernorates.find((g) => g.active)!;
  assert.doesNotThrow(() =>
    view.addBranch({
      name: "branch",
      code: "B",
      companyId: company.id,
      governorateId: gov.id,
    } as never),
  );
});

test("recording why a customer has not bought is limited to customers the user may edit", () => {
  const agent = users.find(
    (u) =>
      u.role === "sales_agent" &&
      seed.initialLeads.some((l) => l.assignedAgentId === u.id),
  )!;
  const { view, calls } = fixture(agent);
  const own = view.leads.find((l) => canEditCustomer(view.effectiveUser, l))!;
  assert.ok(own, "agent has an editable customer in the seed");
  view.addNotBoughtRecord({
    leadId: own.id,
    leadName: own.name,
    branchId: own.branchId,
    agentId: agent.id,
    reasons: ["price"],
  });
  assert.ok(calls.includes("addNotBoughtRecord"));
  const foreign = seed.initialLeads.find((l) => l.branchId !== agent.branchId)!;
  assert.throws(() =>
    view.addNotBoughtRecord({
      leadId: foreign.id,
      leadName: foreign.name,
      branchId: foreign.branchId,
      agentId: agent.id,
      reasons: ["price"],
    }),
  );
  assert.throws(() =>
    view.addNotBoughtRecord({
      leadId: own.id,
      leadName: own.name,
      branchId: own.branchId,
      agentId: agent.id,
      reasons: [],
    }),
  );
});

test("the developer can add a customer to a branch that has no salesperson; an owner who cannot is told why in words", () => {
  const lonely = seed.initialBranches[0];
  const emptyUsers = users.filter((u) => !(u.branchId === lonely.id && ["sales_agent", "team_leader", "branch_manager"].includes(u.role)));
  const draft = { name: "عميل", phone: "01000000000", branchId: lonely.id, status: "new" } as never;
  const created = { id: "new-lead", branchId: lonely.id } as unknown as Lead;

  const asDev = fixture(developer, { users: emptyUsers, addLead: () => created });
  assert.equal(asDev.view.addLead({ ...(draft as object), assignedAgentId: developer.id } as never), created);

  const asOwner = fixture(director, { users: [...emptyUsers.filter((u) => u.id !== director.id), director], addLead: () => created });
  assert.throws(
    () => asOwner.view.addLead({ ...(draft as object), assignedAgentId: director.id } as never),
    (e: Error) => e.name === "ActionDenied" && e.message.length > 20 && !/^الإجراء غير متاح لدورك$/.test(e.message),
  );
});

test("the plan limits do not hold the developer back; they still stop the owner", () => {
  const company = seed.initialCompanies.find((c) => c.active)!,
    gov = seed.initialGovernorates.find((g) => g.active)!;
  const branch = (id: string) => ({ id, name: id, code: id, active: true, companyId: company.id, governorateId: gov.id }) as never;
  const data = { name: "c", code: "C", companyId: company.id, governorateId: gov.id } as never;
  const branches = [branch("a"), branch("b")];
  assert.doesNotThrow(() => fixture(developer, { branches, license: { maxBranches: 2 } }).view.addBranch(data));
  assert.throws(() => fixture(director, { branches, license: { maxBranches: 2 } }).view.addBranch(data), /الباقة الحالية/);
  const crowded = users.filter((u) => u.role !== "admin");
  const draft = { name: "x", phone: "01000000001", role: "branch_manager", branchId: employee.branchId, active: true } as never;
  assert.throws(() => fixture(director, { users: crowded, license: { maxBranches: 2, maxUsers: 1 } }).view.addUser(draft), /الباقة الحالية/);
  assert.doesNotThrow(() => fixture(developer, { users: crowded, license: { maxBranches: 2, maxUsers: 1 } }).view.addUser(draft));
});

test("only the developer can delete an employee, and only one who has nothing left to hand over", async () => {
  const idle = { ...employee, id: "idle-agent" };
  const withIdle = { users: [...users.filter((u) => u.id !== idle.id), idle], leads: seed.initialLeads.filter((l) => l.assignedAgentId !== idle.id), followUps: [] as never };
  const asDev = fixture(developer, { ...withIdle, currentUser: developer });
  await asDev.view.deleteUser(idle.id);
  assert.deepEqual(asDev.calls, ["deleteUser"]);

  await assert.rejects(() => fixture(director, { ...withIdle, currentUser: director }).view.deleteUser(idle.id), /للمطوّر فقط/);
  await assert.rejects(() => fixture(developer, { ...withIdle, currentUser: developer }).view.deleteUser(developer.id), /حسابك/);
  // still owns a customer: told to hand them over first
  const busy = { ...employee, id: "busy-agent" };
  const lead = { ...seed.initialLeads[0], assignedAgentId: busy.id };
  await assert.rejects(
    () => fixture(developer, { currentUser: developer, users: [...users, busy], leads: [lead], followUps: [] as never }).view.deleteUser(busy.id),
    /مسؤول عن 1 عميل/,
  );
  // looking at the system as someone else does not allow it either
  await assert.rejects(() => fixture(director, { currentUser: developer, ...withIdle }).view.deleteUser(idle.id), /للمطوّر فقط/);
});

test("the general sales manager sees every branch, even one added after their branch list was saved", () => {
  const gsm = { ...makeUser("regional_manager"), supervisedBranchIds: ["br-cairo", "br-alex"] };
  const tanta = seed.initialBranches.find((b) => b.id === "br-tanta")!;
  assert.equal(canSeeBranch(gsm, tanta.id, seed.initialBranches), true);
  assert.equal(seesAll({ role: "regional_manager", userId: gsm.id, supervisedBranchIds: ["br-cairo"] }), true);
  const { view } = fixture(gsm);
  assert.ok(view.branches.some((b) => b.id === "br-tanta"));
});

test("a salesperson decides only their own pending Zaki suggestions, and accepting needs a date and a reason", () => {
  const mineLead = { ...seed.initialLeads[0], id: "my-lead", branchId: employee.branchId!, assignedAgentId: employee.id };
  const withLead = { leads: [mineLead] };
  const sug = (over = {}) => ({ id: "s1", status: "pending", partyKind: "client", leadId: mineLead.id, name: mineLead.name, branchId: mineLead.branchId, agentId: employee.id, ...over }) as never;
  const ok = fixture(employee, { ...withLead, aiSuggestions: [sug()] });
  ok.view.decideSuggestion("s1", { accept: true, date: "2030-01-01", reason: "قال هيرجع", type: "call", edited: false });
  assert.deepEqual(ok.calls.filter((c) => c === "decideSuggestion"), ["decideSuggestion"]);
  assert.throws(() => fixture(employee, { ...withLead, aiSuggestions: [sug()] }).view.decideSuggestion("s1", { accept: true, date: "", reason: "x", type: "call", edited: false }));
  assert.throws(() => fixture(employee, { ...withLead, aiSuggestions: [sug({ agentId: "someone-else" })] }).view.decideSuggestion("s1", { accept: false }));
  assert.throws(() => fixture(employee, { ...withLead, aiSuggestions: [sug({ status: "accepted" })] }).view.decideSuggestion("s1", { accept: false }));
  assert.throws(() => fixture(employee, withLead).view.saveSuggestions([sug({ agentId: "someone-else" })] as never));
});
