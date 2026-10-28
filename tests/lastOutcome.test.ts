import test from "node:test";
import assert from "node:assert/strict";
import { lastOutcome } from "../src/lib/purchases";

const buy = (over = {}) => ({ leadId: "l1", bookingStatus: "confirmed" as const, bookingDate: "2026-10-10", createdAt: "2026-10-10T10:00:00Z", amount: 38000, courseName: "ديكور", ...over });

test("a customer who never bought is still asked", () => {
  assert.deepEqual(lastOutcome("l1", [], []), { kind: "ask" });
  assert.deepEqual(lastOutcome("l1", [buy({ leadId: "other" })], []), { kind: "ask" });
});

test("when the latest result is a purchase, show when they last bought instead of asking", () => {
  const r = lastOutcome("l1", [buy(), buy({ createdAt: "2026-10-18T10:00:00Z", bookingDate: "2026-10-18", amount: 9000 })], []);
  assert.deepEqual(r, { kind: "bought", date: "2026-10-18", amount: 9000, what: "ديكور" });
});

test("a later visit that ended with 'not yet' reopens the question; a later purchase closes it again", () => {
  const nb = [{ leadId: "l1", createdAt: "2026-10-12T10:00:00Z" }];
  assert.equal(lastOutcome("l1", [buy()], nb).kind, "ask");
  assert.equal(lastOutcome("l1", [buy(), buy({ createdAt: "2026-10-15T10:00:00Z" })], nb).kind, "bought");
});

test("cancelled purchases do not count", () => {
  assert.equal(lastOutcome("l1", [buy({ bookingStatus: "cancelled" as never })], []).kind, "ask");
});
