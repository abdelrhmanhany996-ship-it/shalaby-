import test from "node:test";
import assert from "node:assert/strict";
import { brokerRows, customerRows, departmentLeaders } from "../src/lib/overview";
import type { Booking, BrokerEntity, Lead } from "../src/types/crm";

const lead = (id: string, extra: Partial<Lead> = {}) =>
  ({ id, name: id, phone: "0", branchId: "br", ...extra }) as Lead;
const buy = (leadId: string, amount: number, split?: Booking["departmentAmounts"], status = "confirmed") =>
  ({
    id: `${leadId}-${amount}`,
    leadId,
    bookingDate: "2026-10-01",
    department: "decor",
    amount,
    departmentAmounts: split,
    bookingStatus: status,
  }) as Booking;
const broker = (id: string) => ({ id, name: id, type: "individual", active: true }) as BrokerEntity;

const leads = [lead("a", { brokerId: "b1" }), lead("b", { brokerId: "b1" }), lead("c", { brokerId: "b2" }), lead("d")];
const bookings = [
  buy("a", 1_000_000, { garden: 500_000, decor: 250_000, general: 250_000 }),
  buy("b", 200_000, { decor: 200_000 }),
  buy("c", 900_000, { garden: 900_000 }),
  buy("c", 50_000, { garden: 50_000 }, "cancelled"),
  buy("d", 10),
];

test("customers are ranked by total purchases and cancelled ones are ignored", () => {
  const rows = customerRows(bookings, leads);
  assert.deepEqual(rows.map((r) => [r.leadId, r.total]), [["a", 1_000_000], ["c", 900_000], ["b", 200_000], ["d", 10]]);
  assert.equal(rows[0].split.garden, 500_000);
});

test("brokers are ranked by what their customers bought, with the inner split", () => {
  const customers = customerRows(bookings, leads);
  const rows = brokerRows(customers, leads, [broker("b1"), broker("b2"), broker("b3")]);
  assert.deepEqual(rows.map((r) => [r.brokerId, r.total]), [["b1", 1_200_000], ["b2", 900_000]]);
  assert.equal(rows[0].split.decor, 450_000);
  assert.equal(rows[0].buyers.length, 2);
});

test("department leaders list who buys the most garden and decor", () => {
  const customers = customerRows(bookings, leads);
  const brokers = brokerRows(customers, leads, [broker("b1"), broker("b2")]);
  const lead = departmentLeaders(customers, brokers);
  assert.equal(lead.garden.top[0].leadId, "c");
  assert.equal(lead.garden.topBroker?.name, "b2");
  assert.equal(lead.decor.top[0].leadId, "a");
  assert.equal(lead.construction.buyers, 0);
});
