import { useMemo, useState } from "react";
import { Check, FileText, Pencil, Plus, Printer, Send, X } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { PurchaseDetails } from "../components/common/PurchaseDetails";
import { useDialog } from "../components/common/useDialog";
import { formatMoney } from "../lib/presentation";
import { defaultTerms, QUOTE_FOLLOWUP_DAYS, quoteError, quoteStatusNames, validUntil } from "../lib/quotes";
import { printQuote } from "../lib/quotePrint";
import { isSales } from "../lib/access";
import type { PurchaseLine, Quote, QuoteStatus } from "../types/crm";

const statusClass: Record<QuoteStatus, string> = { draft: "", sent: "is-warning", accepted: "is-success", lost: "is-new" };
type Filter = "all" | QuoteStatus;
const emptyLine = (): PurchaseLine => ({ name: "", total: 0 });

export function QuotesPage() {
  const { quotes, leads, effectiveUser, saveQuote, setQuoteStatus, acceptQuote } = useCRM();
  const [filter, setFilter] = useState<Filter>("all");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [leadId, setLeadId] = useState("");
  const [addressedTo, setAddressedTo] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([emptyLine()]);
  const [terms, setTerms] = useState(defaultTerms.join("\n"));
  const [error, setError] = useState("");
  const [losing, setLosing] = useState<Quote | null>(null);
  const [lostReason, setLostReason] = useState("");
  const showSeller = !isSales(effectiveUser);

  const closeEditor = () => setEditing(null);
  const closeLost = () => setLosing(null);
  const editorRef = useDialog(!!editing, closeEditor);
  const lostRef = useDialog(!!losing, closeLost);

  const shown = useMemo(() => quotes.filter((q) => filter === "all" || q.status === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [quotes, filter]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: quotes.length, draft: 0, sent: 0, accepted: 0, lost: 0 };
    for (const q of quotes) c[q.status] += 1;
    return c;
  }, [quotes]);
  const sellable = useMemo(() => [...leads].sort((a, b) => a.name.localeCompare(b.name, "ar")), [leads]);

  const say = (text: string, bad = false) => setMsg({ text, bad });
  const run = (fn: () => string | void) => {
    try {
      const text = fn();
      if (text) say(text);
    } catch (e) {
      say(e instanceof Error ? e.message : "تعذر تنفيذ الإجراء.", true);
    }
  };

  const openNew = () => {
    setEditing({});
    setLeadId("");
    setAddressedTo("");
    setLines([emptyLine()]);
    setTerms(defaultTerms.join("\n"));
    setError("");
  };
  const openEdit = (q: Quote) => {
    setEditing({ id: q.id });
    setLeadId(q.leadId);
    setAddressedTo(q.addressedTo);
    setLines(q.lines.length ? q.lines : [emptyLine()]);
    setTerms(q.terms.join("\n"));
    setError("");
  };

  const save = (send: boolean) => {
    const problem = quoteError({ leadId, lines });
    if (problem) return setError(problem);
    try {
      const q = saveQuote({ leadId, addressedTo, lines, terms: terms.split("\n") }, { id: editing?.id, send });
      setEditing(null);
      say(
        send
          ? q.followUpId
            ? `اتحفظ العرض ${q.number} واتجدولت متابعة بعد ${QUOTE_FOLLOWUP_DAYS} أيام.`
            : `اتحفظ العرض ${q.number}. عندك متابعة مفتوحة مع العميل فمفيش متابعة تلقائية.`
          : `اتحفظ العرض ${q.number} كمسودة.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الحفظ.");
    }
  };

  const print = (q: Quote) => {
    if (!printQuote(q)) say("المتصفح منع فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة لموقع شلبي وجرّب تاني.", true);
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">بيان بيع للعميل</span>
          <h1>عروض الأسعار</h1>
          <p>اعمل عرض السعر للعميل بالأصناف والأسعار، اطبعه أو احفظه PDF، ولو بعتّه من غير متابعة، شلبي بيجدول لك متابعة بعد {QUOTE_FOLLOWUP_DAYS} أيام.</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={16} />
          عرض سعر جديد
        </button>
      </div>
      {msg && (
        <p className={`notice ${msg.bad ? "warning" : ""}`} role={msg.bad ? "alert" : "status"}>
          {msg.text}
        </p>
      )}
      <div className="tab-filter" role="group" aria-label="حالة العرض" style={{ marginBottom: 16 }}>
        {(["all", "draft", "sent", "accepted", "lost"] as Filter[]).map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "الكل" : quoteStatusNames[f]} ({counts[f]})
          </button>
        ))}
      </div>

      <section className="panel">
        {shown.length === 0 ? (
          <div className="empty-state">
            <FileText size={26} />
            <p>{quotes.length ? "مفيش عروض بالحالة دي." : "لسه ما عملتش أي عرض سعر. دوس «عرض سعر جديد»."}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>التاريخ</th>
                  <th>العميل</th>
                  {showSeller && <th>السيلز</th>}
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((q) => {
                  const until = validUntil(q);
                  return (
                    <tr key={q.id}>
                      <td dir="ltr">{q.number}</td>
                      <td>
                        {q.date}
                        {until && <small className="table-secondary" style={{ display: "block" }}>ساري لحد {until}</small>}
                      </td>
                      <td>
                        {q.leadName}
                        <small className="table-secondary" style={{ display: "block" }}>{q.lines.length} صنف</small>
                      </td>
                      {showSeller && <td>{q.agentName ?? "—"}</td>}
                      <td>{formatMoney(q.total)} ج.م</td>
                      <td>
                        <span className={`status-pill ${statusClass[q.status]}`}>{quoteStatusNames[q.status]}</span>
                        {q.lostReason && <small className="table-secondary" style={{ display: "block" }}>{q.lostReason}</small>}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn-secondary" onClick={() => print(q)} aria-label={`طباعة ${q.number}`}>
                            <Printer size={14} /> طباعة / PDF
                          </button>
                          {(q.status === "draft" || q.status === "sent") && (
                            <button className="btn-secondary" onClick={() => openEdit(q)} aria-label={`تعديل ${q.number}`}>
                              <Pencil size={14} /> تعديل
                            </button>
                          )}
                          {q.status === "draft" && (
                            <button className="btn-secondary" onClick={() => run(() => (setQuoteStatus(q.id, "sent"), `اتعلّم العرض ${q.number} إنه اتبعت.`))}>
                              <Send size={14} /> اتبعت للعميل
                            </button>
                          )}
                          {(q.status === "draft" || q.status === "sent") && (
                            <button className="btn-primary" onClick={() => run(() => (acceptQuote(q.id), `اتسجّل بيع ${formatMoney(q.total)} ج.م من العرض ${q.number}.`))}>
                              <Check size={14} /> اتقبل: سجّل بيع
                            </button>
                          )}
                          {(q.status === "draft" || q.status === "sent") && (
                            <button className="btn-secondary" onClick={() => (setLosing(q), setLostReason(""))}>
                              <X size={14} /> ما اتقبلش
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <div className="dialog-backdrop">
          <div className="panel" ref={editorRef} role="dialog" aria-modal="true" aria-labelledby="quote-title" style={{ width: "min(760px,100%)", padding: 27, maxHeight: "92vh", overflow: "auto" }}>
            <div className="page-heading">
              <div>
                <h2 id="quote-title" style={{ fontSize: 20, fontWeight: 600 }}>
                  {editing.id ? "تعديل عرض السعر" : "عرض سعر جديد"}
                </h2>
              </div>
              <button className="icon-button" onClick={closeEditor} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>
                  العميل <em>مطلوب</em>
                </span>
                <select
                  value={leadId}
                  disabled={!!editing.id}
                  onChange={(e) => {
                    setLeadId(e.target.value);
                    setAddressedTo(sellable.find((l) => l.id === e.target.value)?.name ?? "");
                  }}
                >
                  <option value="">اختار العميل</option>
                  {sellable.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {l.phone}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>مقدم للسادة / (الاسم على الورقة)</span>
                <input value={addressedTo} maxLength={120} onChange={(e) => setAddressedTo(e.target.value)} placeholder="اسم العميل أو الشركة" />
              </label>
            </div>
            <PurchaseDetails
              itemsOnly
              heading="الأصناف"
              hint="اكتب كل صنف (النوع والقدرة زي ما تحب)، سعر الوحدة اللي هتبيع بيه، والكمية. الإجمالي بيتحسب لوحده."
              totalLabel="إجمالي العرض"
              lines={lines}
              direct=""
              onChange={({ lines: next }) => setLines(next)}
            />
            <label className="field" style={{ marginTop: 14 }}>
              <span>الملاحظات تحت الجدول (كل سطر نقطة)</span>
              <textarea rows={5} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </label>
            {error && (
              <p className="notice warning" role="alert">
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => save(true)}>
                <Send size={15} /> حفظ وإرسال للعميل
              </button>
              <button className="btn-secondary" onClick={() => save(false)}>
                حفظ كمسودة
              </button>
              <button className="btn-secondary" onClick={closeEditor}>
                إلغاء
              </button>
            </div>
            <p className="quiet-note" style={{ marginTop: 10 }}>
              «حفظ وإرسال» بيعلّم العرض إنه اتبعت، ولو مفيش متابعة مفتوحة مع العميل بيجدول متابعة بعد {QUOTE_FOLLOWUP_DAYS} أيام. بعد الحفظ دوس «طباعة / PDF» من القائمة.
            </p>
          </div>
        </div>
      )}

      {losing && (
        <div className="dialog-backdrop">
          <div className="panel" ref={lostRef} role="dialog" aria-modal="true" aria-labelledby="quote-lost-title" style={{ width: "min(430px,100%)", padding: 27 }}>
            <h2 id="quote-lost-title" style={{ fontSize: 20, fontWeight: 600 }}>
              العرض {losing.number} ما اتقبلش
            </h2>
            <label className="field" style={{ marginTop: 12 }}>
              <span>
                السبب <em className="optional-tag">اختياري</em>
              </span>
              <input value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="السعر عالي، اشترى من مكان تاني..." />
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                className="btn-primary"
                onClick={() => {
                  run(() => (setQuoteStatus(losing.id, "lost", lostReason), `اتقفل العرض ${losing.number}.`));
                  setLosing(null);
                }}
              >
                تأكيد
              </button>
              <button className="btn-secondary" onClick={closeLost}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
