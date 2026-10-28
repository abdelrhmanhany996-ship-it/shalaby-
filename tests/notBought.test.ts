import test from "node:test";
import assert from "node:assert/strict";
import { toggleReason } from "../src/lib/notBought";

test("at most two reasons can be selected; the oldest is dropped", () => {
  let r = toggleReason([], "price");
  r = toggleReason(r, "comparing");
  r = toggleReason(r, "other");
  assert.deepEqual(r, ["comparing", "other"]);
});

test("'unknown' is exclusive and replaces any other selection", () => {
  assert.deepEqual(toggleReason(["price", "other"], "unknown"), ["unknown"]);
  assert.deepEqual(toggleReason(["unknown"], "price"), ["price"]);
  assert.deepEqual(toggleReason(["unknown"], "unknown"), []);
});

test("selecting a chosen reason again removes it", () => {
  assert.deepEqual(toggleReason(["price", "other"], "price"), ["other"]);
});
