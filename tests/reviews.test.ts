import test from "node:test";
import assert from "node:assert/strict";
import * as seed from "../src/data/initialData";
import type { ReviewNote, ReviewRequest, User } from "../src/types/crm";
import type { CRMContextType } from "../src/context/CRMContext";
import { createWorkspace } from "../src/lib/workspace";
import { defaultPermissionMatrix, normalizeUser, tempOverrides } from "../src/lib/permissions";
import {
  complaintState,
  isComplaint,
  isLateComplaint,
  resolutionHours,
  reviewStats,
  newReviewToken,
  requestMessage,
  reviewPhase,
  whatsappNumber,
  whatsappUrl,
} from "../src/lib/reviews";

tempOverrides.directorAllPermissions = false;
const H = 3_600_000;
const sentAt = (hoursAgo: number) => new Date(Date.now() - hoursAgo * H).toISOString();
const req = (over: Partial<ReviewRequest> = {}): ReviewRequest => ({
  id: "t".repeat(24),
  leadId: "l1",
  leadName: "م. أحمد علي",
  branchId: "b1",
  agentId: "a1",
  subjectKind: "visit",
  subjectLabel: "زيارة فرع القاهرة",
  sentAt: sentAt(1),
  status: "sent",
  ...over,
});

test("token is 24 unguessable chars and the link goes to the public page", () => {
  const t = newReviewToken();
  assert.match(t, /^[a-z0-9]{24}$/);
  assert.notEqual(t, newReviewToken());
});

test("WhatsApp numbers and message", () => {
  assert.equal(whatsappNumber("01012345678"), "201012345678");
  assert.equal(whatsappNumber("+20 101 234 5678"), "201012345678");
  const url = whatsappUrl("01012345678", "أهلًا");
  assert.ok(url.startsWith("https://wa.me/201012345678?text="));
  const msg = requestMessage({ name: "م. أحمد علي" }, "زيارة فرع القاهرة", "https://x/review/?t=abc");
  assert.ok(msg.includes("أهلًا م. أحمد") && !msg.includes("علي") && msg.includes("https://x/review/?t=abc"));
});

test("one reminder after 48h, then the request expires; answered/cancelled stop everything", () => {
  assert.equal(reviewPhase(req({ sentAt: sentAt(10) })), "waiting");
  assert.equal(reviewPhase(req({ sentAt: sentAt(49) })), "reminder_due");
  assert.equal(reviewPhase(req({ sentAt: sentAt(60), reminderSentAt: sentAt(5) })), "reminder_sent");
  assert.equal(reviewPhase(req({ sentAt: sentAt(120), reminderSentAt: sentAt(50) })), "expired");
  assert.equal(reviewPhase(req({ status: "answered", sentAt: sentAt(500) })), "answered");
  assert.equal(reviewPhase(req({ status: "cancelled", sentAt: sentAt(500) })), "cancelled");
});

test("a complaint is flagged by the customer, a low rating, or the AI, and follows the note trail", () => {
  assert.equal(isComplaint(req()), false); // unanswered
  assert.equal(isComplaint(req({ status: "answered", response: { rating: 5 } })), false);
  assert.equal(isComplaint(req({ status: "answered", response: { rating: 2 } })), true);
  assert.equal(isComplaint(req({ status: "answered", isComplaint: true, response: { rating: 5 } })), true);
  assert.equal(isComplaint(req({ status: "answered", response: { rating: 5 }, ai: { kind: "complaint" } })), true);
  const r = req({ status: "answered", response: { rating: 1 } });
  const note = (kind: ReviewNote["kind"], at: string): ReviewNote => ({ id: at, requestId: r.id, text: "x", kind, byId: "m", byName: "m", at });
  assert.equal(complaintState(r, []), "open");
  assert.equal(complaintState(r, [note("note", "2026-01-01")]), "followed_up");
  assert.equal(complaintState(r, [note("note", "2026-01-01"), note("resolved", "2026-01-02")]), "resolved");
});

// ---- permissions through the workspace ----
const users = seed.initialUsers.map(normalizeUser);
const developer = users.find((u) => u.role === "admin")!;
const employee = users.find((u) => u.id === "usr-agent-cairo-1")!;
const manager = users.find((u) => u.role === "branch_manager" && u.branchId === employee.branchId)!;
const otherManager = users.find((u) => u.role === "branch_manager" && u.branchId !== employee.branchId)!;
const lead = seed.initialLeads.find((l) => l.assignedAgentId === employee.id)!;
const complaint = req({ id: "c".repeat(24), leadId: lead.id, branchId: lead.branchId, agentId: employee.id, status: "answered", response: { rating: 1 } });
const praise = req({ id: "p".repeat(24), leadId: lead.id, branchId: lead.branchId, agentId: employee.id, status: "answered", response: { rating: 5 } });

function view(actor: User) {
  const calls: string[] = [];
  const noop = (name: string) => (...a: unknown[]) => (calls.push(name), a[0]);
  const raw = {
    currentUser: developer,
    effectiveUser: actor,
    viewAsUser: null,
    users,
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
    timelineEvents: [],
    notifications: [],
    auditLogs: [],
    jobPositions: seed.initialJobPositions,
    departmentEntities: seed.initialDepartments,
    permissionMatrix: structuredClone(defaultPermissionMatrix),
    reviewRequests: [complaint, praise],
    reviewNotes: [],
    requestReview: noop("requestReview"),
    markReviewReminderSent: noop("markReviewReminderSent"),
    cancelReviewRequest: noop("cancelReviewRequest"),
    addReviewNote: noop("addReviewNote"),
    saveReviewAnalysis: noop("saveReviewAnalysis"),
    findDuplicateLeadsByPhone: () => [],
  } as unknown as CRMContextType;
  return { v: createWorkspace(raw), calls };
}

test("reviews are scoped like the customer they belong to", () => {
  assert.equal(view(employee).v.reviewRequests.length, 2);
  assert.equal(view(manager).v.reviewRequests.length, 2);
  assert.equal(view(otherManager).v.reviewRequests.length, 0);
});

test("only managers add follow-ups to a complaint, never to praise, never outside their branch", () => {
  const m = view(manager);
  m.v.addReviewNote(complaint.id, "اتصلت بالعميل", "note");
  assert.deepEqual(m.calls, ["addReviewNote"]);
  assert.throws(() => m.v.addReviewNote(praise.id, "x", "note"));
  assert.throws(() => m.v.addReviewNote(complaint.id, "   ", "note"));
  assert.throws(() => view(employee).v.addReviewNote(complaint.id, "x", "note"));
  assert.throws(() => view(otherManager).v.addReviewNote(complaint.id, "x", "note"));
  assert.equal(view(developer).calls.length, 0);
  view(developer).v.addReviewNote(complaint.id, "x", "resolved");
});

test("cancelling a request needs a reason and a visible request", () => {
  const e = view(employee);
  assert.throws(() => e.v.cancelReviewRequest(complaint.id, ""));
  e.v.cancelReviewRequest(complaint.id, "العميل مش مهتم");
  assert.throws(() => view(otherManager).v.cancelReviewRequest(complaint.id, "x"));
});

test("a complaint with no follow-up for 24h is late; any note or resolution stops the escalation", () => {
  const c = req({ status: "answered", sentAt: sentAt(40), answeredAt: sentAt(30), response: { rating: 1 } });
  const fresh = req({ id: "f".repeat(24), status: "answered", sentAt: sentAt(10), answeredAt: sentAt(5), response: { rating: 1 } });
  assert.equal(isLateComplaint(c, []), true);
  assert.equal(isLateComplaint(fresh, []), false);
  const note = (kind: ReviewNote["kind"], hoursAgo: number): ReviewNote => ({ id: kind + hoursAgo, requestId: c.id, text: "x", kind, byId: "m", byName: "مدير", at: sentAt(hoursAgo) });
  assert.equal(isLateComplaint(c, [note("note", 2)]), false);
  assert.equal(resolutionHours(c, []), null);
  assert.equal(resolutionHours(c, [note("note", 20), note("resolved", 10)]), 20);
  const st = reviewStats([c, fresh, req({ id: "s".repeat(24) })], [note("resolved", 10)]);
  assert.equal(st.sent, 3);
  assert.equal(st.answered, 2);
  assert.equal(st.complaints.total, 2);
  assert.equal(st.complaints.resolved, 1);
  assert.equal(st.complaints.open, 1);
  assert.equal(st.complaints.late, 0);
  assert.equal(st.complaints.avgResolutionHours, 20);
});
