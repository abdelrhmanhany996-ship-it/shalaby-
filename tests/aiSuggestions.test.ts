import test from "node:test";
import assert from "node:assert/strict";
import { nearbyFollowUp, selectCandidates, suggestionBudget, suggestionStats, type SuggestionData } from "../src/lib/aiSuggestions";
import type { AiSuggestion, FollowUp, Lead, Visit } from "../src/types/crm";

const TODAY = "2026-10-20";
const lead = (over: Partial<Lead> = {}) => ({ id: "l1", name: "م. محمد", phone: "010", status: "interested", source: "walk_in", department: "decor", branchId: "br", assignedAgentId: "me", createdAt: "2026-10-01T10:00:00Z", notes: "", ...over }) as Lead;
const visit = (over: Partial<Visit> = {}) => ({ id: "v1", linkedLeadId: "l1", visitorName: "م. محمد", receivedByAgentId: "me", branchId: "br", date: "2026-10-12", reason: "زيارة للفرع", outcome: "لسه", notes: "", ...over }) as Visit;
const fu = (over: Partial<FollowUp> = {}) => ({ id: "f1", leadId: "l1", status: "due", scheduledAt: "2026-10-25T10:00:00", reason: "x", ...over }) as FollowUp;
const data = (over: Partial<SuggestionData> = {}): SuggestionData => ({ leads: [lead()], visits: [], followUps: [], bookings: [], notBoughtRecords: [], reviewRequests: [], reviewNotes: [], timelineEvents: [], brokers: [], aiSuggestions: [], ...over });
const said = visit({ notes: "قال عنده مشروع فيلا جديدة بعد شهر وهيرجع تاني" });

test("only customers with a recent written note and nothing already scheduled are worth reading", () => {
  assert.equal(selectCandidates(data(), "me", TODAY).length, 0);
  assert.equal(selectCandidates(data({ visits: [visit()] }), "me", TODAY).length, 0); // only the default reason: no real text
  const c = selectCandidates(data({ visits: [said] }), "me", TODAY);
  assert.equal(c.length, 1);
  assert.match(c[0].snapshot[0], /فيلا/);
  // an open follow-up already covers them
  assert.equal(selectCandidates(data({ visits: [said], followUps: [fu()] }), "me", TODAY).length, 0);
  // a finished one does not
  assert.equal(selectCandidates(data({ visits: [said], followUps: [fu({ status: "completed" })] }), "me", TODAY).length, 1);
  // not mine
  assert.equal(selectCandidates(data({ visits: [said] }), "other", TODAY).length, 0);
  // old notes do not count
  assert.equal(selectCandidates(data({ visits: [{ ...said, date: "2026-07-01" }] }), "me", TODAY).length, 0);
});

test("the same facts are never read twice, but new facts are", () => {
  const first = selectCandidates(data({ visits: [said] }), "me", TODAY)[0];
  const seen = [{ id: "s", status: "checked", fingerprint: first.fingerprint, agentId: "me", dayKey: TODAY }] as AiSuggestion[];
  assert.equal(selectCandidates(data({ visits: [said], aiSuggestions: seen }), "me", TODAY).length, 0);
  const more = visit({ id: "v2", date: "2026-10-18", notes: "اتصل وقال هيحجز المعاينة الأسبوع الجاي" });
  assert.equal(selectCandidates(data({ visits: [said, more], aiSuggestions: seen }), "me", TODAY).length, 1);
});

test("a broker's visit notes can be a candidate too", () => {
  const broker = { id: "b1", name: "م. وسيط", active: true, type: "contractor", phone: "011" } as never;
  const bv = visit({ id: "v9", linkedLeadId: undefined, brokerId: "b1", visitorType: "broker", notes: "قال عنده 3 عمارات هيبدأ فيهم الشهر الجاي" });
  const c = selectCandidates(data({ leads: [], brokers: [broker], visits: [bv] }), "me", TODAY);
  assert.deepEqual(c.map((x) => [x.partyKind, x.brokerId]), [["broker", "b1"]]);
});

test("the daily limit counts suggestions, not the 'checked' markers, and stats split accepted from rejected", () => {
  const mk = (status: AiSuggestion["status"], over: Partial<AiSuggestion> = {}) => ({ id: Math.random().toString(), status, agentId: "me", dayKey: TODAY, fingerprint: "f", ...over }) as AiSuggestion;
  const list = [mk("pending"), mk("accepted", { edited: true }), mk("rejected"), mk("checked"), mk("pending", { agentId: "x" }), mk("accepted", { dayKey: "2026-10-01" })];
  assert.deepEqual(suggestionBudget(list, "me", TODAY, 10), { made: 3, left: 7, checks: 4, checksLeft: 21 });
  assert.equal(suggestionBudget(list, "me", TODAY, 3).left, 0);
  assert.deepEqual(suggestionStats(list.filter((s) => s.agentId === "me")), { total: 4, accepted: 2, rejected: 1, pending: 1, edited: 1 });
});

test("a follow-up within ten days of the suggested day counts as already scheduled", () => {
  assert.ok(nearbyFollowUp([fu()], { leadId: "l1" }, "2026-11-01"));
  assert.equal(nearbyFollowUp([fu()], { leadId: "l1" }, "2026-12-01"), undefined);
  assert.equal(nearbyFollowUp([fu({ status: "completed" })], { leadId: "l1" }, "2026-10-26"), undefined);
});
