import test from "node:test";
import assert from "node:assert/strict";
import { greetingName, splitTitle, withTitle } from "../src/lib/names";

test("titles are split from and joined to the name", () => {
  assert.deepEqual(splitTitle("م. أحمد علي"), { title: "م.", name: "أحمد علي" });
  assert.deepEqual(splitTitle("المهندس طارق"), { title: "المهندس", name: "طارق" });
  assert.deepEqual(splitTitle("الحاج منصور عبد الغني"), { title: "الحاج", name: "منصور عبد الغني" });
  assert.deepEqual(splitTitle("أحمد محمود"), { title: "", name: "أحمد محمود" });
  assert.deepEqual(splitTitle("مصطفى كمال"), { title: "", name: "مصطفى كمال" }); // not a title just because it starts with م
  assert.equal(withTitle("م.", "أحمد"), "م. أحمد");
  assert.equal(withTitle("", "أحمد"), "أحمد");
  assert.equal(withTitle("د.", "  "), "");
});

test("greeting keeps the title the customer prefers", () => {
  assert.equal(greetingName("م. أحمد علي"), "م. أحمد");
  assert.equal(greetingName("الحاجة فاطمة السيد"), "الحاجة فاطمة");
  assert.equal(greetingName("سلوى محسن"), "سلوى");
});
