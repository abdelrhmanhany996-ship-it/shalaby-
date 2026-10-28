import test from "node:test";
import assert from "node:assert/strict";
import { assignableRoles, canAccessPage, visibleStaff } from "../src/lib/access";
import { hasPermission, permissionDefinitions, tempOverrides } from "../src/lib/permissions";
import * as seed from "../src/data/initialData";
import type { User } from "../src/types/crm";

tempOverrides.directorAllPermissions = false; // judge the managers by the real matrix
const base = seed.initialUsers.find((u) => u.role === "sales_agent")!;
const mk = (role: User["role"], id = role): User => ({ ...base, id, role, branchId: undefined });
const developer = mk("admin");
const manager = mk("general_manager");
const branchManager = { ...mk("branch_manager"), branchId: "br-cairo" };

test("the developer has every permission regardless of the matrix", () => {
  for (const [p] of permissionDefinitions) assert.ok(hasPermission(developer, p), p);
});

test("developer-only tools are visible to the developer alone", () => {
  assert.ok(canAccessPage(developer, "developer"));
  assert.ok(!canAccessPage(manager, "developer"));
  assert.ok(!canAccessPage(branchManager, "developer"));
});

test("only the developer creates managers (and other developers)", () => {
  assert.ok(assignableRoles(developer).includes("general_manager"));
  assert.ok(assignableRoles(developer).includes("admin"));
  assert.ok(!assignableRoles(manager).includes("general_manager"));
  assert.ok(!assignableRoles(manager).includes("admin"));
  assert.ok(assignableRoles(manager).includes("branch_manager"));
});

test("developers are invisible in the staff list of everyone else", () => {
  const all = [developer, manager, branchManager];
  const seenByManager = visibleStaff(manager, all, seed.initialBranches, seed.initialTeams);
  assert.ok(!seenByManager.some((u) => u.role === "admin"));
  const seenByDeveloper = visibleStaff(developer, all, seed.initialBranches, seed.initialTeams);
  assert.ok(seenByDeveloper.some((u) => u.role === "admin"));
});
