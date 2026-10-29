import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Upload, X, Eye, Download, Trash2, Search } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { useDialog } from "../components/common/useDialog";
import { readErrorText, readSpreadsheet, toCsv, type Sheet } from "../lib/spreadsheet";
import { filterStatements, headerIndex } from "../lib/salesStatements";
import { today } from "../lib/presentation";
import { monthOf } from "../lib/targets";
import type { SalesStatement } from "../types/crm";

const ACCEPT = ".xlsx,.xlsm,.csv,.xls";
const PAGE = 100;
const MANAGERS = ["admin", "general_manager", "regional_manager", "branch_manager"];

interface Draft {
  fileName: string;
  sheets: Sheet[];
  sheet: number;
  title: string;
  branchId: string;
  month: string;
  note: string;
}

const monthLabel = (m?: string) => (m ? new Date(`${m}-01T00:00:00`).toLocaleDateString("ar-EG", { month: "long", year: "numeric" }) : "—");
const num = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });

export function SalesStatementsPage() {
  const { effectiveUser, branches, salesStatements, addSalesStatement, loadSalesStatementRows, removeSalesStatement } = useCRM();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [reading, setReading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [month, setMonth] = useState("");
  const [confirming, setConfirming] = useState("");
  const [view, setView] = useState<{ s: SalesStatement; rows: string[][] | null; q: string; page: number } | null>(null);

  const closeDraft = () => {
    setDraft(null);
    // the next file the person picked, if any
    const [next, ...rest] = queue;
    setQueue(rest);
    if (next) void open(next, rest);
  };
  const draftRef = useDialog(!!draft, closeDraft);
  const viewRef = useDialog(!!view, () => setView(null));

  const list = useMemo(() => filterStatements(salesStatements, q, branch, month), [salesStatements, q, branch, month]);
  const canDelete = (s: SalesStatement) => s.uploadedById === effectiveUser.id || MANAGERS.includes(effectiveUser.role);
  const defaultBranch = effectiveUser.branchId && branches.some((b) => b.id === effectiveUser.branchId) ? effectiveUser.branchId : branches[0]?.id ?? "";
  const flash = (t: string) => {
    setMsg(t);
    window.setTimeout(() => setMsg(""), 5000);
  };

  async function open(file: File, rest: File[] = queue) {
    setError("");
    if (file.size > 15 * 1024 * 1024) {
      setError(`«${file.name}»: الملف أكبر من 15 ميجا.`);
      return;
    }
    setReading(true);
    try {
      const res = await readSpreadsheet(file.name, new Uint8Array(await file.arrayBuffer()));
      if ("error" in res) {
        setError(`«${file.name}»: ${readErrorText[res.error]}`);
        const [next, ...more] = rest;
        setQueue(more);
        if (next) void open(next, more);
        return;
      }
      setDraft({
        fileName: file.name,
        sheets: res.sheets,
        sheet: 0,
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
        branchId: defaultBranch,
        month: monthOf(today()),
        note: "",
      });
    } finally {
      setReading(false);
    }
  }

  const pick = (files: FileList | null) => {
    const all = Array.from(files ?? []);
    if (!all.length) return;
    const [first, ...rest] = all;
    setQueue(rest);
    void open(first, rest);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const s = await addSalesStatement({
        title: draft.title,
        fileName: draft.fileName,
        sheet: draft.sheets[draft.sheet],
        branchId: draft.branchId,
        branchName: branches.find((b) => b.id === draft.branchId)?.name,
        month: draft.month || undefined,
        note: draft.note,
      });
      flash(`اترفع «${s.title}» (${s.rowCount.toLocaleString("en-US")} صف).`);
      closeDraft();
    } catch (err) {
      setError(err instanceof Error && err.message && !/permission/i.test(err.message) ? err.message : "تعذر رفع البيان. اتأكد من الفرع وحاول تاني.");
    } finally {
      setSaving(false);
    }
  };

  const show = async (s: SalesStatement) => {
    setView({ s, rows: null, q: "", page: 0 });
    try {
      const rows = await loadSalesStatementRows(s.id);
      setView((v) => (v && v.s.id === s.id ? { ...v, rows } : v));
    } catch {
      setView((v) => (v && v.s.id === s.id ? { ...v, rows: [] } : v));
    }
  };

  const download = async (s: SalesStatement, rows?: string[][] | null) => {
    const data = rows ?? (await loadSalesStatementRows(s.id));
    const url = URL.createObjectURL(new Blob([toCsv(s.headers, data)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.title}.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const remove = async (s: SalesStatement) => {
    setConfirming("");
    try {
      await removeSalesStatement(s.id);
      flash(`اتحذف «${s.title}».`);
    } catch {
      setError("تعذر الحذف.");
    }
  };

  const sheet = draft?.sheets[draft.sheet];
  const previewHead = sheet ? headerIndex(sheet.rows) : 0;
  const shownRows = useMemo(() => {
    if (!view?.rows) return [];
    const t = view.q.trim().toLowerCase();
    return t ? view.rows.filter((r) => r.some((c) => c.toLowerCase().includes(t))) : view.rows;
  }, [view?.rows, view?.q]);

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ملفات Excel للمبيعات</span>
          <h1>بيان بيع</h1>
          <p>ارفع ملف Excel أو CSV، وهيتحفظ ويتعرض هنا مع إجمالي الأعمدة اللي فيها أرقام.</p>
        </div>
        <button className="btn-primary" onClick={() => input.current?.click()} disabled={reading}>
          <Upload size={15} />
          ارفع ملف
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          aria-label="اختار ملف بيان البيع"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {msg && (
        <p className="notice" role="status">
          {msg}
        </p>
      )}
      {error && !draft && (
        <p className="notice warning" role="alert">
          {error}
        </p>
      )}

      <section
        className={`panel statement-drop ${drag ? "is-drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
      >
        <FileSpreadsheet size={30} strokeWidth={1.4} />
        <strong>{reading ? "بقرا الملف…" : "اسحب ملف Excel هنا أو اضغط للاختيار"}</strong>
        <span className="table-secondary">‎.xlsx أو ‎.csv · لحد 5000 صف للملف</span>
      </section>

      <section className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <div className="field-grid">
          <label className="field">
            <span>بحث</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم البيان أو الملف أو اللي رفعه…" />
          </label>
          {branches.length > 1 && (
            <label className="field">
              <span>الفرع</span>
              <select value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value="">كل الفروع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>الشهر</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
        </div>
      </section>

      {list.length ? (
        <section className="panel">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>البيان</th>
                  <th>الشهر</th>
                  <th>الفرع</th>
                  <th>الصفوف</th>
                  <th>الإجماليات</th>
                  <th>رفعه</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <button className="btn-text" style={{ padding: 0 }} onClick={() => show(s)}>
                        <strong>{s.title}</strong>
                      </button>
                      <div className="table-secondary" dir="auto">
                        {s.fileName}
                        {s.note ? ` · ${s.note}` : ""}
                      </div>
                    </td>
                    <td>{monthLabel(s.month)}</td>
                    <td>{s.branchName ?? branches.find((b) => b.id === s.branchId)?.name ?? "—"}</td>
                    <td>{s.rowCount.toLocaleString("en-US")}</td>
                    <td>
                      {s.totals.length
                        ? s.totals.slice(0, 3).map((t) => (
                            <div key={t.column} className="table-secondary">
                              {t.column}: <strong>{num(t.sum)}</strong>
                            </div>
                          ))
                        : "—"}
                    </td>
                    <td>
                      {s.uploadedByName}
                      <div className="table-secondary">{dateLabel(s.createdAt)}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button className="icon-button" onClick={() => show(s)} aria-label={`عرض ${s.title}`} title="عرض">
                          <Eye size={15} />
                        </button>
                        <button className="icon-button" onClick={() => download(s)} aria-label={`تنزيل ${s.title}`} title="تنزيل CSV">
                          <Download size={15} />
                        </button>
                        {canDelete(s) &&
                          (confirming === s.id ? (
                            <span className="confirm-inline" role="alert">
                              متأكد؟
                              <button className="btn-primary" onClick={() => remove(s)}>
                                احذف
                              </button>
                              <button className="btn-text" onClick={() => setConfirming("")}>
                                لأ
                              </button>
                            </span>
                          ) : (
                            <button className="icon-button" onClick={() => setConfirming(s.id)} aria-label={`حذف ${s.title}`} title="حذف">
                              <Trash2 size={15} />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="empty-state">
            <FileSpreadsheet size={28} strokeWidth={1.3} />
            <h3>{salesStatements.length ? "مفيش بيان بالشكل ده" : "لسه مفيش بيانات بيع"}</h3>
            <p>{salesStatements.length ? "غيّر البحث أو الفلتر." : "ارفع أول ملف Excel من الزرار «ارفع ملف»."}</p>
          </div>
        </section>
      )}

      {draft && sheet && (
        <div className="dialog-backdrop">
          <div className="panel" ref={draftRef} role="dialog" aria-modal="true" aria-labelledby="ss-title" style={{ width: "min(760px,100%)", padding: 24, maxHeight: "92vh", overflow: "auto" }}>
            <div className="page-heading">
              <div>
                <h2 id="ss-title" style={{ fontSize: 20, fontWeight: 600 }}>
                  رفع بيان بيع
                </h2>
                <p className="table-secondary" dir="auto">
                  {draft.fileName} · {Math.max(0, sheet.rows.length - previewHead - 1).toLocaleString("en-US")} صف
                </p>
              </div>
              <button className="icon-button" onClick={closeDraft} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={save}>
              <div className="field-grid">
                <label className="field">
                  <span>
                    اسم البيان <em>مطلوب</em>
                  </span>
                  <input required minLength={2} maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                </label>
                <label className="field">
                  <span>الشهر</span>
                  <input type="month" value={draft.month} onChange={(e) => setDraft({ ...draft, month: e.target.value })} />
                </label>
                <label className="field">
                  <span>
                    الفرع <em>مطلوب</em>
                  </span>
                  <select required value={draft.branchId} onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                {draft.sheets.length > 1 && (
                  <label className="field">
                    <span>الشيت</span>
                    <select value={draft.sheet} onChange={(e) => setDraft({ ...draft, sheet: Number(e.target.value) })}>
                      {draft.sheets.map((s, i) => (
                        <option key={i} value={i}>
                          {s.name} ({s.rows.length} صف)
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <label className="field">
                <span>
                  ملاحظة <em className="optional-tag">اختياري</em>
                </span>
                <input maxLength={300} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              </label>

              <p className="table-secondary" style={{ margin: "14px 0 6px" }}>
                معاينة أول الصفوف (الصف المظلل هو عناوين الأعمدة):
              </p>
              <div className="table-scroll statement-preview">
                <table className="data-table">
                  <tbody>
                    {sheet.rows.slice(previewHead, previewHead + 8).map((r, i) => (
                      <tr key={i} className={i === 0 ? "is-head" : ""}>
                        {r.map((c, j) => (
                          <td key={j} dir="auto">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <p className="notice warning" role="alert">
                  {error}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
                {queue.length > 0 && <span className="table-secondary" style={{ marginInlineEnd: "auto", alignSelf: "center" }}>بعده {queue.length} ملف</span>}
                <button type="button" className="btn-secondary" onClick={closeDraft}>
                  {queue.length ? "تخطي" : "إلغاء"}
                </button>
                <button className="btn-primary" type="submit" disabled={saving}>
                  <Upload size={15} />
                  {saving ? "بيترفع…" : "رفع البيان"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {view && (
        <div className="dialog-backdrop">
          <div className="panel" ref={viewRef} role="dialog" aria-modal="true" aria-labelledby="sv-title" style={{ width: "min(1100px,100%)", padding: 24, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
            <div className="page-heading">
              <div>
                <h2 id="sv-title" style={{ fontSize: 20, fontWeight: 600 }}>
                  {view.s.title}
                </h2>
                <p className="table-secondary">
                  {monthLabel(view.s.month)} · {view.s.rowCount.toLocaleString("en-US")} صف · رفعه {view.s.uploadedByName} {dateLabel(view.s.createdAt)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-secondary" onClick={() => download(view.s, view.rows)} disabled={!view.rows}>
                  <Download size={14} />
                  تنزيل
                </button>
                <button className="icon-button" onClick={() => setView(null)} aria-label="إغلاق">
                  <X size={18} />
                </button>
              </div>
            </div>
            {view.s.totals.length > 0 && (
              <div className="statement-totals">
                {view.s.totals.map((t) => (
                  <div key={t.column} className="metric">
                    <span className="metric-top">إجمالي {t.column}</span>
                    <strong className="metric-value">{num(t.sum)}</strong>
                  </div>
                ))}
              </div>
            )}
            <label className="field" style={{ marginBottom: 10 }}>
              <span className="sr-only">بحث في البيان</span>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", insetInlineStart: 10, top: 12, opacity: 0.5 }} />
                <input value={view.q} onChange={(e) => setView({ ...view, q: e.target.value, page: 0 })} placeholder="دوّر في الصفوف…" style={{ paddingInlineStart: 30 }} />
              </div>
            </label>
            <div className="table-scroll" style={{ flex: 1, overflow: "auto" }}>
              {!view.rows ? (
                <p className="table-secondary" style={{ padding: 20 }}>
                  بيحمّل…
                </p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {view.s.headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.slice(view.page * PAGE, view.page * PAGE + PAGE).map((r, i) => (
                      <tr key={i}>
                        <td className="table-secondary">{view.page * PAGE + i + 1}</td>
                        {view.s.headers.map((_, j) => (
                          <td key={j} dir="auto">
                            {r[j] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {view.rows && shownRows.length > PAGE && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
                <button className="btn-secondary" disabled={view.page === 0} onClick={() => setView({ ...view, page: view.page - 1 })}>
                  السابق
                </button>
                <span className="table-secondary">
                  {view.page + 1} من {Math.ceil(shownRows.length / PAGE)}
                </span>
                <button className="btn-secondary" disabled={(view.page + 1) * PAGE >= shownRows.length} onClick={() => setView({ ...view, page: view.page + 1 })}>
                  التالي
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
