import test from "node:test";
import assert from "node:assert/strict";
import { requestForSubject, requestsTo } from "../src/lib/reviews";
import { matchesPerson } from "../src/lib/searchText";
import type { ReviewRequest } from "../src/types/crm";

const req = (over: Partial<ReviewRequest>) => ({ id: "r", leadId: "l1", leadName: "x", branchId: "b", agentId: "a", subjectKind: "visit", subjectId: "v1", subjectLabel: "زيارة", sentAt: "2026-10-10T10:00:00Z", status: "sent", ...over }) as ReviewRequest;

test("a customer's and a broker's requests never mix, and cancelled ones do not count as sent", () => {
  const list = [
    req({ id: "c1" }),
    req({ id: "b1", leadId: "", partyKind: "broker", brokerId: "br1" }),
    req({ id: "c2", sentAt: "2026-10-12T10:00:00Z", status: "cancelled" }),
    req({ id: "c3", sentAt: "2026-10-11T10:00:00Z", subjectId: "v2" }),
  ];
  assert.deepEqual(requestsTo(list, { leadId: "l1" }).map((r) => r.id), ["c3", "c1"]);
  assert.deepEqual(requestsTo(list, { brokerId: "br1" }).map((r) => r.id), ["b1"]);
  assert.equal(requestForSubject(list, { leadId: "l1" }, "visit", "v1")?.id, "c1");
  assert.equal(requestForSubject(list, { brokerId: "br1" }, "visit", "v1")?.id, "b1");
  assert.equal(requestForSubject(list, { leadId: "l1" }, "visit", "v9"), undefined);
});

test("people search matches Arabic spelling variants and phone digits", () => {
  const p = { name: "أحمد عبد الله", phone: "01012345678" };
  assert.ok(matchesPerson(p, "احمد"));
  assert.ok(matchesPerson(p, "0101234"));
  assert.ok(!matchesPerson(p, "محمود"));
  assert.ok(!matchesPerson(p, "01"));
});
