import type { Quote } from "../types/crm";
import { lineTotal } from "./purchaseLines";
import { quoteCompany } from "./quotes";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const slashDate = (d: string) => d.replaceAll("-", "/");

/** The printable page of a quote, laid out like the company's paper statement. */
export function quoteHtml(q: Quote): string {
  const c = quoteCompany;
  const rows = q.lines
    .map((l, i) => {
      const qty = l.qty ?? 1;
      const price = l.price ?? (qty ? l.total / qty : l.total);
      return `<tr><td>${i + 1}</td><td class="name">${esc(l.name)}</td><td>${fmt(qty)}</td><td class="shade">${fmt(price)}</td><td><b>${fmt(lineTotal(l))}</b></td></tr>`;
    })
    .join("");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(c.title)} ${esc(q.number)}</title>
<style>
  @page { size: A4; margin: 0 }
  * { box-sizing: border-box }
  body { font-family: "Cairo", "Segoe UI", Tahoma, sans-serif; margin: 0; color: #1b1b1b }
  .head { display: flex; align-items: center; justify-content: space-between; padding: 28px 40px; border-bottom: 6px solid #6aa84f; direction: ltr }
  .brand b { font-size: 34px; letter-spacing: 1px } .brand span { display: block; font-size: 11px; letter-spacing: 6px; color: #555 }
  .contact { font-size: 11px; color: #444; line-height: 1.6; text-align: left }
  .page { padding: 28px 48px }
  h1 { font-size: 28px; margin: 0 0 6px } h2 { font-size: 18px; margin: 0 0 14px }
  .meta { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 18px }
  .intro { text-align: center; font-size: 15px; line-height: 2 }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; text-align: center }
  th, td { border: 1px solid #222; padding: 9px 6px; font-size: 14px }
  th { background: #c6e0b4; } th:first-child { background: #a9d18e }
  td.shade, th.shade { background: #d9d9d9 } td.name { direction: ltr }
  .total td { font-size: 17px; background: #d9d9d9 }
  ul { margin: 36px 0 0; padding: 0 22px 0 0; font-size: 13px; line-height: 2.2 }
  li::marker { color: #6aa84f }
  .num { color: #777; font-size: 11px; margin-top: 30px }
  @media print { .noprint { display: none } }
</style></head><body>
<div class="head"><div class="brand"><b>${esc(c.nameEn)}</b><span>${esc(c.tagline)}</span></div>
<div class="contact">${esc(c.address)}<br>${c.phones.map(esc).join("<br>")}</div></div>
<div class="page">
  <h1>${esc(c.title)}</h1>
  <h2>مقدم للسادة / ${esc(q.addressedTo || q.leadName)}</h2>
  <div class="meta"><span>رقم: ${esc(q.number)}</span><span>التاريخ: ${esc(slashDate(q.date))}</span></div>
  <p class="intro">تحية طيبة و بعد<br>${esc(c.intro)}</p>
  <table><thead><tr><th>م</th><th>الصنف</th><th>الكمية</th><th class="shade">السعر</th><th>الاجمالي</th></tr></thead>
  <tbody>${rows}<tr class="total"><td colspan="4">الاجمالي</td><td><b>${fmt(q.total)} جنية مصري</b></td></tr></tbody></table>
  <ul>${q.terms.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
  <p class="num">${esc(q.agentName ?? "")}</p>
</div></body></html>`;
}

/** Opens the printable quote in a new window (the browser's print dialog also saves it as a PDF). */
export function printQuote(q: Quote): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(quoteHtml(q));
  w.document.close();
  w.focus();
  // Give the page a moment to lay out before the print dialog opens.
  setTimeout(() => w.print(), 500);
  return true;
}
