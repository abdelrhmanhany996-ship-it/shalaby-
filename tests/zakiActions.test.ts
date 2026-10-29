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

import { planFollowUp, planFollowUpDone, planFollowUpMove, planNote, planQuote, planQuoteStatus, planReassign, planTarget, type PlanData } from "../src/lib/zakiActions";
import { performAction } from "../src/lib/zakiPerform";
import type { FollowUp, Quote, User } from "../src/types/crm";

const quote = (over: Partial<Quote> = {}): Quote =>
  ({ id: "q1", number: "Q-261029-01", date: TODAY, leadId: "l1", leadName: "أولاد مسعود", leadPhone: "01012345678", addressedTo: "x", branchId: "b1", agentId: "u1", lines: [{ name: "جهاز", price: 100, qty: 2, total: 200 }], total: 200, terms: [], status: "sent", createdAt: "", updatedAt: "", ...over }) as Quote;
const fup = (over: Partial<FollowUp> = {}): FollowUp =>
  ({ id: "f1", leadId: "l1", leadName: "أولاد مسعود", leadPhone: "1", assignedAgentId: "u1", branchId: "b1", scheduledAt: "2026-10-30", reason: "عرض سعر", type: "call", notes: "", status: "upcoming", ...over }) as FollowUp;
const users = [
  { id: "u1", name: "أحمد", role: "sales_agent", active: true, branchId: "b1" },
  { id: "u2", name: "منى", role: "sales_agent", active: true, branchId: "b1" },
] as User[];
const data = (over: Partial<PlanData> = {}): PlanData => ({ leads, quotes: [quote()], followUps: [fup()], users, today: TODAY, me: { id: "u1", name: "أحمد" }, ...over });

test("a quote is prepared for a registered customer; sent=true promises the 3-day follow-up", () => {
  const draft = planQuote({ customer: "مسعود", items: [{ name: "جهاز", qty: 2, price: 100 }] }, data());
  assert.ok(draft.ok && draft.action.quote?.send === false && draft.action.total === 200);
  const sent = planQuote({ customer: "مسعود", items: [{ name: "جهاز", qty: 2, price: 100 }], sent: true }, data());
  assert.ok(sent.ok && sent.action.summary.some((l) => l.includes("3 أيام")));
  assert.ok(!planQuote({ customer: "غريب", items: [{ name: "جهاز", price: 1 }] }, data()).ok);
});

test("quote status: by number or customer, only open quotes, accepted means a sale", () => {
  const acc = planQuoteStatus({ quote: "Q-261029-01", status: "accepted" }, data());
  assert.ok(acc.ok && acc.action.quoteStatus === "accepted" && acc.action.summary.some((l) => l.includes("بيع")));
  assert.ok(!planQuoteStatus({ customer: "مسعود", status: "sent" }, data()).ok); // already sent
  assert.ok(!planQuoteStatus({ customer: "مسعود", status: "weird" }, data()).ok);
  assert.ok(!planQuoteStatus({ customer: "مسعود", status: "lost" }, data({ quotes: [quote({ status: "accepted" })] })).ok);
});

test("follow-ups: schedule needs a future date and a reason; closing and moving need the right follow-up", () => {
  assert.ok(planFollowUp({ customer: "مسعود", date: "2026-11-02", reason: "يرد على العرض", time: "11:30" }, data()).ok);
  assert.ok(!planFollowUp({ customer: "مسعود", date: "2026-10-01", reason: "x" }, data()).ok);
  assert.ok(!planFollowUp({ customer: "مسعود", date: "2026-11-02" }, data()).ok);
  const done = planFollowUpDone({ follow_up_id: "f1", result: "هيرد يوم الأحد", next_date: "2026-11-01" }, data());
  assert.ok(done.ok && done.action.followUp?.nextDate === "2026-11-01");
  assert.ok(!planFollowUpDone({ follow_up_id: "f1", result: "x" }, data({ me: { id: "u2", name: "منى" } })).ok); // not theirs
  assert.ok(planFollowUpMove({ follow_up_id: "f1", new_date: "2026-11-05", reason: "العميل مسافر" }, data()).ok);
  assert.ok(!planFollowUpMove({ follow_up_id: "f1", new_date: "2026-10-30", reason: "x" }, data()).ok); // same day
  assert.ok(planFollowUpMove({ follow_up_id: "f1", new_date: "2026-11-05", reason: "x" }, data({ me: { id: "m", name: "المدير" } }), true).ok); // a manager
});

test("notes, targets and hand-overs", () => {
  assert.ok(planNote({ customer: "مسعود", note: "طلب خصم" }, data()).ok);
  assert.ok(!planNote({ customer: "مسعود" }, data()).ok);
  const t = planTarget({ agent: "منى", amount: 200000 }, data());
  assert.ok(t.ok && t.action.target?.month === "2026-10" && t.action.target.userId === "u2");
  assert.ok(!planTarget({ agent: "منى", amount: -5 }, data()).ok);
  assert.ok(planReassign({ customer: "مسعود", agent: "منى" }, data()).ok);
  assert.ok(!planReassign({ customer: "مسعود", agent: "أحمد" }, data()).ok); // already his
});

test("performing a confirmed action calls the right operation and says what happens next", () => {
  const calls: string[] = [];
  const ctx: any = {
    leads, quotes: [quote()], me: { id: "u1", name: "أحمد", branchId: "b1" }, firstBranchId: "b1", newCustomerAgentId: () => "u1", interestNames: () => "x",
    findDuplicateLeadsByPhone: () => [],
    addLead: (d: any) => (calls.push("addLead"), { ...leads[0], id: "new", name: d.name }),
    addBooking: () => (calls.push("addBooking"), {}),
    saveQuote: (_i: any, o: any) => (calls.push(`saveQuote:${o.send}`), { number: "Q-1", total: 200, followUpId: o.send ? "f9" : undefined }),
    setQuoteStatus: (_id: string, s: string) => calls.push(`status:${s}`),
    acceptQuote: () => calls.push("accept"),
    addFollowUp: () => calls.push("addFollowUp"),
    updateFollowUpResult: () => calls.push("done"),
    rescheduleFollowUp: () => calls.push("move"),
    updateLead: () => calls.push("updateLead"),
    addTimelineEvent: () => calls.push("timeline"),
    setEmployeeTarget: () => calls.push("target"),
    reassignLead: () => calls.push("reassign"),
  };
  const plan = (p: any) => (p.ok ? p.action : assert.fail(JSON.stringify(p.result)));
  const sale = performAction(plan(planSale({ customer: "عميل جديد", phone: "01099998888", items: [{ name: "جهاز", price: 100 }] }, leads, TODAY)), ctx);
  assert.deepEqual(calls.splice(0), ["addLead", "addBooking"]);
  assert.match(sale, /7 أيام/);
  const sent = performAction(plan(planQuote({ customer: "مسعود", items: [{ name: "جهاز", price: 100 }], sent: true }, data())), ctx);
  assert.deepEqual(calls.splice(0), ["saveQuote:true"]);
  assert.match(sent, /3 أيام/);
  performAction(plan(planQuoteStatus({ quote: "Q-261029-01", status: "accepted" }, data())), ctx);
  performAction(plan(planFollowUp({ customer: "مسعود", date: "2026-11-02", reason: "x" }, data())), ctx);
  performAction(plan(planFollowUpDone({ follow_up_id: "f1", result: "تمام" }, data())), ctx);
  performAction(plan(planNote({ customer: "مسعود", note: "ن" }, data())), ctx);
  assert.deepEqual(calls.splice(0), ["accept", "addFollowUp", "done", "updateLead", "timeline"]);
});

test("numbers typed in Arabic script (phone, dates, times) work like 0-9", () => {
  const p = planSale({ customer: "عميل جديد", phone: "٠١٠٩٩٩٩٨٨٨٨", items: [{ name: "جهاز", price: 100 }] }, leads, TODAY);
  assert.ok(p.ok && p.action.newCustomer?.phone === "01099998888");
  assert.ok(planFollowUp({ customer: "مسعود", date: "٢٠٢٦-١١-٠٢", time: "١١:٣٠", reason: "x" }, data()).ok);
  assert.ok(planCustomer({ name: "سعيد", phone: "٠١٠٥٥٥٥٥٦٦٦٦" }, leads).ok);
  assert.equal((resolveCustomer(leads, { phone: "٠١٠١٢٣٤٥٦٧٨" }) as any).lead.id, "l1");
});
