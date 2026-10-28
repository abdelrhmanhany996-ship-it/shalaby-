import test from "node:test";
import assert from "node:assert/strict";
import type { User } from "../src/types/crm";
import { assignableRoles, branchAgents, defaultAgent } from "../src/lib/access";
import { positionNames } from "../src/lib/permissions";

const u = (id: string, role: User["role"], over: Partial<User> = {}) => ({ id, name: id, role, active: true, ...over }) as User;
const owner = u("o", "general_manager");
const gsm = u("g", "regional_manager");
const bm1 = u("bm1", "branch_manager", { branchId: "b1" });
const bm2 = u("bm2", "branch_manager", { branchId: "b2" });
const all = [owner, gsm, bm1, bm2, u("dev", "admin")];

test("role names follow the business: owner, general sales manager, branch sales manager", () => {
  assert.equal(positionNames.general_manager, "صاحب البيزنس");
  assert.equal(positionNames.regional_manager, "مدير المبيعات العام");
  assert.equal(positionNames.branch_manager, "مدير مبيعات الفرع");
});

test("who creates whom: developer anyone, owner the sales side, the general sales manager nobody, a branch manager their salespeople", () => {
  const withManage = (x: User) => ({ ...x, permissions: ["staff.manage", "staff.view", "branches.view"] }) as User;
  assert.deepEqual(assignableRoles(u("dev", "admin")), ["general_manager", "regional_manager", "branch_manager", "sales_agent", "admin"]);
  assert.deepEqual(assignableRoles(owner), ["regional_manager", "branch_manager", "sales_agent"]);
  assert.deepEqual(assignableRoles(withManage(gsm)), []); // the owner adds managers
});

test("a customer goes to the branch sales manager by default; the general sales manager can be picked anywhere", () => {
  assert.deepEqual(branchAgents(all, "b1").map((x) => x.id).sort(), ["bm1", "g"]);
  // the owner registering in branch 2 does not own the customer: the branch's sales manager does
  assert.equal(defaultAgent(all, owner, "b2"), "bm2");
  // a branch sales manager registering in their own branch owns it
  assert.equal(defaultAgent(all, bm1, "b1"), "bm1");
  // the general sales manager registering a customer sells it themselves
  assert.equal(defaultAgent(all, gsm, "b2"), "g");
  // an old branch list on the general sales manager never narrows them: every branch counts, new ones too
  const withOldList = u("g2", "regional_manager", { supervisedBranchIds: ["b1"] });
  assert.deepEqual(branchAgents([withOldList, bm2], "b2").map((x) => x.id).sort(), ["bm2", "g2"]);
});

import { canEditStaff, editableRoles, grantableOnEdit } from "../src/lib/access";
import { sanitizeMatrix, profileNames } from "../src/lib/permissions";

test("the general sales manager edits and resets everyone below the owner, in any branch, but never the owner, the developer or a peer", () => {
  const branches = [{ id: "b1" }, { id: "b2" }] as never;
  const dev = u("dev", "admin");
  const agent = u("a1", "sales_agent", { branchId: "b2" });
  assert.ok(canEditStaff(gsm, bm1, branches) && canEditStaff(gsm, agent, branches));
  assert.ok(!canEditStaff(gsm, owner, branches) && !canEditStaff(gsm, dev, branches) && !canEditStaff(gsm, u("g2", "regional_manager"), branches));
  assert.ok(!canEditStaff(gsm, gsm, branches), "not themselves");
  assert.deepEqual(grantableOnEdit(gsm), ["branch_manager", "sales_agent"]);
  // the developer anyone but themselves; the owner the sales side; a branch manager their own branch's salespeople
  assert.ok(canEditStaff(dev, owner, branches) && canEditStaff(dev, u("dev2", "admin"), branches) && !canEditStaff(dev, dev, branches));
  assert.ok(canEditStaff(owner, gsm, branches) && !canEditStaff(owner, dev, branches));
  const bmWithStaff = { ...bm1, permissions: ["staff.manage", "staff.view", "branches.view"] } as User;
  assert.ok(canEditStaff(bmWithStaff, u("a2", "sales_agent", { branchId: "b1" }), branches) && !canEditStaff(bmWithStaff, agent, branches));
  assert.deepEqual(editableRoles(u("x", "sales_agent")), []);
});

test("the permission matrix is for four positions, and the general sales manager's people control cannot be switched off", () => {
  assert.deepEqual(profileNames.employee, "سيلز");
  const stripped = sanitizeMatrix({ general: ["customers.view"] });
  assert.ok(stripped.general.includes("staff.manage") && stripped.general.includes("staff.view"));
});
