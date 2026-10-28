// The real app against the Firebase emulators with the real security rules:
// signs in as different roles and checks what each one can see and do.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { chromium } from "playwright-core";

const DIST = process.env.APP_DIST;
const PROJECT = "shalaby-group";
const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8181 } });
await env.clearFirestore();

async function signUp(email, password) {
  const r = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  return (await r.json()).localId;
}
const people = {
  gm: { role: "general_manager", name: "المدير العام" },
  bm1: { role: "branch_manager", branchId: "b1", name: "مدير فرع 1" },
  agentA: { role: "sales_agent", branchId: "b1", name: "موظف أ" },
  agentC: { role: "sales_agent", branchId: "b2", name: "موظف ج" },
  accountant: { role: "supervisor", branchId: "b1", specialty: "accounts", name: "المحاسب" },
};
const uids = {};
for (const [k, p] of Object.entries(people)) uids[k] = await signUp(`${k}@staff.shalaby.local`, "Passw0rd!x");
await env.withSecurityRulesDisabled(async (ctx) => {
  const f = ctx.firestore();
  await setDoc(doc(f, "meta", "bootstrap"), { at: "2026" });
  for (const id of ["b1", "b2"]) await setDoc(doc(f, "branches", id), { id, name: `فرع ${id}`, code: id, city: "", phone: "", address: "", active: true, governorateId: "gov-cairo" });
  for (const [k, p] of Object.entries(people)) {
    await setDoc(doc(f, "authProfiles", uids[k]), { uid: uids[k], userId: `usr-${k}`, email: `${k}@staff.shalaby.local`, name: p.name, role: p.role, active: true, ...(p.branchId ? { branchId: p.branchId } : {}), ...(p.specialty ? { specialty: p.specialty } : {}) });
    await setDoc(doc(f, "users", `usr-${k}`), { id: `usr-${k}`, name: p.name, email: "", phone: "", role: p.role, active: true, createdAt: "2026", authUid: uids[k], ...(p.branchId ? { branchId: p.branchId } : {}), ...(p.specialty ? { specialty: p.specialty } : {}) });
  }
  const lead = (id, b, a, name) => setDoc(doc(f, "leads", id), { id, name, phone: `0100000000${id.slice(-1)}`, branchId: b, assignedAgentId: `usr-${a}`, status: "interested", source: "walk_in", classification: "B", department: "decor", notes: "", createdAt: "2026-10-01" });
  await lead("L1", "b1", "agentA", "عميل أحمد الخاص");
  await lead("L2", "b1", "bm1", "عميل المدير");
  await lead("L3", "b2", "agentC", "عميل فرع تاني");
  // A purchase and an overdue follow-up for agent A, so targets have something to measure and the follow-up can be moved.
  const day = new Date().toISOString().slice(0, 10);
  await setDoc(doc(f, "bookings", "BK1"), { id: "BK1", leadId: "L1", leadName: "عميل أحمد الخاص", leadPhone: "01000000001", branchId: "b1", agentId: "usr-agentA", department: "decor", courseId: "c", courseName: "دهان", bookingDate: day, amount: 3000, bookingStatus: "confirmed", source: "walk_in", notes: "", createdAt: `${day}T10:00:00Z` });
  await setDoc(doc(f, "followUps", "F1"), { id: "F1", leadId: "L1", leadName: "عميل أحمد الخاص", leadPhone: "01000000001", assignedAgentId: "usr-agentA", assignedAgentName: "موظف أ", branchId: "b1", scheduledAt: "2026-01-05", reason: "متابعة عرض السعر", type: "call", notes: "", status: "overdue" });
  await setDoc(doc(f, "brokers", "BR1"), { id: "BR1", name: "وسيط فرع 1", phone: "01111111111", type: "individual", active: true, totalReferrals: 0, totalVolume: 0, branchIds: ["b1"] });
  await setDoc(doc(f, "brokers", "BR2"), { id: "BR2", name: "وسيط فرع 2", phone: "01222222222", type: "individual", active: true, totalReferrals: 0, totalVolume: 0, branchIds: ["b2"] });
});

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  let path = decodeURIComponent(req.url.split("?")[0]);
  if (path.endsWith("/")) path += "index.html";
  try {
    const body = readFileSync(join(DIST, path));
    res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(readFileSync(join(DIST, "index.html")));
  }
}).listen(8090);

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? "✔" : "✖"} ${what}`);
  if (!ok) failures++;
};
async function as(who, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, locale: "ar-EG", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const denied = [];
  page.on("console", (m) => m.type() === "error" && /permission|insufficient/i.test(m.text()) && denied.push(m.text().slice(0, 200)));
  page.on("dialog", (d) => d.accept());
  await page.goto("http://127.0.0.1:8090/");
  await page.locator("input").first().fill(`${who}@staff.shalaby.local`);
  await page.locator('input[type="password"]').fill("Passw0rd!x");
  await page.locator('button[type="submit"]').click();
  await page.waitForSelector("aside", { timeout: 20000 });
  await page.waitForTimeout(2500);
  const go = async (t) => { await page.locator("aside").getByText(t, { exact: true }).first().click(); await page.waitForTimeout(1200); };
  await fn(page, go);
  check(denied.length === 0, `${who}: no permission errors while working${denied.length ? " → " + denied.join(" | ") : ""}`);
  await ctx.close();
}

await as("agentA", async (page, go) => {
  await go("العملاء");
  const txt = await page.locator("main").innerText();
  check(txt.includes("عميل أحمد الخاص"), "agent sees own customer");
  check(!txt.includes("عميل المدير") && !txt.includes("عميل فرع تاني"), "agent does not see colleagues' or other branches' customers");
  // The visits screen was taken off the menu, so the customer comes from the form below.
  // A new customer from the customer form.
  await go("العملاء");
  await page.getByRole("button", { name: /عميل جديد/ }).first().click();
  await page.waitForTimeout(800);
  await page.locator("input[name=customerName]").fill("عميل من الفورم");
  await page.locator("input[name=customerPhone]").fill("01077777777");
  await page.getByRole("button", { name: /حفظ العميل/ }).click();
  await page.waitForTimeout(2500);
  check((await page.locator("main").innerText()).includes("عميل من الفورم"), "agent adds a customer from the form");
});

await as("bm1", async (page, go) => {
  await go("العملاء");
  const txt = await page.locator("main").innerText();
  check(txt.includes("عميل أحمد الخاص") && txt.includes("عميل المدير") && txt.includes("عميل من الفورم"), "branch manager sees the whole branch");
  check(!txt.includes("عميل فرع تاني"), "branch manager does not see the other branch");
});

await as("agentC", async (page, go) => {
  await go("العملاء");
  const txt = await page.locator("main").innerText();
  check(txt.includes("عميل فرع تاني") && !txt.includes("عميل أحمد الخاص") && !txt.includes("عميل من الفورم"), "agent in branch 2 sees only their own");
});

await as("gm", async (page, go) => {
  await go("العملاء");
  const txt = await page.locator("main").innerText();
  check(txt.includes("عميل فرع تاني") && txt.includes("عميل أحمد الخاص"), "general manager sees every branch");
});

// ---------- follow-ups, targets and accounting ----------
const readDoc = async (path) => {
  let data;
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), ...path.split("/")));
    data = snap.exists() ? snap.data() : undefined;
  });
  return data;
};
const month = new Date().toISOString().slice(0, 7);

await as("agentA", async (page, go) => {
  await go("متابعاتي");
  const main = page.locator("main");
  check((await main.innerText()).includes("متابعة عرض السعر"), "agent sees the overdue follow-up");
  await page.getByRole("button", { name: "تأجيل" }).first().click();
  await page.locator('[role="dialog"] input[type="date"]').fill("2030-02-01");
  await page.locator('[role="dialog"] input[type="time"]').fill("14:30");
  await page.locator('[role="dialog"] textarea').fill("العميل طلب أكلمه بعد الإجازة");
  await page.getByRole("button", { name: "تأكيد التأجيل" }).click();
  await page.waitForTimeout(2000);
  const f = await readDoc("followUps/F1");
  check(f?.scheduledAt === "2030-02-01T14:30" && f?.rescheduleCount === 1 && f?.rescheduleLog?.[0]?.reason === "العميل طلب أكلمه بعد الإجازة" && f?.rescheduleLog?.[0]?.from === "2026-01-05", "rescheduling saved the new date, the count and the reason");
  await page.locator("article", { hasText: "متابعة عرض السعر" }).locator("select[aria-label='أولوية المتابعة']").selectOption("high");
  await page.waitForTimeout(1500);
  check((await readDoc("followUps/F1"))?.priority === "high", "priority saved");
  await page.getByRole("button", { name: /خطة شلبي اليوم/ }).click();
  await page.waitForTimeout(800);
  check((await main.innerText()).includes("خطة شلبي مش متفعّلة"), "the daily plan tab opens and says plainly it is not enabled without a Claude key");
});

await as("bm1", async (page, go) => {
  await go("الأهداف");
  const main = page.locator("main");
  check((await main.innerText()).includes("موظف أ"), "branch manager sees the salesperson on the targets page");
  check(!(await page.locator("aside").innerText()).includes("الحسابات"), "branch manager has no accounts entry");
  const input = page.getByLabel("هدف موظف أ");
  await input.fill("10000");
  await page.getByRole("button", { name: "حفظ الهدف" }).click();
  await page.waitForTimeout(2000);
  const t = await readDoc(`employeeTargets/tgt-usr-agentA-${month}`);
  check(t?.amount === 10000 && t?.branchId === "b1" && t?.userId === "usr-agentA", "target saved for the right employee and month");
  check((await main.innerText()).includes("3,000") || (await main.innerText()).includes("3000"), "achievement shows the real purchase (3,000)");
  check((await main.innerText()).includes("30"), "percentage shown");
  check(!(await readDoc(`employeeTargets/tgt-usr-bm1-${month}`)), "no target was created for the manager");
});

await as("agentA", async (page, go) => {
  await go("هدفي");
  const txt = await page.locator("main").innerText();
  check(txt.includes("10,000") && txt.includes("3,000"), "salesperson sees their own target and achievement");
  check(!txt.includes("نظرة الإدارة"), "salesperson does not get the management overview");
  check(!(await page.locator("aside").innerText()).includes("الحسابات"), "salesperson has no accounts entry");
});

await as("agentC", async (page, go) => {
  await go("هدفي");
  check(!(await page.locator("main").innerText()).includes("10,000"), "another branch's salesperson never sees that target");
});

await as("accountant", async (page, go) => {
  await go("الحسابات");
  const main = page.locator("main");
  await page.getByRole("button", { name: "مصروف", exact: true }).click();
  await page.getByPlaceholder("0.00").fill("250");
  await page.getByPlaceholder(/مثلاً: دفعة/).fill("إيجار المعرض");
  await page.getByRole("button", { name: "تسجيل", exact: true }).click();
  await page.waitForTimeout(2500);
  check((await main.innerText()).includes("إيجار المعرض"), "the accountant records an expense and sees it");
  let entries = [];
  await env.withSecurityRulesDisabled(async (ctx) => {
    entries = (await getDocs(collection(ctx.firestore(), "accountingEntries"))).docs.map((d) => d.data());
  });
  check(entries.length === 1 && entries[0].amount === 250 && entries[0].type === "expense" && entries[0].status === "posted" && entries[0].createdByName === "المحاسب", "the entry is stored once, as posted, with its author");
  await page.getByRole("button", { name: "الأرصدة والملخص" }).click();
  await page.waitForTimeout(600);
  check((await main.innerText()).includes("-250") || (await main.innerText()).includes("−250") || (await main.innerText()).includes("250"), "the balance reflects the expense");
  await page.getByRole("button", { name: "الحركات", exact: true }).click();
  await page.getByRole("button", { name: "إلغاء", exact: true }).first().click();
  await page.locator('[role="dialog"] input').fill("مبلغ غلط");
  await page.getByRole("button", { name: "تأكيد الإلغاء" }).click();
  await page.waitForTimeout(2000);
  await env.withSecurityRulesDisabled(async (ctx) => {
    entries = (await getDocs(collection(ctx.firestore(), "accountingEntries"))).docs.map((d) => d.data());
  });
  check(entries.length === 1 && entries[0].status === "void" && entries[0].voidReason === "مبلغ غلط" && entries[0].amount === 250, "cancelling keeps the entry, marks it void and records why");
});

await as("bm1", async (page, go) => {
  const aside = await page.locator("aside").innerText();
  check(!aside.includes("الزيارات") && !aside.includes("التقييمات والشكاوى"), "the visits and reviews entries are gone from the menu");
  await go("جروبات التليجرام");
  await page.getByRole("button", { name: "جروب جديد" }).click();
  await page.locator('[role="dialog"] input').first().fill("جروب المبيعات");
  await page.locator('[role="dialog"] input[dir="ltr"]').fill("https://evil.com/abc");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await page.waitForTimeout(800);
  check((await page.locator('[role="dialog"]').innerText()).includes("لينك تليجرام"), "a non-Telegram link is refused with a message");
  await page.locator('[role="dialog"] input[dir="ltr"]').fill("t.me/sales_team");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await page.waitForTimeout(2000);
  check((await page.locator("main").innerText()).includes("جروب المبيعات"), "the manager adds a Telegram group");
  let groups = [];
  await env.withSecurityRulesDisabled(async (ctx) => { groups = (await getDocs(collection(ctx.firestore(), "telegramGroups"))).docs.map((d) => d.data()); });
  check(groups.length === 1 && groups[0].link === "https://t.me/sales_team" && groups[0].createdByName === "مدير فرع 1", "the group is stored once with the tidied link");
});

await as("agentA", async (page, go) => {
  await go("جروبات التليجرام");
  const txt = await page.locator("main").innerText();
  check(txt.includes("جروب المبيعات") && !txt.includes("جروب جديد"), "a salesperson sees the group but cannot add or edit");
  const href = await page.getByRole("link", { name: /افتح الجروب/ }).first().getAttribute("href");
  check(href === "https://t.me/sales_team", "the open button points at the Telegram link");
});

await as("gm", async (page, go) => {
  await go("الحسابات");
  check((await page.locator("main").innerText()).includes("الحسابات"), "the owner can open the accounts page");
});

await browser.close();
server.close();
await env.cleanup();
console.log(failures ? `\n${failures} check(s) failed` : "\nall app checks passed");
process.exit(failures ? 1 : 0);
