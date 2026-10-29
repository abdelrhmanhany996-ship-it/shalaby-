import test, { before, after } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc } from "firebase/firestore";

let env;
const people = {
  dev: { role: "admin" },
  gm: { role: "general_manager" },
  regional: { role: "regional_manager" },
  regionalList: { role: "regional_manager", supervisedBranchIds: ["b1", "b2"] },
  sup: { role: "supervisor", branchId: "b1" },
  supList: { role: "supervisor", branchId: "b1", supervisedBranchIds: ["b2"] },
  bm1: { role: "branch_manager", branchId: "b1" },
  agentA: { role: "sales_agent", branchId: "b1" },
  agentB: { role: "sales_agent", branchId: "b1" },
  agentC: { role: "sales_agent", branchId: "b2" },
  tl: { role: "team_leader", branchId: "b1" },
  acct: { role: "supervisor", branchId: "b1", specialty: "accounts" },
  gone: { role: "sales_agent", branchId: "b1", active: false },
};
const uid = (k) => `uid-${k}`;
const userId = (k) => `usr-${k}`;
const db = (k) => (k ? env.authenticatedContext(uid(k)).firestore() : env.unauthenticatedContext().firestore());
const leads = (d) => collection(d, "leads");

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-shalaby",
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8181 },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    for (const [k, p] of Object.entries(people))
      await setDoc(doc(f, "authProfiles", uid(k)), { uid: uid(k), userId: userId(k), name: k, email: `${k}@x`, active: p.active ?? true, ...p });
    await setDoc(doc(f, "leads", "L1"), { id: "L1", branchId: "b1", assignedAgentId: userId("agentA"), name: "A1", phone: "1" });
    await setDoc(doc(f, "leads", "L2"), { id: "L2", branchId: "b1", assignedAgentId: userId("agentB"), delegatedTo: [userId("agentA")], name: "B1", phone: "2" });
    await setDoc(doc(f, "leads", "L3"), { id: "L3", branchId: "b2", assignedAgentId: userId("agentC"), name: "C1", phone: "3" });
    await setDoc(doc(f, "followUps", "F1"), { id: "F1", branchId: "b1", assignedAgentId: userId("agentA") });
    await setDoc(doc(f, "users", userId("agentA")), { id: userId("agentA"), branchId: "b1", role: "sales_agent" });
    await setDoc(doc(f, "users", userId("agentC")), { id: userId("agentC"), branchId: "b2", role: "sales_agent" });
    await setDoc(doc(f, "users", userId("dev")), { id: userId("dev"), role: "admin" });
    await setDoc(doc(f, "brokers", "BR1"), { id: "BR1", name: "b", branchIds: ["b1"] });
    await setDoc(doc(f, "brokers", "BR2"), { id: "BR2", name: "c", branchIds: ["b2"] });
    await setDoc(doc(f, "brokers", "BR0"), { id: "BR0", name: "old" });
    await setDoc(doc(f, "reviewRequests", "tok_aaaaaaaaaaaaaaaaaaaaaaa"), { id: "tok_aaaaaaaaaaaaaaaaaaaaaaa", branchId: "b1", agentId: userId("agentA"), leadId: "L1", leadName: "A1", status: "sent" });
    await setDoc(doc(f, "reviewNotes", "N1"), { id: "N1", requestId: "tok_aaaaaaaaaaaaaaaaaaaaaaa", branchId: "b1", agentId: userId("agentA"), byId: userId("bm1"), kind: "note", text: "x", at: "2026" });
    await setDoc(doc(f, "timelineEvents", "T1"), { id: "T1", leadId: "L1", branchId: "b1", leadOwnerId: userId("agentA"), authorId: userId("agentA"), details: "x" });
    await setDoc(doc(f, "activityLogs", "A1"), { id: "A1", userId: userId("gm") });
    await setDoc(doc(f, "notifications", "NT1"), { id: "NT1", targetUserId: userId("agentA") });
    await setDoc(doc(f, "meta", "bootstrap"), { createdBy: "uid-founder" });
  });
});
after(async () => env && env.cleanup());

const own = (k, branch = "b1", field = "assignedAgentId") => query(leads(db(k)), where("branchId", "==", branch), where(field, "==", userId(k)));

test("a salesperson reads only their own customers, never the branch or other branches", async () => {
  await assertSucceeds(getDocs(own("agentA")));
  await assertSucceeds(getDocs(own("tl")));
  await assertFails(getDocs(query(leads(db("agentA")), where("branchId", "==", "b1"))));
  await assertFails(getDocs(leads(db("agentA"))));
  await assertSucceeds(getDoc(doc(db("agentA"), "leads", "L1")));
  await assertFails(getDoc(doc(db("agentA"), "leads", "L3")));
  await assertFails(getDoc(doc(db("agentB"), "leads", "L1")));
});

test("a colleague's customer is readable only while a follow-up was delegated", async () => {
  await assertSucceeds(getDoc(doc(db("agentA"), "leads", "L2")));
  await assertSucceeds(getDocs(query(leads(db("agentA")), where("branchId", "==", "b1"), where("delegatedTo", "array-contains", userId("agentA")))));
  await assertSucceeds(updateDoc(doc(db("agentA"), "leads", "L2"), { status: "contacted" }));
  await assertFails(updateDoc(doc(db("agentA"), "leads", "L2"), { assignedAgentId: userId("agentA") }));
});

test("a salesperson cannot create customers for someone else or another branch, or take a customer", async () => {
  await assertSucceeds(setDoc(doc(db("agentA"), "leads", "N1"), { id: "N1", branchId: "b1", assignedAgentId: userId("agentA") }));
  await assertFails(setDoc(doc(db("agentA"), "leads", "N2"), { id: "N2", branchId: "b1", assignedAgentId: userId("agentB") }));
  await assertFails(setDoc(doc(db("agentA"), "leads", "N3"), { id: "N3", branchId: "b2", assignedAgentId: userId("agentA") }));
  await assertFails(updateDoc(doc(db("agentA"), "leads", "L1"), { assignedAgentId: userId("agentB") }));
  await assertFails(updateDoc(doc(db("agentB"), "leads", "L1"), { status: "x" }));
});

test("a branch manager sees their whole branch and nothing else", async () => {
  await assertSucceeds(getDocs(query(leads(db("bm1")), where("branchId", "==", "b1"))));
  await assertFails(getDocs(query(leads(db("bm1")), where("branchId", "==", "b2"))));
  await assertFails(getDocs(leads(db("bm1"))));
  await assertFails(getDoc(doc(db("bm1"), "leads", "L3")));
  await assertSucceeds(updateDoc(doc(db("bm1"), "leads", "L1"), { assignedAgentId: userId("agentB") }));
  await assertFails(updateDoc(doc(db("bm1"), "leads", "L2"), { branchId: "b2" }));
  await assertFails(setDoc(doc(db("bm1"), "leads", "N4"), { id: "N4", branchId: "b2", assignedAgentId: userId("agentC") }));
});

test("supervisors see exactly their branch list; the general sales manager sees every branch even with an old list", async () => {
  await assertSucceeds(getDocs(query(leads(db("sup")), where("branchId", "==", "b1"))));
  await assertSucceeds(getDocs(query(leads(db("supList")), where("branchId", "in", ["b2"]))));
  await assertFails(getDocs(query(leads(db("supList")), where("branchId", "==", "b1"))));
  // a stale branch list on the general sales manager must never hide a branch (e.g. one added later)
  await assertSucceeds(getDocs(leads(db("regionalList"))));
  await assertSucceeds(getDocs(leads(db("regional"))));
});

test("directors and the developer see everything; inactive or unknown people see nothing", async () => {
  await assertSucceeds(getDocs(leads(db("gm"))));
  await assertSucceeds(getDocs(leads(db("dev"))));
  await assertFails(getDocs(own("gone")));
  await assertFails(getDoc(doc(db(null), "leads", "L1")));
});

test("follow-ups follow the same scope", async () => {
  await assertSucceeds(getDocs(query(collection(db("agentA"), "followUps"), where("branchId", "==", "b1"), where("assignedAgentId", "==", userId("agentA")))));
  await assertFails(getDocs(query(collection(db("agentB"), "followUps"), where("branchId", "==", "b1"))));
});

test("staff directory: your branch and yourself; developers stay hidden", async () => {
  await assertSucceeds(getDocs(query(collection(db("agentA"), "users"), where("branchId", "==", "b1"))));
  await assertFails(getDocs(query(collection(db("agentA"), "users"), where("branchId", "==", "b2"))));
  await assertFails(getDocs(collection(db("agentA"), "users")));
  await assertSucceeds(getDocs(query(collection(db("agentA"), "users"), where("id", "==", userId("agentA")))));
  await assertFails(getDoc(doc(db("bm1"), "users", userId("dev"))));
});

test("brokers belong to branches", async () => {
  await assertSucceeds(getDocs(query(collection(db("agentA"), "brokers"), where("branchIds", "array-contains-any", ["b1"]))));
  await assertFails(getDocs(collection(db("agentA"), "brokers")));
  await assertFails(getDoc(doc(db("agentA"), "brokers", "BR2")));
  await assertFails(getDoc(doc(db("agentA"), "brokers", "BR0")));
  await assertSucceeds(setDoc(doc(db("agentA"), "brokers", "BRn"), { id: "BRn", name: "n", branchIds: ["b1"] }));
  await assertFails(setDoc(doc(db("agentA"), "brokers", "BRm"), { id: "BRm", name: "m", branchIds: ["b2"] }));
  await assertSucceeds(getDocs(collection(db("gm"), "brokers")));
});

test("review links: the customer answers once; staff only see their own scope", async () => {
  const id = "tok_aaaaaaaaaaaaaaaaaaaaaaa";
  await assertSucceeds(getDoc(doc(db(null), "reviewRequests", id)));
  await assertFails(getDocs(collection(db(null), "reviewRequests")));
  await assertSucceeds(getDocs(query(collection(db("agentA"), "reviewRequests"), where("branchId", "==", "b1"), where("agentId", "==", userId("agentA")))));
  await assertFails(getDocs(query(collection(db("agentC"), "reviewRequests"), where("branchId", "==", "b1"))));
  await assertFails(updateDoc(doc(db(null), "reviewRequests", id), { status: "answered", isComplaint: false, answeredAt: "x", response: { rating: 9 } }));
  await assertSucceeds(updateDoc(doc(db(null), "reviewRequests", id), { status: "answered", isComplaint: true, answeredAt: "x", response: { rating: 2, comment: "late" } }));
  await assertFails(updateDoc(doc(db(null), "reviewRequests", id), { status: "answered", isComplaint: false, answeredAt: "y", response: { rating: 5 } }));
  await assertFails(updateDoc(doc(db("agentA"), "reviewRequests", id), { response: { rating: 5 } }));
});

test("a customer can recommend one person with the review, and staff can link the prospect they registered", async () => {
  const id = "tok_bbbbbbbbbbbbbbbbbbbbbbb";
  await env.withSecurityRulesDisabled(async (ctx) =>
    setDoc(doc(ctx.firestore(), "reviewRequests", id), { id, branchId: "b1", agentId: userId("agentA"), leadId: "L1", leadName: "A1", status: "sent" }),
  );
  const bad = [
    { name: "", phone: "01012345678" },
    { name: "س", phone: "123" },
    { name: "س", phone: "01012345678", extra: "x" },
  ];
  for (const referral of bad)
    await assertFails(updateDoc(doc(db(null), "reviewRequests", id), { status: "answered", isComplaint: false, answeredAt: "x", response: { rating: 5, referral } }));
  // someone who rated 3 or less is not asked, so a recommendation from them is refused
  await assertFails(updateDoc(doc(db(null), "reviewRequests", id), { status: "answered", isComplaint: false, answeredAt: "x", response: { rating: 3, referral: { name: "سامي", phone: "01012345678" } } }));
  await assertSucceeds(updateDoc(doc(db(null), "reviewRequests", id), { status: "answered", isComplaint: false, answeredAt: "x", response: { rating: 4, referral: { name: "سامي", phone: "01012345678" } } }));
  await assertSucceeds(updateDoc(doc(db("agentA"), "reviewRequests", id), { referralLeadId: "ld-1" }));
  await assertFails(updateDoc(doc(db("agentA"), "reviewRequests", id), { "response.referral.name": "غيره" }));
  await assertFails(updateDoc(doc(db("agentC"), "reviewRequests", id), { referralLeadId: "ld-2" }));
});

test("complaint notes: managers of the branch add, nobody edits; the salesperson can read theirs", async () => {
  const note = (k, branch = "b1") => ({ id: `n-${k}`, requestId: "tok_aaaaaaaaaaaaaaaaaaaaaaa", branchId: branch, agentId: userId("agentA"), byId: userId(k), kind: "note", text: "called", at: "2026" });
  await assertSucceeds(setDoc(doc(db("bm1"), "reviewNotes", "n-bm1"), note("bm1")));
  await assertFails(setDoc(doc(db("agentA"), "reviewNotes", "n-agentA"), note("agentA")));
  await assertFails(setDoc(doc(db("bm1"), "reviewNotes", "n-x"), { ...note("bm1"), byId: userId("gm") }));
  await assertFails(updateDoc(doc(db("bm1"), "reviewNotes", "N1"), { text: "changed" }));
  await assertSucceeds(getDocs(query(collection(db("agentA"), "reviewNotes"), where("branchId", "==", "b1"), where("agentId", "==", userId("agentA")))));
  await assertFails(getDocs(query(collection(db("agentB"), "reviewNotes"), where("branchId", "==", "b1"))));
});

test("timeline, audit trail and notifications are scoped too", async () => {
  await assertSucceeds(getDocs(query(collection(db("agentA"), "timelineEvents"), where("branchId", "==", "b1"), where("leadOwnerId", "==", userId("agentA")))));
  await assertFails(getDocs(query(collection(db("agentB"), "timelineEvents"), where("branchId", "==", "b1"))));
  await assertSucceeds(updateDoc(doc(db("bm1"), "timelineEvents", "T1"), { leadOwnerId: userId("agentB") }));
  await assertFails(updateDoc(doc(db("bm1"), "timelineEvents", "T1"), { details: "rewritten" }));
  await assertFails(getDocs(collection(db("bm1"), "activityLogs")));
  await assertSucceeds(getDocs(collection(db("gm"), "activityLogs")));
  await assertSucceeds(setDoc(doc(db("agentA"), "activityLogs", "A2"), { id: "A2", userId: userId("agentA") }));
  await assertFails(setDoc(doc(db("agentA"), "activityLogs", "A3"), { id: "A3", userId: userId("gm") }));
  await assertSucceeds(getDocs(query(collection(db("agentA"), "notifications"), where("targetUserId", "==", userId("agentA")))));
  await assertFails(getDocs(collection(db("agentA"), "notifications")));
});

test("only the account that set the system up can restore its own developer record", async () => {
  const rec = (u) => ({ uid: u, email: "x", name: "x", userId: u, role: "admin", active: true });
  await assertFails(setDoc(doc(env.authenticatedContext("uid-stranger").firestore(), "authProfiles", "uid-stranger"), rec("uid-stranger")));
  await assertFails(setDoc(doc(env.authenticatedContext("uid-founder").firestore(), "authProfiles", "uid-other"), rec("uid-other")));
  await assertSucceeds(setDoc(doc(env.authenticatedContext("uid-founder").firestore(), "authProfiles", "uid-founder"), rec("uid-founder")));
});

test("the company plan (branch limit) can be changed by the developer only", async () => {
  await assertSucceeds(setDoc(doc(db("dev"), "settings", "license"), { maxBranches: 5 }));
  await assertFails(setDoc(doc(db("gm"), "settings", "license"), { maxBranches: 50 }));
  await assertFails(setDoc(doc(db("agentA"), "settings", "license"), { maxBranches: 50 }));
  await assertSucceeds(getDoc(doc(db("agentA"), "settings", "license")));
  await assertSucceeds(setDoc(doc(db("gm"), "settings", "distribution"), { autoDistribute: true }));
});

test("Zaki suggestions and reminder marks belong to one person: made pending, decided once, never edited after", async () => {
  const mine = { id: "S1", branchId: "b1", agentId: userId("agentA"), status: "pending", name: "x" };
  await assertSucceeds(setDoc(doc(db("agentA"), "aiSuggestions", "S1"), mine));
  await assertSucceeds(setDoc(doc(db("agentA"), "aiSuggestions", "S0"), { ...mine, id: "S0", status: "checked" }));
  // not for someone else, not born decided, not in another branch
  await assertFails(setDoc(doc(db("agentA"), "aiSuggestions", "S2"), { ...mine, id: "S2", agentId: userId("agentB") }));
  await assertFails(setDoc(doc(db("agentA"), "aiSuggestions", "S3"), { ...mine, id: "S3", status: "accepted" }));
  await assertFails(setDoc(doc(db("agentC"), "aiSuggestions", "S4"), { ...mine, id: "S4" }));
  // only the owner can read or decide it
  await assertFails(getDoc(doc(db("agentB"), "aiSuggestions", "S1")));
  await assertFails(updateDoc(doc(db("agentB"), "aiSuggestions", "S1"), { status: "rejected" }));
  await assertSucceeds(getDoc(doc(db("agentA"), "aiSuggestions", "S1")));
  await assertSucceeds(updateDoc(doc(db("agentA"), "aiSuggestions", "S1"), { status: "accepted", finalDate: "2030-01-01" }));
  // decided is final
  await assertFails(updateDoc(doc(db("agentA"), "aiSuggestions", "S1"), { status: "rejected" }));
  // reminder marks
  await assertSucceeds(setDoc(doc(db("agentA"), "reminderDone", "rs:v1:client"), { id: "rs:v1:client", branchId: "b1", agentId: userId("agentA"), doneAt: "x" }));
  await assertFails(setDoc(doc(db("agentA"), "reminderDone", "rs:v2:client"), { id: "rs:v2:client", branchId: "b1", agentId: userId("agentB"), doneAt: "x" }));
  await assertFails(updateDoc(doc(db("agentA"), "reminderDone", "rs:v1:client"), { doneAt: "y" }));
});

test("the general sales manager edits people below the owner in any branch, but not the owner, the developer or a peer; the branch manager only low roles in their branch", async () => {
  await assertSucceeds(getDoc(doc(db("regional"), "authProfiles", uid("agentC"))));
  await assertSucceeds(updateDoc(doc(db("regional"), "authProfiles", uid("agentC")), { name: "x" }));
  await assertSucceeds(updateDoc(doc(db("regional"), "authProfiles", uid("bm1")), { name: "x" }));
  await assertSucceeds(updateDoc(doc(db("regional"), "users", userId("agentC")), { name: "edited" }));
  // never the owner, the developer, or another general sales manager; never promoting someone into those
  await assertFails(updateDoc(doc(db("regional"), "authProfiles", uid("gm")), { name: "x" }));
  await assertFails(updateDoc(doc(db("regional"), "authProfiles", uid("dev")), { name: "x" }));
  await assertFails(updateDoc(doc(db("regional"), "authProfiles", uid("regionalList")), { name: "x" }));
  await assertFails(updateDoc(doc(db("regional"), "authProfiles", uid("agentA")), { role: "general_manager" }));
  await assertFails(updateDoc(doc(db("regional"), "users", userId("dev")), { name: "x" }));
  // and a salesperson edits no one
  await assertFails(updateDoc(doc(db("agentA"), "authProfiles", uid("agentB")), { name: "x" }));
});

// ---------- accounting: append-only books for the owner and accounts specialists ----------
const entry = (over = {}) => ({ id: "E1", date: "2026-10-10", type: "income", amount: 100, accountId: "acc-cash", categoryId: "inc-collection", description: "تحصيل", status: "posted", createdAt: "t", createdById: userId("acct"), createdByName: "x", ...over });
const voidOf = (e, by) => ({ ...e, status: "void", voidedAt: "t2", voidedById: userId(by), voidedByName: by, voidReason: "غلط" });

test("accounting: only the owner, developer and accounts specialists read or write the books", async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "accountingEntries", "R1"), entry({ id: "R1" })));
  for (const k of ["gm", "dev", "acct"]) await assertSucceeds(getDoc(doc(db(k), "accountingEntries", "R1")));
  for (const k of ["regional", "sup", "bm1", "agentA", "tl"]) await assertFails(getDoc(doc(db(k), "accountingEntries", "R1")));
  await assertFails(getDocs(collection(db("agentA"), "accountingEntries")));
  for (const k of ["regional", "bm1", "agentA"]) await assertFails(setDoc(doc(db(k), "accountingEntries", "X" + k), entry({ id: "X" + k, createdById: userId(k) })));
  await assertSucceeds(setDoc(doc(db("acct"), "accountingEntries", "N1"), entry({ id: "N1" })));
  await assertSucceeds(setDoc(doc(db("gm"), "accountingEntries", "N2"), entry({ id: "N2", createdById: userId("gm") })));
});

test("accounting: an entry can be created only as posted, positive, and signed by its author", async () => {
  await assertFails(setDoc(doc(db("acct"), "accountingEntries", "B1"), entry({ id: "B1", status: "void" })));
  await assertFails(setDoc(doc(db("acct"), "accountingEntries", "B2"), entry({ id: "B2", amount: 0 })));
  await assertFails(setDoc(doc(db("acct"), "accountingEntries", "B3"), entry({ id: "B3", amount: -5 })));
  await assertFails(setDoc(doc(db("acct"), "accountingEntries", "B4"), entry({ id: "B4", type: "transfer" })));
  await assertFails(setDoc(doc(db("acct"), "accountingEntries", "B5"), entry({ id: "B5", createdById: userId("gm") })));
});

test("accounting: entries are never edited or deleted; the only change is cancelling a posted one with a reason", async () => {
  const e = entry({ id: "V1" });
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "accountingEntries", "V1"), e));
  const ref = (k) => doc(db(k), "accountingEntries", "V1");
  await assertFails(updateDoc(ref("acct"), { amount: 999 }));
  await assertFails(updateDoc(ref("acct"), { description: "تعديل" }));
  await assertFails(updateDoc(ref("acct"), { ...voidOf(e, "acct"), amount: 1 })); // cancel + sneak a change
  await assertFails(updateDoc(ref("acct"), { ...voidOf(e, "acct"), voidReason: "x" })); // reason too short
  await assertFails(updateDoc(ref("acct"), { ...voidOf(e, "gm") })); // signed as someone else
  await assertFails(updateDoc(ref("agentA"), voidOf(e, "agentA")));
  await assertSucceeds(updateDoc(ref("acct"), voidOf(e, "acct")));
  // once cancelled it is final
  await assertFails(updateDoc(ref("gm"), { status: "posted" }));
  await assertFails(updateDoc(ref("gm"), { description: "بعد الإلغاء" }));
  for (const k of ["dev", "gm", "acct"]) await assertFails(import("firebase/firestore").then((m) => m.deleteDoc(ref(k))));
});

test("accounting settings (accounts, opening balances) are for the same people only", async () => {
  await assertSucceeds(setDoc(doc(db("acct"), "accountingSettings", "main"), { accounts: [], categories: [] }));
  await assertSucceeds(getDoc(doc(db("gm"), "accountingSettings", "main")));
  for (const k of ["regional", "bm1", "agentA", "sup"]) {
    await assertFails(getDoc(doc(db(k), "accountingSettings", "main")));
    await assertFails(setDoc(doc(db(k), "accountingSettings", "main"), { accounts: [] }));
  }
});

// ---------- employee targets ----------
const target = (user, branch = "b1", over = {}) => ({ id: `tgt-${userId(user)}-2026-10`, userId: userId(user), userName: user, branchId: branch, month: "2026-10", amount: 5000, ...over });

test("targets: managers set targets in their branches, never their own, and a salesperson reads only their own", async () => {
  await assertSucceeds(setDoc(doc(db("bm1"), "employeeTargets", "tgt-a"), target("agentA")));
  await assertSucceeds(setDoc(doc(db("regional"), "employeeTargets", "tgt-c"), target("agentC", "b2")));
  await assertSucceeds(setDoc(doc(db("gm"), "employeeTargets", "tgt-gm"), target("gm", "b1")));
  await assertFails(setDoc(doc(db("bm1"), "employeeTargets", "tgt-self"), target("bm1")));
  await assertFails(setDoc(doc(db("regional"), "employeeTargets", "tgt-rself"), target("regional")));
  await assertFails(setDoc(doc(db("bm1"), "employeeTargets", "tgt-other-branch"), target("agentC", "b2")));
  await assertFails(setDoc(doc(db("bm1"), "employeeTargets", "tgt-neg"), target("agentA", "b1", { amount: -1 })));
  await assertFails(setDoc(doc(db("agentA"), "employeeTargets", "tgt-mine"), target("agentA")));
  await assertFails(setDoc(doc(db("agentA"), "employeeTargets", "tgt-mine"), target("agentA", "b1", { amount: 1 })));
  await assertSucceeds(getDoc(doc(db("agentA"), "employeeTargets", "tgt-a")));
  await assertFails(getDoc(doc(db("agentB"), "employeeTargets", "tgt-a")));
  await assertFails(getDoc(doc(db("agentA"), "employeeTargets", "tgt-c")));
  await assertSucceeds(getDoc(doc(db("bm1"), "employeeTargets", "tgt-a")));
  await assertFails(getDoc(doc(db("bm1"), "employeeTargets", "tgt-c")));
  await assertSucceeds(getDocs(query(collection(db("agentA"), "employeeTargets"), where("branchId", "==", "b1"), where("userId", "==", userId("agentA")))));
  await assertFails(getDocs(query(collection(db("agentA"), "employeeTargets"), where("branchId", "==", "b1"))));
});

test("targets: a manager cannot reassign a target to someone else or move it between branches", async () => {
  await assertFails(updateDoc(doc(db("bm1"), "employeeTargets", "tgt-a"), { userId: userId("agentB") }));
  await assertFails(updateDoc(doc(db("bm1"), "employeeTargets", "tgt-a"), { branchId: "b2" }));
  await assertSucceeds(updateDoc(doc(db("bm1"), "employeeTargets", "tgt-a"), { amount: 6000 }));
  await assertFails(updateDoc(doc(db("agentA"), "employeeTargets", "tgt-a"), { amount: 1 }));
});

test("target rules (settings/targets) are written by the owner, developer and general sales manager only", async () => {
  await assertSucceeds(setDoc(doc(db("regional"), "settings", "targets"), { behindBelow: 70 }));
  await assertSucceeds(setDoc(doc(db("gm"), "settings", "targets"), { behindBelow: 60 }));
  for (const k of ["bm1", "agentA", "sup"]) await assertFails(setDoc(doc(db(k), "settings", "targets"), { behindBelow: 1 }));
  await assertFails(setDoc(doc(db("regional"), "settings", "distribution"), { x: 1 }));
  await assertFails(setDoc(doc(db("regional"), "settings", "license"), { x: 1 }));
});

// ---------- Telegram groups directory ----------
const group = (over = {}) => ({ id: "G1", name: "جروب المبيعات", link: "https://t.me/sales_team", active: true, createdAt: "t", createdById: "u", createdByName: "u", ...over });

test("telegram groups: every staff member reads, only managers write, links must be Telegram links", async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "telegramGroups", "R1"), group({ id: "R1" })));
  for (const k of ["agentA", "agentC", "tl", "sup", "acct", "bm1", "regional", "gm"]) await assertSucceeds(getDoc(doc(db(k), "telegramGroups", "R1")));
  await assertFails(getDoc(doc(db("gone"), "telegramGroups", "R1")));
  await assertFails(getDoc(doc(db(null), "telegramGroups", "R1")));
  for (const k of ["bm1", "regional", "gm", "dev"]) await assertSucceeds(setDoc(doc(db(k), "telegramGroups", "W" + k), group({ id: "W" + k })));
  for (const k of ["agentA", "tl", "sup", "acct"]) await assertFails(setDoc(doc(db(k), "telegramGroups", "X" + k), group({ id: "X" + k })));
  for (const [i, link] of ["https://evil.com/t.me/abc", "https://t.me.evil.com/abc", "javascript:alert(1)", "http://t.me/abc", "https://t.me/a", "ftp://t.me/abcde", 5].entries())
    await assertFails(setDoc(doc(db("gm"), "telegramGroups", "B" + i), group({ id: "B" + i, link })));
  for (const [i, link] of ["https://t.me/+AbC123xyz", "https://telegram.me/team_chat", "tg://join?invite=AbC123"].entries())
    await assertSucceeds(setDoc(doc(db("gm"), "telegramGroups", "OK" + i), group({ id: "OK" + i, link })));
  await assertFails(setDoc(doc(db("gm"), "telegramGroups", "N1"), group({ id: "N1", name: "ا" })));
  await assertFails(updateDoc(doc(db("agentA"), "telegramGroups", "R1"), { name: "تعديل" }));
  await assertSucceeds(updateDoc(doc(db("bm1"), "telegramGroups", "R1"), { name: "تعديل المدير" }));
  await assertFails(updateDoc(doc(db("bm1"), "telegramGroups", "R1"), { link: "https://evil.com/x" }));
  await assertFails(import("firebase/firestore").then((m) => m.deleteDoc(doc(db("agentA"), "telegramGroups", "R1"))));
  await assertSucceeds(import("firebase/firestore").then((m) => m.deleteDoc(doc(db("bm1"), "telegramGroups", "R1"))));
});

const statement = (by, branch = "b1", over = {}) => ({ id: "S", title: "بيان أكتوبر", fileName: "a.xlsx", sheetName: "S", branchId: branch, headers: ["العميل", "المبلغ"], rowCount: 1, totals: [], uploadedById: userId(by), uploadedByName: by, createdAt: "t", ...over });
const statementRows = (by, branch = "b1", over = {}) => ({ id: "S", branchId: branch, uploadedById: userId(by), rowsJson: '[["أحمد","100"]]', ...over });

test("sales statements: uploaded into your own branch as yourself; salespeople read their own, managers their branches", async () => {
  const { deleteDoc } = await import("firebase/firestore");
  for (const col of ["salesStatements", "salesStatementRows"]) {
    const make = col === "salesStatements" ? statement : statementRows;
    await assertSucceeds(setDoc(doc(db("agentA"), col, "A1"), make("agentA")));
    await assertFails(setDoc(doc(db("agentA"), col, "A2"), make("agentA", "b2")), "not into another branch");
    await assertFails(setDoc(doc(db("agentA"), col, "A3"), make("agentB")), "not in someone else's name");
    await assertFails(setDoc(doc(db("gone"), col, "A4"), make("gone")));
    await assertFails(setDoc(doc(db(null), col, "A5"), make("agentA")));
    await assertSucceeds(setDoc(doc(db("bm1"), col, "M1"), make("bm1")));
    await assertSucceeds(setDoc(doc(db("gm"), col, "G1"), make("gm", "b2")));
    await assertSucceeds(getDoc(doc(db("agentA"), col, "A1")));
    await assertFails(getDoc(doc(db("agentB"), col, "A1")), "a colleague does not read it");
    await assertFails(getDoc(doc(db("agentC"), col, "A1")), "another branch does not read it");
    await assertSucceeds(getDoc(doc(db("bm1"), col, "A1")), "the branch manager reads it");
    await assertSucceeds(getDoc(doc(db("gm"), col, "A1")));
    await assertFails(getDoc(doc(db("bm1"), col, "G1")), "not the other branch");
    await assertFails(updateDoc(doc(db("agentA"), col, "A1"), { branchId: "b1" }), "nobody edits a statement");
    await assertFails(deleteDoc(doc(db("agentB"), col, "A1")));
    await assertFails(deleteDoc(doc(db("bm1"), col, "G1")));
    await assertSucceeds(deleteDoc(doc(db("bm1"), col, "A1")), "the branch manager removes a wrong file");
    await assertFails(deleteDoc(doc(db("agentA"), col, "M1")), "a salesperson does not remove the manager's file");
  }
  await assertFails(setDoc(doc(db("agentA"), "salesStatements", "T1"), statement("agentA", "b1", { title: "ا" })));
  await assertFails(setDoc(doc(db("agentA"), "salesStatementRows", "T2"), statementRows("agentA", "b1", { rowsJson: "x".repeat(950001) })));
  await assertSucceeds(setDoc(doc(db("agentA"), "salesStatements", "O1"), statement("agentA")));
  await assertSucceeds(deleteDoc(doc(db("agentA"), "salesStatements", "O1")), "the uploader removes their own");
});

test("targets for people who cover every branch are stored without a branch; only top management reads and writes them", async () => {
  const row = { id: `tgt-${userId("regional")}-2026-10`, userId: userId("regional"), userName: "r", branchId: "", month: "2026-10", amount: 9000 };
  await assertSucceeds(setDoc(doc(db("gm"), "employeeTargets", row.id), row));
  await assertFails(setDoc(doc(db("bm1"), "employeeTargets", row.id + "x"), { ...row, id: row.id + "x" }));
  await assertSucceeds(getDoc(doc(db("regional"), "employeeTargets", row.id)));
  await assertFails(getDoc(doc(db("bm1"), "employeeTargets", row.id)));
  await assertFails(getDoc(doc(db("agentA"), "employeeTargets", row.id)));
  const own = { ...row, id: `tgt-${userId("gm")}-2026-10`, userId: userId("gm") };
  await assertSucceeds(setDoc(doc(db("gm"), "employeeTargets", own.id), own), "the owner sets their own target");
});
