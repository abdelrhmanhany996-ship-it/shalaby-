import test from "node:test";
import assert from "node:assert/strict";
import { bookingFor, confirmation, parseItems, planCustomer, planSale, resolveCustomer } from "../src/lib/zakiActions";
import type { Lead } from "../src/types/crm";

const lead = (over: Partial<Lead> = {}): Lead =>
  ({ id: "l1", name: "أولاد مسعود", phone: "01012345678", branchId: "b1", source: "phone_inquiry", assignedAgentId: "u1", ...over }) as Lead;
const leads = [lead(), lead({ id: "l2", name: "محمد علي", phone: "01122334455" }), lead({ id: "l3", name: "محمد حسن", phone: "01222222222" })];
const TODAY = "2026-10-29";

test("finds the customer by phone, id or a part of the name, and asks when it is not clear", () => {
  assert.equal((resolveCustomer(leads, { phone: "+20 101 234 5678" }) as any).lead.id, "l1");
  assert.equal((resolveCustomer(leads, { id: "l2" }) as any).lead.id, "l2");
  assert.equal((resolveCustomer(leads, { name: "مسعود" }) as any).lead.id, "l1");
  assert.equal(resolveCustomer(leads, { name: "محمد" }).kind, "ambiguous");
  assert.equal(resolveCustomer(leads, { name: "حد تاني" }).kind, "none");
});

test("a sale for an existing customer shows exactly what will be saved", () => {
  const p = planSale({ customer: "مسعود", items: [{ name: "AC10-2Hp/380", qty: 2, price: 4500 }, { name: "AC10-2Hp/220", qty: 1, price: 3900 }] }, leads, TODAY);
  assert.ok(p.ok);
  if (!p.ok) return;
  assert.equal(p.action.leadId, "l1");
  assert.equal(p.action.total, 12900);
  assert.ok(p.action.summary.some((l) => l.includes("12,900")));
  assert.ok(p.action.summary[0].includes("أولاد مسعود"));
});

test("a customer that is not registered needs a phone, and then is registered with the sale", () => {
  const items = [{ name: "جهاز", price: 1000 }];
  const noPhone = planSale({ customer: "عميل جديد", items }, leads, TODAY);
  assert.ok(!noPhone.ok && noPhone.result.status === "customer_not_found");
  const withPhone = planSale({ customer: "عميل جديد", phone: "01099998888", items }, leads, TODAY);
  assert.ok(withPhone.ok);
  if (withPhone.ok) {
    assert.equal(withPhone.action.newCustomer?.name, "عميل جديد");
    assert.equal(withPhone.action.leadId, undefined);
  }
});

test("missing or doubtful details are asked for, never guessed", () => {
  assert.ok(!planSale({ customer: "مسعود", items: [] }, leads, TODAY).ok);
  assert.ok(!planSale({ customer: "مسعود", items: [{ name: "جهاز", qty: 2 }] }, leads, TODAY).ok);
  assert.ok(!planSale({ customer: "مسعود", items: [{ price: 100 }] }, leads, TODAY).ok);
  assert.ok(!planSale({ customer: "مسعود", items: [{ name: "جهاز", price: 100 }], date: "2026-12-01" }, leads, TODAY).ok);
  const amb = planSale({ customer: "محمد", items: [{ name: "جهاز", price: 100 }] }, leads, TODAY);
  assert.ok(!amb.ok && amb.result.status === "ambiguous_customer");
});

test("registering a customer refuses a bad phone and an existing customer", () => {
  assert.ok(!planCustomer({ name: "س", phone: "123" }, leads).ok);
  const dup = planCustomer({ name: "س", phone: "01012345678" }, leads);
  assert.ok(!dup.ok && dup.result.status === "already_exists");
  const ok = planCustomer({ name: "سعيد", phone: "01055556666", notes: "من المعرض" }, leads);
  assert.ok(ok.ok && ok.action.kind === "customer");
});

test("the booking carries the typed lines and the date", () => {
  const p = planSale({ customer: "مسعود", items: [{ name: "جهاز", qty: 2, price: 500 }], date: "2026-10-27", note: "نقدي" }, leads, TODAY);
  assert.ok(p.ok);
  if (!p.ok) return;
  const b = bookingFor(leads[0], p.action, "u1");
  assert.equal(b.amount, 1000);
  assert.equal(b.bookingDate, "2026-10-27");
  assert.deepEqual(b.lines?.[0], { name: "جهاز", price: 500, qty: 2, total: 1000 });
  assert.match(b.notes, /نقدي/);
});

test("only a short yes or no confirms; anything with more in it goes back to the model", () => {
  for (const t of ["تمام", "تمام سجل", "أيوه", "اه سجلها", "ok", "ماشي، سجل!"]) assert.equal(confirmation(t), "yes", t);
  for (const t of ["لا", "الغي", "لأ بلاش", "cancel", "مش عاوز اسجلها"]) assert.equal(confirmation(t), "no", t);
  for (const t of ["تمام بس خليها 500", "سجل عميل جديد اسمه سعيد", "كام الاجمالي؟", "عاوز اعدل السعر", "عاوز", ""]) assert.equal(confirmation(t), null, t);
  assert.deepEqual(parseItems("x").lines, []);
});
