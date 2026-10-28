import test from "node:test";
import assert from "node:assert/strict";
import type { ReviewNote, ReviewRequest, TimelineEvent } from "../src/types/crm";
import { buildTimeline, cleanEvent, dayLabel } from "../src/lib/timeline";

const ev = (over: Partial<TimelineEvent>): TimelineEvent => ({
  id: "e1",
  leadId: "l1",
  timestamp: "2026-10-01T10:00:00.000Z",
  authorId: "u",
  authorName: "موظف",
  type: "note",
  title: "t",
  details: "",
  ...over,
});

test("old events with raw keys are shown in Arabic and empty fragments disappear", () => {
  const s = cleanEvent(ev({ type: "status_change", title: "تحديث حالة العميل إلى (interested)", details: "تغيرت الحالة من new إلى interested" }));
  assert.equal(s.title, "تحديث حالة العميل إلى (مهتم)");
  assert.equal(s.details, "تغيرت الحالة من جديد إلى مهتم");
  const f = cleanEvent(ev({ type: "followup_created", title: "جدولة متابعة جديدة (call)" }));
  assert.equal(f.title, "جدولة متابعة جديدة (اتصال)");
  const c = cleanEvent(ev({ type: "created", title: "إضافة العميل للنظام", details: "تم إضافة العميل بواسطة م. خالد (admin)، المصدر: walk_in" }));
  assert.equal(c.details, "المصدر: زيارة الفرع");
  const v = cleanEvent(ev({ type: "visit", details: "استقبله الموظف: أحمد. النتيجة: مهتم. الملاحظات: " }));
  assert.equal(v.details, "استقبله الموظف: أحمد. النتيجة: مهتم");
});

test("timeline merges what the customer did and how complaints were handled, newest first", () => {
  const r: ReviewRequest = {
    id: "r".repeat(24), leadId: "l1", leadName: "x", branchId: "b", agentId: "a", subjectKind: "visit", subjectLabel: "زيارة الفرع",
    sentAt: "2026-10-01T11:00:00.000Z", status: "answered", answeredAt: "2026-10-02T09:00:00.000Z", isComplaint: true,
    response: { rating: 1, comment: "اتأخروا" },
  };
  const n: ReviewNote = { id: "n1", requestId: r.id, text: "كلمناه", kind: "resolved", byId: "m", byName: "مدير", at: "2026-10-03T09:00:00.000Z" };
  const other: ReviewRequest = { ...r, id: "o".repeat(24), leadId: "l2" };
  const items = buildTimeline("l1", [ev({ type: "visit" }), ev({ id: "e2", leadId: "l2" })], [r, other], [n]);
  assert.deepEqual(items.map((i) => i.type), ["complaint_note", "review_answered", "visit"]);
  assert.equal(items[1].title, "العميل بعت شكوى");
  assert.equal(items[0].tone, "good");
});

test("day labels", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  assert.equal(dayLabel("2026-10-20T08:00:00Z", now), "النهارده");
  assert.equal(dayLabel("2026-10-19T08:00:00Z", now), "امبارح");
  assert.match(dayLabel("2026-01-05T08:00:00Z", now), /2026|٢٠٢٦/);
});
