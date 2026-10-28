import test from "node:test";
import assert from "node:assert/strict";
import { buildSnapshot } from "../src/lib/aiSnapshot";
import * as demo from "../src/data/demoData";
import * as seed from "../src/data/initialData";

test("snapshot is compact, scoped to what is passed in, and has no payment/salary fields", () => {
  const snap = buildSnapshot({
    user: seed.initialUsers[0],
    scope: "جميع الفروع",
    leads: demo.demoLeads,
    bookings: demo.demoBookings,
    followUps: demo.demoFollowUps,
    visits: demo.demoVisits,
    notBoughtRecords: demo.demoNotBought,
    brokers: demo.demoBrokers,
    users: [...seed.initialUsers, ...demo.demoUsers],
    branches: seed.initialBranches,
  });
  const json = JSON.stringify(snap);
  assert.ok(json.length < 90_000, `snapshot too large: ${json.length}`);
  assert.ok(snap.totals.purchasesTotalEGP > 4_000_000);
  assert.ok(snap.topCustomers[0].totalEGP >= snap.topCustomers[1].totalEGP);
  assert.ok(snap.notBought.reasons.length > 3);
  assert.ok(snap.openFollowUps.some((f) => f.status === "overdue"));
  const keys: string[] = [];
  JSON.stringify(snap, (k, v) => (keys.push(k), v));
  assert.ok(!keys.some((k) => /salary|commission|payment|payroll/i.test(k)));
  // a viewer who sees nothing gets an empty picture (no leakage)
  const empty = buildSnapshot({
    user: seed.initialUsers[0], scope: "x", leads: [], bookings: [], followUps: [], visits: [],
    notBoughtRecords: [], brokers: [], users: [], branches: [],
  });
  assert.equal(empty.totals.purchasesTotalEGP, 0);
  assert.equal(empty.customers.length, 0);
});
