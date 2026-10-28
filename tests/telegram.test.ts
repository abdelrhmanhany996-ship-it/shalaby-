import test from "node:test";
import assert from "node:assert/strict";
import { edited, filterGroups, newGroup, normalizeTelegramLink } from "../src/lib/telegram";

const by = { id: "u1", name: "مدير" };

test("only real Telegram links are accepted, tidied, and nothing else", () => {
  assert.equal(normalizeTelegramLink("https://t.me/+AbC123xyz"), "https://t.me/+AbC123xyz");
  assert.equal(normalizeTelegramLink("t.me/shalaby_sales"), "https://t.me/shalaby_sales");
  assert.equal(normalizeTelegramLink("@shalaby_sales"), "https://t.me/shalaby_sales");
  assert.equal(normalizeTelegramLink("http://telegram.me/shalaby/?utm=x#y"), "https://telegram.me/shalaby");
  assert.equal(normalizeTelegramLink("tg://join?invite=AbC123"), "tg://join?invite=AbC123");
  for (const bad of ["", "  ", "https://evil.com/t.me/x", "https://t.me.evil.com/abc", "javascript:alert(1)", "https://t.me/", "https://t.me/a", "ftp://t.me/abc", "https://example.com", "tg://evil?x=1", "https://t.me/ab cd", "data:text/html,x"]) {
    assert.equal(normalizeTelegramLink(bad), null, bad);
  }
});

test("a group needs a name and a real link; the description is trimmed and capped", () => {
  const g = newGroup({ name: " جروب المبيعات ", link: "t.me/sales_team", description: "  " + "ا".repeat(400), branchId: "b1" }, "tg1", by, "t");
  assert.equal(g.name, "جروب المبيعات");
  assert.equal(g.link, "https://t.me/sales_team");
  assert.equal(g.description?.length, 300);
  assert.deepEqual([g.branchId, g.active, g.createdByName], ["b1", true, "مدير"]);
  assert.equal(newGroup({ name: "جروب", link: "t.me/abc" }, "x", by, "t").branchId, undefined);
  assert.throws(() => newGroup({ name: "ا", link: "t.me/abc" }, "x", by, "t"));
  assert.throws(() => newGroup({ name: "جروب", link: "https://evil.com" }, "x", by, "t"));
});

test("editing keeps the author and date and checks the link again", () => {
  const g = newGroup({ name: "جروب", link: "t.me/abc_def" }, "tg1", by, "t0");
  const e = edited(g, { name: "اسم جديد", link: "@new_group", branchId: "b2" }, "t1");
  assert.deepEqual([e.id, e.name, e.link, e.branchId, e.createdAt, e.createdById, e.updatedAt], ["tg1", "اسم جديد", "https://t.me/new_group", "b2", "t0", "u1", "t1"]);
  assert.throws(() => edited(g, { name: "جروب", link: "javascript:x" }, "t1"));
});

test("filter by text and branch; active groups first", () => {
  const mk = (id: string, name: string, over = {}) => ({ ...newGroup({ name, link: "t.me/abcde" }, id, by, "t"), ...over });
  const list = [mk("a", "زبائن القاهرة", { branchId: "b1" }), mk("b", "عام"), mk("c", "الإدارة", { active: false }), mk("d", "مبيعات القاهرة", { branchId: "b1" })];
  assert.equal(filterGroups(list, "", "").length, 4);
  assert.deepEqual(filterGroups(list, "القاهرة", "").map((g) => g.id).sort(), ["a", "d"]);
  assert.deepEqual(filterGroups(list, "", "b1").map((g) => g.id).sort(), ["a", "d"]);
  assert.deepEqual(filterGroups(list, "", "none").map((g) => g.id).sort(), ["b", "c"]);
  assert.equal(filterGroups(list, "", "").at(-1)!.id, "c"); // the stopped one is last
});
