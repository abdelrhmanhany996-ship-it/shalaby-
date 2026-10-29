// The real app against the Firebase emulators with the real security rules:
// signs in as different roles and checks what each one can see and do.
import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { chromium } from "playwright-core";
import { makeXlsx } from "./xlsx-fixture.mjs";

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
  await setDoc(doc(f, "followUps", "F2"), { id: "F2", leadId: "L1", leadName: "عميل أحمد الخاص", leadPhone: "01000000001", assignedAgentId: "usr-agentA", assignedAgentName: "موظف أ", branchId: "b1", scheduledAt: "2026-02-10", reason: "متابعة بعد المعاينة", type: "call", notes: "", status: "overdue" });
  await setDoc(doc(f, "followUps", "F3"), { id: "F3", leadId: "L3", leadName: "عميل فرع تاني", leadPhone: "01000000003", assignedAgentId: "usr-agentC", assignedAgentName: "موظف ج", branchId: "b2", scheduledAt: "2026-02-10", reason: "متابعة", type: "call", notes: "", status: "overdue" });
  await setDoc(doc(f, "brokers", "BR1"), { id: "BR1", name: "وسيط فرع 1", phone: "01111111111", type: "individual", active: true, totalReferrals: 0, totalVolume: 0, branchIds: ["b1"] });
  await setDoc(doc(f, "brokers", "BR2"), { id: "BR2", name: "وسيط فرع 2", phone: "01222222222", type: "individual", active: true, totalReferrals: 0, totalVolume: 0, branchIds: ["b2"] });
});

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
// A stand-in for api/ai.php: it plays the model's part (asks for one tool, then answers from what the browser sent back),
// so the test checks the real loop in the app: the tool runs on the user's live, rule-scoped data and the answer shows it.
const aiCalls = [];
function fakeAi(req, res) {
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ configured: true, voice: false }));
  }
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => setTimeout(() => {
    const body = JSON.parse(raw || "{}");
    if (body.mode === "coach") {
      res.writeHead(200, { "Content-Type": "application/json" });
      const first = body.snapshot?.candidates?.[0];
      return res.end(JSON.stringify({ headline: "يومك فيه متابعات متأخرة", items: first ? [{ leadId: first.leadId, priority: 1, why: "متأخرة", evidence: `متأخرة ${first.daysOverdue} يوم`, action: "كلّمه", message: "أهلًا", replies: [] }] : [], team: [], limits: "" }));
    }
    aiCalls.push({ auth: /^Bearer .+/.test(req.headers.authorization || ""), body });
    const last = body.contents?.[body.contents.length - 1]?.parts ?? [];
    const result = last.find((p) => p.functionResponse)?.functionResponse?.response?.result;
    res.writeHead(200, { "Content-Type": "application/json" });
    if (!result) {
      const call = { name: "attention_needed", args: {} };
      return res.end(JSON.stringify({ type: "tool_calls", calls: [call], modelContent: { role: "model", parts: [{ functionCall: call }] } }));
    }
    const names = (result.followUps?.rows ?? []).map((r) => `${r.customer} (متأخرة ${r.daysLate} يوم)`);
    const text = names.length ? `المتابعات المتأخرة:\n- ${names.join("\n- ")}` : "مفيش متابعات متأخرة.";
    res.end(JSON.stringify({ type: "final", text, modelContent: { role: "model", parts: [{ text }] } }));
  }, 900));
}

// A stand-in for api/telegram.php: one group chat the bot is in, with two messages; sending adds one.
const tgSent = [];
const tgMessages = [
  { id: 1, date: 1793250000, fromId: "5", fromName: "أحمد علي", username: "ahmed", isBot: false, kind: "text", text: "عميل جديد: محمد 01012345678", fileId: null, fileName: null, replyTo: null, edited: false, sentBy: null },
  { id: 2, date: 1793250100, fromId: "6", fromName: "منى", username: null, isBot: false, kind: "service", text: "انضم: كريم", fileId: null, fileName: null, replyTo: null, edited: false, sentBy: null },
];
function fakeTelegram(req, res) {
  const out = (code, data) => (res.writeHead(code, { "Content-Type": "application/json" }), res.end(JSON.stringify(data)));
  if (req.method === "GET") return out(200, { configured: true, storage: true });
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    if (!/^Bearer .+/.test(req.headers.authorization || "")) return out(401, { error: "unauthorized" });
    if (body.action === "status") return out(200, { bot: { username: "shalaby_bot", name: "Shalaby", readsAllMessages: true }, webhook: { connected: true, pending: 0, lastError: null } });
    if (body.action === "chats") return out(200, { chats: [{ chatId: "-1001234567", title: "مبيعات الجيزة", type: "supergroup", lastAt: 1793250100, lastText: "انضم: كريم", member: true, count: 2 }] });
    if (body.action === "messages") return out(200, { rev: tgMessages.length, messages: body.after ? tgMessages.slice(body.after) : tgMessages });
    if (body.action === "send") {
      tgSent.push(body);
      tgMessages.push({ id: tgMessages.length + 1, date: 1793250200, fromId: "bot", fromName: "مالك", username: null, isBot: true, kind: "text", text: body.text, fileId: null, fileName: null, replyTo: null, edited: false, sentBy: "usr-gm" });
      return out(200, { ok: true, id: tgMessages.length });
    }
    out(400, { error: "bad_request" });
  });
}

const server = createServer((req, res) => {
  if (req.url.startsWith("/api/ai.php")) return fakeAi(req, res);
  if (req.url.startsWith("/api/telegram.php")) return fakeTelegram(req, res);
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
async function as(who, fn, viewport = { width: 1400, height: 1000 }) {
  const ctx = await browser.newContext({ viewport, locale: "ar-EG", serviceWorkers: "block", colorScheme: process.env.DARK ? "dark" : "light" });
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
  let auto = [];
  await env.withSecurityRulesDisabled(async (ctx) => {
    auto = (await getDocs(collection(ctx.firestore(), "followUps"))).docs.map((d) => d.data()).filter((f) => f.leadName === "عميل من الفورم");
  });
  const in2 = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  check(auto.length === 1 && auto[0].scheduledAt.slice(0, 10) === in2 && auto[0].assignedAgentId === "usr-agentA" && auto[0].origin === "auto", "a new customer gets a follow-up two days after registration");
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
  const card = page.locator("article", { hasText: "متابعة عرض السعر" });
  for (const b of ["اشترى", "هتواصل معاه", "اشترى من مكان تاني", "تحديد معاد"]) check((await card.getByRole("button", { name: b, exact: true }).count()) === 1, `the follow-up card has the «${b}» button`);
  await card.getByRole("button", { name: "تحديد معاد" }).click();
  await page.locator('[role="dialog"] input[type="date"]').fill("2030-02-01");
  await page.locator('[role="dialog"] input[type="time"]').fill("14:30");
  await page.locator('[role="dialog"] textarea').fill("العميل طلب أكلمه بعد الإجازة");
  await page.getByRole("button", { name: "حفظ المعاد" }).click();
  await page.waitForTimeout(2000);
  const f = await readDoc("followUps/F1");
  check(f?.scheduledAt === "2030-02-01T14:30" && f?.rescheduleCount === 1 && f?.rescheduleLog?.[0]?.reason === "العميل طلب أكلمه بعد الإجازة" && f?.rescheduleLog?.[0]?.from === "2026-01-05", "rescheduling saved the new date, the count and the reason");
  await page.locator("article", { hasText: "متابعة عرض السعر" }).locator("select[aria-label='أولوية المتابعة']").selectOption("high");
  await page.waitForTimeout(1500);
  check((await readDoc("followUps/F1"))?.priority === "high", "priority saved");
  await card.getByRole("button", { name: "اشترى من مكان تاني" }).click();
  await page.locator('[role="dialog"] textarea').fill("من محل جنبه");
  await page.getByRole("button", { name: "تأكيد" }).click();
  await page.waitForTimeout(2000);
  const done = await readDoc("followUps/F1");
  check(done?.status === "completed" && done?.outcomeResult?.includes("اشترى من مكان تاني"), "«bought elsewhere» closes the follow-up with the reason");
  await page.getByRole("button", { name: /خطة شلبي اليوم/ }).click();
  await page.waitForTimeout(800);
  check((await main.innerText()).includes("خطة شلبي النهارده"), "the daily plan tab opens and shows a plan built from the user's data");
});

await as("bm1", async (page, go) => {
  await go("الأهداف والأداء");
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
  await page.getByRole("button", { name: "المزيد عن موظف أ" }).click();
  await page.waitForTimeout(400);
  const more = await main.innerText();
  check(more.includes("باع بـ") && more.includes("3,000 ج.م"), "«المزيد» shows how much the employee sold and their invoices");
  await page.getByRole("button", { name: /التأخير في المتابعات/ }).click();
  check((await main.innerText()).includes("متأخر") , "«المزيد» shows the employee's follow-up delays");
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

// The monthly target can also be set from the employee's edit form.
await as("gm", async (page, go) => {
  await page.locator("aside summary", { hasText: "الإدارة" }).click();
  await go("الموظفون");
  await page.locator("tr", { hasText: "موظف أ" }).first().getByTitle("تعديل بيانات الموظف").click();
  const field = page.getByLabel("قيمة التارجت");
  check((await field.inputValue()) === "10000", "the edit form shows the employee's current monthly target");
  await field.fill("12000");
  // the seeded test employee has no phone, which the form requires
  for (const req of await page.locator("form input[required]").all()) if (!(await req.inputValue())) await req.fill("01000000001");
  await page.getByRole("button", { name: "حفظ التعديلات" }).click();
  await page.waitForTimeout(2000);
  const t = await readDoc(`employeeTargets/tgt-usr-agentA-${month}`);
  check(t?.amount === 12000 && t?.history?.length === 1, "saving the form updated the target and kept its history");
});

// بيان بيع: a salesperson uploads an Excel file; the branch manager sees it, another branch does not.
await as("agentA", async (page, go) => {
  await go("بيان بيع");
  const xlsx = makeXlsx([["مؤسسة شلبي"], ["العميل", "المبلغ", "رقم الفاتورة"], ["عميل 1", 1200, 501], ["عميل 2", 800.5, 502]]);
  await page.locator('input[type="file"]').setInputFiles({ name: "october.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: xlsx });
  const dialog = page.getByRole("dialog", { name: "رفع بيان بيع" });
  await dialog.waitFor({ timeout: 5000 });
  check((await dialog.innerText()).includes("عميل 2"), "the upload shows a preview of the Excel rows");
  await dialog.getByRole("button", { name: "رفع البيان" }).click();
  await page.waitForTimeout(2000);
  let docs = [];
  await env.withSecurityRulesDisabled(async (ctx) => {
    docs = (await getDocs(collection(ctx.firestore(), "salesStatements"))).docs.map((d) => d.data());
  });
  const s = docs.find((d) => d.fileName === "october.xlsx");
  check(!!s && s.rowCount === 2 && s.branchId === "b1" && s.uploadedById === "usr-agentA", "the statement was saved for the salesperson's branch");
  check(JSON.stringify(s?.totals) === JSON.stringify([{ column: "المبلغ", sum: 2000.5 }]), "the amount column was totalled (and the invoice numbers were not)");
  const rows = s && (await readDoc(`salesStatementRows/${s.id}`));
  check(rows?.rowsJson?.includes("عميل 1"), "the rows were stored");
  await page.getByRole("button", { name: "عرض october" }).click();
  const view = page.getByRole("dialog", { name: "october" });
  await view.getByText("عميل 2").waitFor({ timeout: 5000 });
  check((await view.innerText()).includes("2,000.5"), "the viewer shows the rows and the total");
  if (process.env.SHOTS) {
    await page.screenshot({ path: `${process.env.SHOTS}/statement-view.png` });
    await view.getByRole("button", { name: "إغلاق" }).click();
    await page.screenshot({ path: `${process.env.SHOTS}/statements.png` });
  }
});

await as("bm1", async (page, go) => {
  await go("بيان بيع");
  check((await page.locator("main").innerText()).includes("october"), "the branch manager sees the salesperson's statement");
});

await as("agentC", async (page, go) => {
  await go("بيان بيع");
  check(!(await page.locator("main").innerText()).includes("october"), "another branch's salesperson does not see it");
});

// Telegram groups: the owner adds the group the bot is in, opens its chat inside the CRM and replies.
await as("gm", async (page, go) => {
  await go("جروبات التليجرام");
  const main = page.locator("main");
  await main.getByText("مبيعات الجيزة").first().waitFor({ timeout: 5000 });
  check((await main.innerText()).includes("ومش مربوطة"), "the owner sees the group the bot is in but is not linked yet");
  await main.getByRole("button", { name: "ضيفه" }).click();
  await page.waitForTimeout(1500);
  let groups = [];
  await env.withSecurityRulesDisabled(async (ctx) => {
    groups = (await getDocs(collection(ctx.firestore(), "telegramGroups"))).docs.map((d) => d.data());
  });
  check(groups.some((g) => g.chatId === "-1001234567" && g.link === ""), "the group was saved linked to its Telegram chat (rules allow it without an invite link)");
  await main.getByRole("button", { name: "افتح الشات" }).first().click();
  const chat = page.getByRole("region", { name: /شات مبيعات الجيزة/ });
  await chat.getByText("عميل جديد: محمد 01012345678").waitFor({ timeout: 6000 });
  check((await chat.innerText()).includes("أحمد علي"), "the chat shows the group's messages with the sender's name");
  await chat.getByLabel("رسالة للجروب").fill("تمام يا أحمد، سجلته");
  await chat.getByRole("button", { name: "إرسال" }).click();
  await chat.getByText("تمام يا أحمد، سجلته").waitFor({ timeout: 6000 });
  check(tgSent.length === 1 && tgSent[0].text === "تمام يا أحمد، سجلته" && !!tgSent[0].groupId, "a reply from the CRM goes to the server for the bot to post");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/telegram-chat.png` });
});

await as("agentA", async (page, go) => {
  await go("جروبات التليجرام");
  const main = page.locator("main");
  await main.getByText("مبيعات الجيزة").first().waitFor({ timeout: 5000 });
  check((await main.getByRole("button", { name: "افتح الشات" }).count()) === 1 && (await main.getByRole("button", { name: "ضيفه" }).count()) === 0, "a salesperson opens the chat but does not manage groups");
});

const RETIRED = ["الزيارات", "التقييمات والشكاوى", "المشتريات", "كبار العملاء والوسطاء", "الوسطاء والشركاء", "التقارير", "الحسابات", "الهيكل الإداري", "الأقسام والفروع", "مصفوفة الصلاحيات", "قسم المطورين"];

await as("gm", async (page) => {
  const aside = await page.locator("aside").textContent();
  check(["الرئيسية", "العملاء", "المتابعات", "الأهداف والأداء", "الموظفون"].every((t) => aside.includes(t)), "the owner's menu has customers, follow-ups, targets and staff");
  check(!RETIRED.some((t) => aside.includes(t)), "retired screens are gone from the owner's menu");
  const main = await page.locator("main").innerText();
  check(main.includes("محتاج تتحرك فيه دلوقتي") && main.includes("الأهداف الشهر ده"), "the simplified home shows follow-ups and targets");
  // nothing was deleted: the accounting entry and the Telegram group recorded earlier are still in the database
  let n = 0;
  await env.withSecurityRulesDisabled(async (ctx) => {
    n = (await getDocs(collection(ctx.firestore(), "leads"))).size;
  });
  check(n >= 3, "customer records are intact");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/desktop-home.png` });
});

await as("agentA", async (page) => {
  const aside = await page.locator("aside").textContent();
  check(!RETIRED.some((t) => aside.includes(t)), "retired screens are gone from the salesperson's menu");
  // Shalaby AI: the button is always there, and the chat answers from the user's own data through the server
  const fab = page.getByRole("button", { name: /افتح شلبي/ });
  check((await fab.count()) === 1 && (await fab.innerText()).includes("شلبي"), "the floating شلبي button is on screen");
  await fab.click();
  await page.waitForTimeout(600);
  const panel = page.getByRole("dialog", { name: /شلبي/ });
  check((await panel.locator(".zaki-img").count()) > 0, "the character appears inside the chat");
  await panel.locator("textarea, input").first().fill("مين عنده متابعات متأخرة؟");
  await panel.getByRole("button", { name: "إرسال" }).click();
  await page.waitForTimeout(200);
  check((await panel.locator(".zaki-mood-thinking").count()) > 0, "the character thinks while the answer is prepared");
  await panel.locator(".zaki-msg.bot:not(.zaki-thinking)").last().waitFor({ timeout: 8000 });
  await page.waitForTimeout(300);
  check((await panel.locator(".zaki-mood-talking").count()) > 0, "the character talks while the answer appears");
  await page.waitForTimeout(2500);
  const answer = await panel.innerText();
  check(answer.includes("عميل أحمد الخاص"), "the answer quotes a real follow-up the tool read from the database");
  check(!answer.includes("عميل فرع تاني") && !answer.includes("عميل المدير"), "the answer holds nothing outside the salesperson's scope");
  check(aiCalls.length >= 2 && aiCalls.every((c) => c.auth), "the browser called the server, with the user's token, for each step");
  const toolResult = JSON.stringify(aiCalls[aiCalls.length - 1].body);
  check(toolResult.includes("functionResponse") && !toolResult.includes("عميل فرع تاني"), "the tool result sent to the AI is the user's own data only");
  const bundle = readdirSync(join(DIST, "assets")).filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(DIST, "assets", f), "utf8")).join("\n");
  check(!/sk-ant-[A-Za-z0-9_-]{10,}/.test(bundle), "no Claude key anywhere in the app's code");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/desktop-chat.png` });
});

// Phone width: the menu, the home and the chat must fit and stay usable.
await as("agentA", async (page) => {
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  check(scrollW <= 392, `no sideways scrolling on a phone (${scrollW}px)`);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/mobile-home.png` });
  await page.getByRole("button", { name: /افتح شلبي/ }).click();
  await page.waitForTimeout(800);
  const box = await page.getByRole("dialog", { name: /شلبي/ }).boundingBox();
  check(!!box && box.width <= 390 && box.x >= 0, "the chat fits the phone screen");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/mobile-chat.png` });
}, { width: 390, height: 844 });

await browser.close();
server.close();
await env.cleanup();
console.log(failures ? `\n${failures} check(s) failed` : "\nall app checks passed");
process.exit(failures ? 1 : 0);
