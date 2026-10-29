// Runs the real app against the emulators with a richer data set: quotes (send, accept, follow-ups), Shalaby registering sales, reports, weekly reports. Takes screenshots into $SHOTS.
import { readFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { chromium } from "playwright-core";

const DIST = process.env.APP_DIST;
const OUT = process.env.SHOTS || "/tmp/shalaby-flows-shots";
mkdirSync(OUT, { recursive: true });
const PROJECT = "shalaby-crm-eg";
const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8181 } });
await env.clearFirestore();
const signUp = async (email) => (await (await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "Passw0rd!x", returnSecureToken: true }) })).json()).localId;
const people = {
  gm: { role: "general_manager", name: "المدير العام" },
  regional: { role: "regional_manager", name: "مدير المبيعات" },
  agentA: { role: "sales_agent", branchId: "b1", name: "أحمد سمير" },
  agentB: { role: "sales_agent", branchId: "b1", name: "منى حسن" },
  agentC: { role: "sales_agent", branchId: "b2", name: "كريم عادل" },
};
const uids = {};
for (const k of Object.keys(people)) uids[k] = await signUp(`${k}@staff.shalaby.local`);
const day = new Date().toISOString().slice(0, 10);
const month = day.slice(0, 7);
const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
await env.withSecurityRulesDisabled(async (ctx) => {
  const f = ctx.firestore();
  await setDoc(doc(f, "meta", "bootstrap"), { at: "2026" });
  for (const id of ["b1", "b2"]) await setDoc(doc(f, "branches", id), { id, name: id === "b1" ? "الفرع الرئيسي" : "فرع الإسكندرية", code: id, city: "", phone: "", address: "", active: true, governorateId: "gov-cairo" });
  for (const [k, p] of Object.entries(people)) {
    await setDoc(doc(f, "authProfiles", uids[k]), { uid: uids[k], userId: `usr-${k}`, email: `${k}@staff.shalaby.local`, name: p.name, role: p.role, active: true, ...(p.branchId ? { branchId: p.branchId } : {}) });
    await setDoc(doc(f, "users", `usr-${k}`), { id: `usr-${k}`, name: p.name, email: "", phone: "", role: p.role, active: true, createdAt: "2026", authUid: uids[k], ...(p.branchId ? { branchId: p.branchId } : {}) });
  }
  const lead = (id, b, a, name, phone) => setDoc(doc(f, "leads", id), { id, name, phone, branchId: b, assignedAgentId: `usr-${a}`, status: "interested", source: "phone_inquiry", classification: "B", department: "general", notes: "", createdAt: ago(10) });
  await lead("L1", "b1", "agentA", "أولاد مسعود", "01012345678");
  await lead("L2", "b1", "agentA", "شركة النور للتجارة", "01122334455");
  await lead("L3", "b1", "agentB", "محمد حلمي", "01029348950");
  await lead("L4", "b2", "agentC", "مصنع الدلتا", "01255556666");
  const sale = (id, lead, name, agent, branch, amount, date) => setDoc(doc(f, "bookings", id), { id, leadId: lead, leadName: name, leadPhone: "010", branchId: branch, agentId: `usr-${agent}`, department: "general", courseId: "ps-general", courseName: "AC10-2Hp/380", lines: [{ name: "AC10-2Hp/380", price: amount / 2, qty: 2, total: amount }], bookingDate: date, amount, departmentAmounts: { general: amount }, bookingStatus: "confirmed", source: "phone_inquiry", notes: "", createdAt: `${date}T10:00:00Z` });
  await sale("S1", "L1", "أولاد مسعود", "agentA", "b1", 900000, ago(3));
  await sale("S2", "L2", "شركة النور للتجارة", "agentA", "b1", 420000, ago(1));
  await sale("S3", "L3", "محمد حلمي", "agentB", "b1", 340000, ago(2));
  await sale("S4", "L4", "مصنع الدلتا", "agentC", "b2", 140000, ago(1));
  for (const [k, amt] of [["agentA", 1000000], ["agentB", 1000000], ["agentC", 1000000]]) await setDoc(doc(f, "employeeTargets", `tgt-usr-${k}-${month}`), { id: `tgt-usr-${k}-${month}`, userId: `usr-${k}`, userName: people[k].name, branchId: people[k].branchId, month, amount: amt, setById: "usr-gm", setByName: "المدير العام", createdAt: "2026", updatedAt: "2026" });
  await setDoc(doc(f, "followUps", "F1"), { id: "F1", leadId: "L3", leadName: "محمد حلمي", leadPhone: "01029348950", assignedAgentId: "usr-agentA", assignedAgentName: "أحمد سمير", branchId: "b1", scheduledAt: ago(2), reason: "متابعة عرض السعر", type: "call", notes: "", status: "overdue" });
  await setDoc(doc(f, "weeklyReports", ago(7)), { id: ago(7), from: ago(7), to: day, createdAt: "2026", text: "x", rowsJson: JSON.stringify([{ userId: "usr-agentA", name: "أحمد سمير", sold: 1320000, deals: 2, target: 1000000, percent: 132 }, { userId: "usr-agentB", name: "منى حسن", sold: 340000, deals: 1, target: 1000000, percent: 34 }]), totalJson: JSON.stringify({ sold: 1660000, deals: 3, target: 2000000, percent: 83 }) });
});

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2" };
const aiCalls = [];
function fakeAi(req, res) {
  if (req.method === "GET") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ configured: true, voice: false })); }
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => setTimeout(() => {
    const body = JSON.parse(raw || "{}");
    aiCalls.push(body.tools?.map((t) => t.name));
    const last = body.contents?.[body.contents.length - 1]?.parts ?? [];
    const fr = last.find((p) => p.functionResponse)?.functionResponse?.response?.result;
    res.writeHead(200, { "Content-Type": "application/json" });
    if (fr) {
      const text = fr.status === "pending_confirmation" ? "جهّزتها. أسجلها؟" : `الأداة رجّعت: ${JSON.stringify(fr).slice(0, 120)}`;
      return res.end(JSON.stringify({ type: "final", text, modelContent: { role: "model", parts: [{ text }] } }));
    }
    const text = body.contents.at(-1).parts[0].text;
    const call = text.includes("مسعود") ? { name: "prepare_sale", args: { customer: "مسعود", items: [{ name: "AC10-2Hp/380", qty: 2, price: 4500 }, { name: "AC10-2Hp/220", qty: 1, price: 3900 }] } } : text.includes("جديد") ? { name: "prepare_sale", args: { customer: "عميل جديد", phone: "٠١٠٩٩٩٩٨٨٨٨", items: [{ name: "جهاز", qty: 1, price: 2000 }] } } : { name: "list_quotes", args: {} };
    res.end(JSON.stringify({ type: "tool_calls", calls: [call], modelContent: { role: "model", parts: [{ functionCall: call }] } }));
  }, 300));
}
const server = createServer((req, res) => {
  if (req.url.startsWith("/api/ai.php")) return fakeAi(req, res);
  if (req.url.startsWith("/api/")) { res.writeHead(404); return res.end("{}"); }
  let path = decodeURIComponent(req.url.split("?")[0]);
  if (path.endsWith("/")) path += "index.html";
  try { const body = readFileSync(join(DIST, path)); res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(200, { "Content-Type": "text/html" }); res.end(readFileSync(join(DIST, "index.html"))); }
}).listen(8090);

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
let failures = 0;
const check = (ok, what) => { console.log(`${ok ? "✔" : "✖"} ${what}`); if (!ok) failures++; };
const collectionDocs = async (name) => { let rows = []; await env.withSecurityRulesDisabled(async (ctx) => { rows = (await getDocs(collection(ctx.firestore(), name))).docs.map((d) => d.data()); }); return rows; };

async function as(who, fn, { mobile = false, tag = who } = {}) {
  const viewport = mobile ? { width: 390, height: 844 } : { width: 1360, height: 900 };
  const ctx = await browser.newContext({ viewport, locale: "ar-EG", serviceWorkers: "block", deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && /permission|insufficient/i.test(m.text()) && errors.push(m.text().slice(0, 200)));
  page.on("dialog", (d) => d.accept());
  await page.goto("http://127.0.0.1:8090/");
  await page.screenshot({ path: `${OUT}/${tag}-0-login.png` });
  await page.locator("input").first().fill(`${who}@staff.shalaby.local`);
  await page.locator('input[type="password"]').fill("Passw0rd!x");
  await page.locator('button[type="submit"]').click();
  await page.waitForSelector(mobile ? ".mobile-nav" : "aside", { timeout: 20000 });
  await page.waitForTimeout(2500);
  const shot = async (name) => { await page.waitForTimeout(600); await page.screenshot({ path: `${OUT}/${tag}-${name}.png` }); };
  const go = async (t) => {
    if (mobile) { await page.locator(".mobile-nav button", { hasText: t }).first().click().catch(async () => { await page.locator("button.mobile-menu, .mobile-nav button:last-child").last().click(); await page.locator("aside").getByText(t, { exact: true }).first().click(); }); }
    else await page.locator("aside").getByText(t, { exact: true }).first().click();
    await page.waitForTimeout(1200);
  };
  await fn(page, go, shot);
  check(errors.length === 0, `${tag}: no page/permission errors${errors.length ? " → " + errors.join(" | ") : ""}`);
  await ctx.close();
}

// ---- the salesperson, desktop: home, quote -> sent -> accepted, Shalaby registers a sale ----
await as("agentA", async (page, go, shot) => {
  await shot("1-home");
  await go("عروض الأسعار");
  await shot("2-quotes-empty");
  await page.getByRole("button", { name: /عرض سعر جديد/ }).click();
  await page.waitForTimeout(500);
  await page.locator('[role="dialog"] select').selectOption({ label: /مسعود/ }).catch(async () => { const opts = await page.locator('[role="dialog"] select option').allInnerTexts(); await page.locator('[role="dialog"] select').selectOption({ index: opts.findIndex((o) => o.includes("مسعود")) }); });
  await page.getByLabel("اسم الصنف 1").fill("AC10-2Hp/380");
  await page.getByLabel("سعر القطعة 1").fill("4500");
  await page.getByLabel("عدد القطع 1").fill("2");
  await shot("3-quote-editor");
  await page.getByRole("button", { name: /حفظ وإرسال للعميل/ }).click();
  await page.waitForTimeout(2500);
  let quotes = await collectionDocs("quotes");
  check(quotes.length === 1 && quotes[0].status === "sent" && quotes[0].total === 9000, "a quote is saved as sent with its total");
  const fus = (await collectionDocs("followUps")).filter((f) => f.leadId === "L1" && f.origin === "auto");
  const cairo = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(d);
  const in3 = cairo(new Date(Date.now() + 3 * 86400000));
  check(fus.length === 1 && fus[0].scheduledAt.slice(0, 10) === in3 && fus[0].reason.includes(quotes[0].number), "sending the quote schedules the follow-up 3 days later");
  await shot("4-quotes-list");
  await page.getByRole("button", { name: /اتقبل: سجّل بيع/ }).first().click();
  await page.waitForTimeout(2500);
  quotes = await collectionDocs("quotes");
  const bks = (await collectionDocs("bookings")).filter((b) => b.notes?.includes(quotes[0].number));
  check(quotes[0].status === "accepted" && bks.length === 1 && bks[0].amount === 9000 && bks[0].lines?.[0]?.name === "AC10-2Hp/380", "accepting the quote records the sale with the same lines");
  const closed = (await collectionDocs("followUps")).find((f) => f.id === fus[0].id);
  check(closed?.status === "completed", "the quote's follow-up is closed by the sale");
  const sat = (await collectionDocs("followUps")).filter((f) => f.category === "post_sale" && f.leadId === "L1");
  check(sat.length === 1 && sat[0].milestone === "7d", "one satisfaction follow-up is scheduled after the sale");
  await go("مبيعاتي");
  await shot("5-report");
  await go("الرئيسية");
  await shot("6-home-after");
  // Shalaby
  await page.getByRole("button", { name: /افتح شلبي/ }).click();
  await page.waitForTimeout(800);
  await shot("7-shalaby-open");
  const box = page.getByPlaceholder(/اكتب سؤالك/);
  await box.fill("سجل بيع لأولاد مسعود جهازين");
  await page.getByRole("button", { name: "إرسال" }).click();
  await page.waitForSelector("text=تمام، سجّل", { timeout: 15000 });
  await shot("8-shalaby-confirm");
  check(aiCalls.some((t) => t?.includes("prepare_sale")), "the sale tool is offered to the model");
  const before = (await collectionDocs("bookings")).length;
  await page.getByRole("button", { name: /تمام، سجّل/ }).click();
  await page.waitForTimeout(2500);
  const after = await collectionDocs("bookings");
  const made = after.filter((b) => b.notes?.includes("شلبي"));
  check(after.length === before + 1 && made[0]?.amount === 12900 && made[0]?.lines?.length === 2, "confirming records the sale from Shalaby (12,900 with two lines)");
  await shot("9-shalaby-done");
  // typed confirmation for a new customer with Arabic-Indic digits
  await box.fill("سجل بيع لعميل جديد");
  await page.getByRole("button", { name: "إرسال" }).click();
  await page.waitForSelector("text=تمام، سجّل >> nth=0", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const bodyText = await page.locator(".zaki-panel").innerText();
  check(bodyText.includes("جهّزتها") && (bodyText.match(/تمام، سجّل/g) || []).length >= 1, "a new customer with an Arabic-Indic phone number is prepared too");
  await box.fill("تمام");
  await page.getByRole("button", { name: "إرسال" }).click();
  await page.waitForTimeout(3000);
  const leads = await collectionDocs("leads");
  check(leads.some((l) => l.name === "عميل جديد" && /^010999/.test(l.phone)), "typing «تمام» registers the new customer and the sale");
  await shot("10-shalaby-typed");
});

// ---- the owner: home, targets, report, weekly reports ----
await as("gm", async (page, go, shot) => {
  await shot("1-home");
  await go("الأهداف والأداء");
  await shot("2-targets");
  await go("تقرير المبيعات");
  await shot("3-report");
  await page.getByText("التقارير الأسبوعية التلقائية").scrollIntoViewIfNeeded();
  await page.locator("section", { hasText: "التقارير الأسبوعية التلقائية" }).locator("button").first().click();
  await shot("4-report-weekly-open");
  const txt = await page.locator("main").innerText();
  check(txt.includes("أحمد سمير") && txt.includes("منى حسن"), "the owner sees every seller in the report");
  check(txt.includes("1,320,000") || txt.includes("132"), "the weekly report opens");
  check(!(await page.locator("aside").innerText()).includes("جروبات التليجرام"), "the Telegram tab is gone from the menu");
});

// ---- the sales manager and a mobile salesperson ----
await as("regional", async (page, go, shot) => { await shot("1-home"); await go("الأهداف والأداء"); await shot("2-targets"); });
await as("agentB", async (page, go, shot) => {
  await shot("1-home");
  await go("العملاء"); await shot("2-clients");
  await page.locator(".mobile-nav button").last().click(); await page.waitForTimeout(700); await shot("3-menu");
}, { mobile: true, tag: "mobile-agentB" });
await as("agentA", async (page, go, shot) => {
  await page.getByRole("button", { name: /افتح شلبي/ }).click();
  await page.waitForTimeout(800); await shot("1-shalaby");
  await page.getByPlaceholder(/اكتب سؤالك/).fill("سجل بيع لأولاد مسعود جهازين");
  await page.getByRole("button", { name: "إرسال" }).click();
  await page.waitForSelector("text=تمام، سجّل", { timeout: 15000 });
  await shot("2-shalaby-confirm");
}, { mobile: true, tag: "mobile-agentA" });

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
await browser.close(); server.close(); await env.cleanup();
process.exit(failures ? 1 : 0);
