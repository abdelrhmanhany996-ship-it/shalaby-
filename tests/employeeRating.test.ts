import test from "node:test";
import assert from "node:assert/strict";
import type { FollowUp, ReviewRequest, User } from "../src/types/crm";
import { employeeRatings, levelOf, scoreOf } from "../src/lib/employeeRating";
import { hasReferral, isReferralPhone, pendingReferral, phoneKey, referrerRows } from "../src/lib/referrals";

const NOW = Date.parse("2026-10-20T12:00:00Z");
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const agent = (id: string): User => ({ id, name: id, role: "sales_agent", branchId: "b1" }) as User;
const review = (agentId: string, rating: number, daysAgo = 1, over: Partial<ReviewRequest> = {}): ReviewRequest =>
  ({ id: `r-${agentId}-${rating}-${daysAgo}-${Math.random()}`, leadId: "l", leadName: "x", branchId: "b1", agentId, subjectKind: "visit", subjectLabel: "", sentAt: day(daysAgo + 1), status: "answered", answeredAt: day(daysAgo), response: { rating }, ...over }) as ReviewRequest;

test("one 5-star rating does not beat fifty 4.8 ratings; the score settles on the real average as ratings pile up", () => {
  const one = scoreOf([5]);
  const many = scoreOf(Array(50).fill(4.8));
  assert.equal(one.average, 5);
  assert.ok(one.score! < many.score!);
  assert.ok(Math.abs(many.score! - 4.8) < 0.1);
  assert.deepEqual(scoreOf([]), { average: null, score: null });
});

test("levels need three ratings before they judge", () => {
  assert.equal(levelOf(2, 5), "new");
  assert.equal(levelOf(10, 4.7), "excellent");
  assert.equal(levelOf(10, 4.2), "good");
  assert.equal(levelOf(10, 3.2), "needs_work");
});

test("ratings come from review links and post-sale satisfaction, per employee, with complaints and reply rate", () => {
  const reviews = [
    review("a", 5), review("a", 5), review("a", 4),
    review("a", 1, 2, { isComplaint: true }),
    review("a", 0, 3, { status: "sent", response: undefined, answeredAt: undefined }),
    review("b", 3),
  ];
  const calls = [{ id: "f", status: "completed", satisfactionRating: 5, assignedAgentId: "a", completedAt: day(1) }] as FollowUp[];
  const [first, second] = employeeRatings([agent("a"), agent("b"), { ...agent("m"), role: "branch_manager" } as User], reviews, calls, NOW);
  assert.equal(first.userId, "a");
  assert.equal(first.count, 5);
  assert.equal(first.average, 4);
  assert.equal(first.complaints, 1);
  assert.equal(first.responseRatePercent, 80);
  assert.equal(second.userId, "b");
  // the branch sales manager sells too, so they carry a rating; an owner or a developer does not
  const people = [agent("a"), { ...agent("m"), role: "branch_manager" } as User, { ...agent("o"), role: "general_manager" } as User, { ...agent("d"), role: "admin" } as User];
  assert.deepEqual(employeeRatings(people, [], [], NOW).map((r) => r.userId).sort(), ["a", "m"]);
});

test("trend compares the last 30 days with before", () => {
  const rs = [review("a", 5, 2), review("a", 5, 5), review("a", 3, 60), review("a", 3, 70)];
  assert.equal(employeeRatings([agent("a")], rs, [], NOW)[0].trend, "up");
});

test("phones match across formats; a referral waits until someone registers it", () => {
  assert.equal(phoneKey("+20 101 234 5678"), phoneKey("01012345678"));
  assert.equal(isReferralPhone("123"), false);
  const r = review("a", 5, 1, { response: { rating: 5, referral: { name: "س", phone: "01012345678" } } });
  assert.equal(pendingReferral(r), true);
  assert.equal(pendingReferral({ ...r, referralLeadId: "ld" }), false);
});

test("referrers are ranked by what the people they brought bought", () => {
  const leads = [
    { id: "p", name: "العميل", branchId: "b1", status: "booked" },
    { id: "x", name: "x", branchId: "b1", referredByLeadId: "p", referredByName: "العميل", status: "booked" },
    { id: "y", name: "y", branchId: "b1", referredByLeadId: "p", referredByName: "العميل", status: "uncontacted" },
  ] as never[];
  const rows = referrerRows(leads, [{ leadId: "x", amount: 7000, bookingStatus: "confirmed" }] as never[]);
  assert.deepEqual(rows[0], { leadId: "p", name: "العميل", branchId: "b1", referred: 2, visited: 1, bought: 1, totalEGP: 7000 });
});

test("a recommendation counts only from a customer who rated 4 or 5", () => {
  const ref = { name: "س", phone: "01012345678" };
  assert.equal(hasReferral(review("a", 5, 1, { response: { rating: 5, referral: ref } })), true);
  assert.equal(hasReferral(review("a", 4, 1, { response: { rating: 4, referral: ref } })), true);
  assert.equal(hasReferral(review("a", 3, 1, { response: { rating: 3, referral: ref } })), false);
  assert.equal(pendingReferral(review("a", 2, 1, { response: { rating: 2, referral: ref } })), false);
});
