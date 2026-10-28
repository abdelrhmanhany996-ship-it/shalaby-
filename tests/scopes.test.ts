import test from "node:test";
import assert from "node:assert/strict";
import { scopeBranches, scopesFor, seesAll } from "../src/lib/scopes";

test("who sees everything", () => {
  assert.ok(seesAll({ role: "admin", userId: "u" }));
  assert.ok(seesAll({ role: "general_manager", userId: "u" }));
  assert.ok(seesAll({ role: "regional_manager", userId: "u" }));
  // the general sales manager covers every branch, even with an old branch list saved
  assert.ok(seesAll({ role: "regional_manager", userId: "u", supervisedBranchIds: ["b1"] }));
  assert.ok(!seesAll({ role: "branch_manager", userId: "u", branchId: "b1" }));
});

test("queries match the rules: managers by branch, sales by branch and owner", () => {
  assert.deepEqual(scopeBranches({ role: "supervisor", userId: "u", branchId: "b1" }), ["b1"]);
  assert.deepEqual(scopeBranches({ role: "supervisor", userId: "u", branchId: "b1", supervisedBranchIds: ["b2", "b3"] }), ["b2", "b3"]);
  const bm = scopesFor({ role: "branch_manager", userId: "u", branchId: "b1" });
  assert.deepEqual(bm.leads, [[["branchId", "==", "b1"]]]);
  const agent = scopesFor({ role: "sales_agent", userId: "me", branchId: "b1" });
  assert.deepEqual(agent.leads, [
    [["branchId", "==", "b1"], ["assignedAgentId", "==", "me"]],
    [["branchId", "==", "b1"], ["delegatedTo", "array-contains", "me"]],
  ]);
  assert.deepEqual(agent.visits, [[["branchId", "==", "b1"], ["receivedByAgentId", "==", "me"]]]);
  assert.equal(agent.audit, "none");
  assert.deepEqual(agent.brokers, [[["branchIds", "array-contains-any", ["b1"]]]]);
  assert.equal(scopesFor({ role: "general_manager", userId: "u" }).leads, "all");
  const list = scopesFor({ role: "supervisor", userId: "u", branchId: "b1", supervisedBranchIds: ["b1", "b2"] });
  assert.deepEqual(list.leads, [[["branchId", "in", ["b1", "b2"]]]]);
  assert.equal(scopesFor({ role: "regional_manager", userId: "u", supervisedBranchIds: ["b1", "b2"] }).leads, "all");
  assert.equal(scopesFor({ role: "sales_agent", userId: "u" }).leads, "none"); // no branch, nothing
  assert.equal(scopesFor(null).leads, "none");
});
