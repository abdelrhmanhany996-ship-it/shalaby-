import test from "node:test";
import assert from "node:assert/strict";
import * as demo from "../src/data/demoData";
import { briefVersion, buildCustomerBrief, type BriefInput } from "../src/lib/customerBrief";

const input = (leadIndex = 0): BriefInput => ({
  lead: demo.demoLeads[leadIndex],
  visits: demo.demoVisits,
  followUps: demo.demoFollowUps,
  bookings: demo.demoBookings,
  notBoughtRecords: demo.demoNotBought,
  reviewRequests: demo.demoReviews,
  reviewNotes: [],
  timelineEvents: demo.demoTimeline,
});

test("the brief carries only this customer's records and stays compact", () => {
  const i = input();
  const b = buildCustomerBrief(i);
  assert.equal(b.customer.name, i.lead.name);
  assert.ok(b.visits.length <= 6 && b.followUps.length <= 8 && b.recentHistory.length <= 12);
  assert.ok(JSON.stringify(b).length < 20_000);
  const others = new Set(demo.demoLeads.filter((l) => l.id !== i.lead.id).map((l) => l.name));
  assert.ok(!b.followUps.some((f) => others.has(f.reason ?? "")));
});

test("a saved brief is replaced when something new is recorded about the customer", () => {
  const i = input();
  const before = briefVersion(i);
  assert.equal(briefVersion({ ...i }), before);
  const withEvent = { ...i, timelineEvents: [...i.timelineEvents, { id: "n", leadId: i.lead.id, timestamp: "2099-01-01T00:00:00Z", authorId: "u", authorName: "x", type: "note" as const, title: "t", details: "" }] };
  assert.notEqual(briefVersion(withEvent), before);
  // an event on someone else's file does not invalidate this one
  const other = { ...i, timelineEvents: [...i.timelineEvents, { id: "m", leadId: "someone-else", timestamp: "2099-01-01T00:00:00Z", authorId: "u", authorName: "x", type: "note" as const, title: "t", details: "" }] };
  assert.equal(briefVersion(other), before);
});
