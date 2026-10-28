import test from "node:test";
import assert from "node:assert/strict";
import { displayLoginId, isValidLoginId, normalizeLoginId, toAuthEmail } from "../src/lib/loginId";

test("mobile numbers are normalised from any format and Arabic digits", () => {
  assert.equal(normalizeLoginId("010 1234 5678"), "01012345678");
  assert.equal(normalizeLoginId("+20 10 1234 5678"), "01012345678");
  assert.equal(normalizeLoginId("٠١٠١٢٣٤٥٦٧٨"), "01012345678");
  assert.equal(normalizeLoginId("0020-10-12345678"), "01012345678");
});

test("usernames and e-mails are supported too", () => {
  assert.equal(toAuthEmail("Omar.Khaled"), "omar.khaled@staff.shalaby.local");
  assert.equal(toAuthEmail("Boss@Example.com"), "boss@example.com");
  assert.equal(toAuthEmail("01012345678"), "01012345678@staff.shalaby.local");
  assert.equal(displayLoginId("01012345678@staff.shalaby.local"), "01012345678");
  assert.equal(displayLoginId("boss@example.com"), "boss@example.com");
});

test("validation rejects junk", () => {
  assert.ok(isValidLoginId("01012345678"));
  assert.ok(isValidLoginId("omar.khaled"));
  assert.ok(!isValidLoginId("12"));
  assert.ok(!isValidLoginId("a b"));
  assert.ok(!isValidLoginId("x@y"));
});
