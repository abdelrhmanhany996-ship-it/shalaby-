import test from "node:test";
import assert from "node:assert/strict";
import { cleanLines, describeLine, grandTotal, lineTotal, productsLabel } from "../src/lib/purchaseLines";
import { purchaseFromItems } from "../src/lib/purchases";

test("a line is price x pieces when both are typed, otherwise the typed total", () => {
  assert.equal(lineTotal({ price: 150, qty: 2, total: 0 }), 300);
  assert.equal(lineTotal({ price: 19.99, qty: 3, total: 0 }), 59.97);
  assert.equal(lineTotal({ total: 500 }), 500);
  assert.equal(lineTotal({ price: 150, total: 80 }), 80, "price without pieces does not multiply");
  assert.equal(lineTotal({ price: -5, qty: 2, total: 10 }), 10, "negative numbers are ignored");
});

test("the grand total adds the lines; empty rows are dropped; stored totals are recomputed", () => {
  const lines = cleanLines([
    { name: " كرسي ", price: 150, qty: 2, total: 1 },
    { name: "طاولة", total: 1200 },
    { name: "", total: 0 },
    { name: "هدية", total: 0 },
  ]);
  assert.deepEqual(lines.map((l) => [l.name, l.total]), [["كرسي", 300], ["طاولة", 1200], ["هدية", 0]]);
  assert.equal(grandTotal(lines), 1500);
});

test("lines read back in plain Arabic, and name the purchase", () => {
  assert.equal(describeLine({ name: "كرسي", price: 150, qty: 2, total: 300 }), "كرسي × 2 قطعة بسعر 150 = 300 ج.م");
  assert.equal(describeLine({ name: "طاولة", total: 1200 }), "طاولة = 1,200 ج.م");
  assert.equal(productsLabel(undefined), "عملية بيع");
  assert.equal(productsLabel([{ name: "كرسي", total: 1 }, { name: "كرسي", total: 1 }, { name: "طاولة", total: 1 }]), "كرسي + طاولة");
  assert.equal(productsLabel(["أ", "ب", "ج", "د", "هـ"].map((name) => ({ name, total: 1 }))), "أ + ب + ج + 2");
});

test("a purchase with typed items keeps them and is named after the products; without items it is the old single amount", () => {
  const items = [{ categoryId: "cat-misc", categoryName: "عملية بيع", amount: 1500 }];
  const withLines = purchaseFromItems(items, [{ name: "كرسي", price: 150, qty: 2, total: 0 }, { name: "طاولة", total: 1200 }]);
  assert.equal(withLines.amount, 1500);
  assert.equal(withLines.courseName, "كرسي + طاولة");
  assert.equal(withLines.lines?.length, 2);
  const plain = purchaseFromItems(items);
  assert.equal(plain.courseName, "عملية بيع");
  assert.equal("lines" in plain, false);
});
