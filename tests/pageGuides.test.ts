import test from "node:test";
import assert from "node:assert/strict";
import { pageGuide, type PageGuideId } from "../src/lib/pageGuides";
import { postSaleMilestones, milestoneSpan } from "../src/lib/postSale";
import { REVIEW_REMINDER_HOURS, COMPLAINT_ESCALATION_HOURS } from "../src/lib/reviews";
import { unknownReasonFollowUpDays } from "../src/lib/notBought";
import { REFERRAL_FOLLOWUP_DAYS } from "../src/lib/referrals";

const ids: PageGuideId[] = ["followups", "visits", "customers", "addCustomer", "purchases", "feedback", "brokers", "reports", "branches", "staff"];
const text = (id: PageGuideId, license?: Parameters<typeof pageGuide>[1]) => JSON.stringify(pageGuide(id, license));

test("every page guide has a title and rules", () => {
  for (const id of ids) {
    const g = pageGuide(id);
    assert.ok(g.title.length > 5 && g.items.length >= 3, id);
    assert.ok(g.items.every((i) => i.when && i.what), id);
  }
});

test("the guides quote the numbers the system really runs on, so they cannot go stale", () => {
  const spans = postSaleMilestones.map(milestoneSpan);
  assert.deepEqual(spans, ["أسبوع", "شهر", "6 شهور", "سنة"]);
  for (const id of ["followups", "visits", "purchases"] as const) for (const s of spans) assert.ok(text(id).includes(s), `${id} mentions ${s}`);
  assert.ok(text("followups").includes(String(REVIEW_REMINDER_HOURS)));
  assert.ok(text("feedback").includes(String(COMPLAINT_ESCALATION_HOURS)));
  assert.ok(text("followups").includes("يومين") && unknownReasonFollowUpDays === 2 && REFERRAL_FOLLOWUP_DAYS === 2);
});

test("limits set by the developer show up in the guides", () => {
  const lic = { maxBranches: 7, maxUsers: 23, suggestionsPerDay: 6 };
  assert.ok(text("branches", lic).includes("7 فرع"));
  assert.ok(text("staff", lic).includes("23 مستخدم"));
  assert.ok(text("followups", lic).includes("6 اقتراح"));
});

test("the old delivery step is gone from every guide", () => {
  for (const id of ids) assert.ok(!/تم التسليم|تسليم الشغل|بعد التسليم/.test(text(id)), id);
});
