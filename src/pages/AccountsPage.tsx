import { useMemo, useState } from "react";
import { Download, Plus, X, Landmark } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { hasPermission } from "../lib/permissions";
import { formatMoney, today } from "../lib/presentation";
import { useDialog } from "../components/common/useDialog";
import { balances, entriesTable, filterEntries, recordedSales, summarize, type EntryInput, type Filters } from "../lib/accounting";
import { toCsv } from "../lib/reportExports";
import type { AccountEntry, AccountEntryType, AccountingSettings } from "../types/crm";

type Tab = "entries" | "summary" | "settings";
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const monthStart = (d: string) => `${d.slice(0, 7)}-01`;

const blank = (type: AccountEntryType, settings: AccountingSettings): EntryInput => ({
  date: today(),
  type,
  amount: Number.NaN,
  accountId: settings.accounts.find((a) => a.active)?.id ?? "",
  categoryId: settings.categories.find((c) => c.active && c.type === type)?.id ?? "",
  description: "",
});

export function AccountsPage() {
  const { effectiveUser, accountEntries, accountingSettings: settings, addAccountEntry, voidAccountEntry, correctAccountEntry, updateAccountingSettings, users, bookings } = useCRM();
  const canManage = hasPermission(effectiveUser, "accounts.manage");
  const [tab, setTab] = useState<Tab>("entries");
  const [f, setF] = useState<Filters>({ from: monthStart(today()), to: today(), type: "all", status: "posted" });
  const set = (patch: Partial<Filters>) => setF((x) => ({ ...x, ...patch }));
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const flash = (text: string, bad = false) => {
    setMsg({ text, bad });
    window.setTimeout(() => setMsg(null), 5000);
  };

  // dialogs: a new entry, a correction (void + new), a plain cancel
  const [form, setForm] = useState<{ mode: "new" | "correct"; target?: AccountEntry; input: EntryInput; amountText: string; reason: string } | null>(null);
  const [cancelling, setCancelling] = useState<AccountEntry | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState("");
  const formRef = useDialog(!!form, () => setForm(null));
  const cancelRef = useDialog(!!cancelling, () => setCancelling(null));

  const shown = useMemo(() => filterEntries(accountEntries, f), [accountEntries, f]);
  const sum = useMemo(() => summarize(shown), [shown]);
  const bal = useMemo(() => balances(settings, accountEntries, today()), [settings, accountEntries]);
  const catName = (id: string) => settings.categories.find((c) => c.id === id)?.name ?? id;
  const accName = (id: string) => settings.accounts.find((a) => a.id === id)?.name ?? "حساب غير معرّف";
  const sales = hasPermission(effectiveUser, "bookings.view") ? recordedSales(bookings, f.from, f.to) : null;

  const openNew = (type: AccountEntryType) => {
    setError("");
    setForm({ mode: "new", input: blank(type, settings), amountText: "", reason: "" });
  };
  const openCorrect = (e: AccountEntry) => {
    setError("");
    setForm({ mode: "correct", target: e, input: { date: e.date, type: e.type, amount: e.amount, accountId: e.accountId, categoryId: e.categoryId, description: e.description, employeeId: e.employeeId, employeeName: e.employeeName, bookingId: e.bookingId, reference: e.reference }, amountText: String(e.amount), reason: "" });
  };
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    const amount = Number(form.amountText.replace(/[,٬\s]/g, ""));
    const input = { ...form.input, amount };
    try {
      if (form.mode === "new") addAccountEntry(input);
      else correctAccountEntry(form.target!.id, input, form.reason);
      setForm(null);
      flash(form.mode === "new" ? "اتسجّلت الحركة." : "اتصحّحت: الحركة القديمة اتلغت والجديدة اتسجلت وبينهم ربط.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ الحركة.");
    }
  };
  const submitCancel = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!cancelling) return;
    try {
      voidAccountEntry(cancelling.id, cancelReason);
      setCancelling(null);
      setCancelReason("");
      flash("اتلغت الحركة وفضلت محفوظة في السجل.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الإلغاء.");
    }
  };
  const exportCsv = () => {
    const blob = new Blob([toCsv(entriesTable(shown, settings))], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `الحسابات-${f.from || "البداية"}-${f.to || "اليوم"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // settings editing (accounts and categories)
  const [draft, setDraft] = useState<AccountingSettings | null>(null);
  const editing = draft ?? settings;
  const saveSettings = () => {
    if (!draft) return;
    if (draft.accounts.some((a) => !a.name.trim()) || draft.categories.some((c) => !c.name.trim())) return flash("كل حساب وتصنيف لازم له اسم.", true);
    updateAccountingSettings(draft);
    setDraft(null);
    flash("اتحفظت إعدادات الحسابات.");
  };

  const employees = users.filter((u) => u.active);
  const catOptions = (form ? settings.categories.filter((c) => c.active && c.type === form.input.type) : []);

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">دفتر الحسابات: كل رقم له حركة ورا</span>
          <h1>الحسابات</h1>
          <p>الأرصدة بتتحسب من الحركات المسجّلة بس. أي تصحيح بيتسجل ومبيتمسحش حاجة.</p>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => openNew("income")}>
              <Plus size={15} />
              إيراد
            </button>
            <button className="btn-secondary" onClick={() => openNew("expense")}>
              <Plus size={15} />
              مصروف
            </button>
          </div>
        )}
      </div>
      {msg && (
        <p className={`notice ${msg.bad ? "warning" : ""}`} role={msg.bad ? "alert" : "status"}>
          {msg.text}
        </p>
      )}

      <div className="metric-grid">
        <div className="metric">
          <span className="metric-top">رصيد الحسابات النهارده</span>
          <strong className="metric-value">{money(bal.total)}<small>ج.م</small></strong>
          <span className="metric-note">{bal.rows.filter((r) => r.account.active).length} حساب</span>
        </div>
        <div className="metric">
          <span className="metric-top">إيرادات الفترة</span>
          <strong className="metric-value" style={{ color: "var(--buy)" }}>{money(sum.income)}<small>ج.م</small></strong>
        </div>
        <div className="metric">
          <span className="metric-top">مصروفات الفترة</span>
          <strong className="metric-value" style={{ color: "var(--late)" }}>{money(sum.expense)}<small>ج.م</small></strong>
        </div>
        <div className="metric">
          <span className="metric-top">صافي الفترة</span>
          <strong className="metric-value">{money(sum.net)}<small>ج.م</small></strong>
          <span className="metric-note">{sum.count} حركة</span>
        </div>
      </div>

      <div className="tab-filter" role="group" aria-label="أقسام الحسابات" style={{ marginBottom: 12 }}>
        <button aria-pressed={tab === "entries"} onClick={() => setTab("entries")}>الحركات</button>
        <button aria-pressed={tab === "summary"} onClick={() => setTab("summary")}>الأرصدة والملخص</button>
        {canManage && <button aria-pressed={tab === "settings"} onClick={() => setTab("settings")}>الحسابات والتصنيفات</button>}
      </div>

      {tab !== "settings" && (
        <section className="panel" style={{ marginBottom: 16, padding: 16 }}>
          <div className="field-grid">
            <label className="field">
              <span>من</span>
              <input type="date" value={f.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
            </label>
            <label className="field">
              <span>إلى</span>
              <input type="date" value={f.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
            </label>
            <label className="field">
              <span>النوع</span>
              <select value={f.type} onChange={(e) => set({ type: e.target.value as Filters["type"] })}>
                <option value="all">الكل</option>
                <option value="income">إيرادات</option>
                <option value="expense">مصروفات</option>
              </select>
            </label>
            <label className="field">
              <span>الحساب</span>
              <select value={f.accountId ?? ""} onChange={(e) => set({ accountId: e.target.value || undefined })}>
                <option value="">كل الحسابات</option>
                {settings.accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>التصنيف</span>
              <select value={f.categoryId ?? ""} onChange={(e) => set({ categoryId: e.target.value || undefined })}>
                <option value="">كل التصنيفات</option>
                {settings.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>المسؤول</span>
              <select value={f.employeeId ?? ""} onChange={(e) => set({ employeeId: e.target.value || undefined })}>
                <option value="">كل الموظفين</option>
                {employees.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>الحالة</span>
              <select value={f.status} onChange={(e) => set({ status: e.target.value as Filters["status"] })}>
                <option value="posted">المسجّلة</option>
                <option value="void">الملغاة</option>
                <option value="all">الكل</option>
              </select>
            </label>
            <label className="field">
              <span>بحث في البيان</span>
              <input value={f.q ?? ""} onChange={(e) => set({ q: e.target.value })} placeholder="بيان، مرجع، اسم…" />
            </label>
          </div>
          {sales !== null && (
            <p className="quiet-note" style={{ marginTop: 8 }}>
              للمقارنة فقط: مشتريات العملاء المسجّلة في السيستم في نفس الفترة {money(sales)} ج.م. دي مبيعات مش تحصيل، ومبتدخلش في أرصدة الحسابات إلا لما تتسجل إيراد.
            </p>
          )}
        </section>
      )}

      {tab === "entries" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>الحركات ({shown.length})</h2>
              <p>الأحدث أول</p>
            </div>
            <button className="btn-secondary" onClick={exportCsv} disabled={!shown.length}>
              <Download size={15} />
              تصدير Excel
            </button>
          </div>
          {shown.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>البيان</th>
                    <th>التصنيف</th>
                    <th>الحساب</th>
                    <th>المسؤول</th>
                    <th>المبلغ</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((e) => (
                    <tr key={e.id} style={e.status === "void" ? { opacity: 0.6 } : undefined}>
                      <td dir="ltr">{e.date}</td>
                      <td>
                        {e.status === "void" ? <s>{e.description}</s> : e.description}
                        {e.reference && <small className="table-secondary"> · {e.reference}</small>}
                        {e.replacesId && <small className="table-secondary"> · تصحيح لحركة سابقة</small>}
                        {e.status === "void" && (
                          <small className="table-secondary">
                            <br />
                            ملغاة بواسطة {e.voidedByName}: {e.voidReason}
                          </small>
                        )}
                        <small className="table-secondary">
                          <br />
                          سجّلها {e.createdByName}
                        </small>
                      </td>
                      <td>{catName(e.categoryId)}</td>
                      <td>{accName(e.accountId)}</td>
                      <td>{e.employeeName || "—"}</td>
                      <td style={{ color: e.type === "income" ? "var(--buy)" : "var(--late)", fontVariantNumeric: "tabular-nums" }}>
                        {e.type === "income" ? "+" : "−"}
                        {money(e.amount)}
                      </td>
                      <td>
                        {canManage && e.status === "posted" && (
                          <span style={{ display: "inline-flex", gap: 6 }}>
                            <button className="btn-text" onClick={() => openCorrect(e)}>تصحيح</button>
                            <button className="btn-text" onClick={() => { setError(""); setCancelReason(""); setCancelling(e); }}>إلغاء</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Landmark size={28} strokeWidth={1.3} />
              <h3>مفيش حركات في الفلتر ده</h3>
              <p>{canManage ? "سجّل إيراد أو مصروف من الأزرار فوق." : "لما تتسجل حركات هتظهر هنا."}</p>
            </div>
          )}
        </section>
      )}

      {tab === "summary" && (
        <>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>أرصدة الحسابات</h2>
                <p>الرصيد الافتتاحي + الإيرادات − المصروفات، لحد النهارده (من غير الملغي)</p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الحساب</th>
                    <th>افتتاحي</th>
                    <th>إيرادات</th>
                    <th>مصروفات</th>
                    <th>الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {bal.rows.map((r) => (
                    <tr key={r.account.id} style={r.account.active ? undefined : { opacity: 0.6 }}>
                      <td>{r.account.name}{!r.account.active && <small className="table-secondary"> (متوقف)</small>}</td>
                      <td>{money(r.account.openingBalance)}</td>
                      <td>{money(r.income)}</td>
                      <td>{money(r.expense)}</td>
                      <td><strong>{money(r.balance)}</strong></td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4}><strong>الإجمالي</strong></td>
                    <td><strong>{money(bal.total)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <div className="home-grid" style={{ marginTop: 20 }}>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>حسب التصنيف</h2>
                  <p>الفترة المختارة</p>
                </div>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <tbody>
                    {sum.byCategory.map((c) => (
                      <tr key={c.categoryId}>
                        <td>{catName(c.categoryId)}</td>
                        <td>{c.count} حركة</td>
                        <td style={{ color: c.type === "income" ? "var(--buy)" : "var(--late)" }}>{c.type === "income" ? "+" : "−"}{money(c.total)}</td>
                      </tr>
                    ))}
                    {!sum.byCategory.length && (
                      <tr><td className="table-secondary">مفيش حركات.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>حسب المسؤول</h2>
                  <p>الحركات اللي ليها مسؤول بس</p>
                </div>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <tbody>
                    {sum.byEmployee.map((p) => (
                      <tr key={p.employeeId}>
                        <td>{p.name}</td>
                        <td style={{ color: "var(--buy)" }}>+{money(p.income)}</td>
                        <td style={{ color: "var(--late)" }}>−{money(p.expense)}</td>
                      </tr>
                    ))}
                    {!sum.byEmployee.length && (
                      <tr><td className="table-secondary">مفيش حركات منسوبة لموظفين.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel-header">
              <div>
                <h2>شهر بشهر</h2>
                <p>الفترة المختارة</p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th>الشهر</th><th>إيرادات</th><th>مصروفات</th><th>الصافي</th></tr>
                </thead>
                <tbody>
                  {sum.byMonth.map((m) => (
                    <tr key={m.month}><td dir="ltr">{m.month}</td><td>{money(m.income)}</td><td>{money(m.expense)}</td><td><strong>{money(m.net)}</strong></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "settings" && canManage && (
        <section className="panel" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>الحسابات</h2>
          <p className="quiet-note" style={{ marginBottom: 12 }}>الرصيد الافتتاحي بيتحسب مرة واحدة وبيتسجل أي تعديل عليه في سجل العمليات. الحساب اللي عليه حركات بيتوقف ومبيتمسحش.</p>
          {editing.accounts.map((a, i) => (
            <div className="field-grid" key={a.id} style={{ marginBottom: 8 }}>
              <label className="field">
                <span>اسم الحساب</span>
                <input value={a.name} onChange={(e) => setDraft({ ...editing, accounts: editing.accounts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              </label>
              <label className="field">
                <span>الرصيد الافتتاحي (ج.م)</span>
                <input type="number" step="0.01" value={a.openingBalance} onChange={(e) => setDraft({ ...editing, accounts: editing.accounts.map((x, j) => (j === i ? { ...x, openingBalance: Number(e.target.value) } : x)) })} />
              </label>
              <label className="checkbox-line">
                <input type="checkbox" checked={a.active} onChange={(e) => setDraft({ ...editing, accounts: editing.accounts.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)) })} />
                شغّال
              </label>
            </div>
          ))}
          <button className="btn-text" onClick={() => setDraft({ ...editing, accounts: [...editing.accounts, { id: `acc-${crypto.randomUUID().slice(0, 8)}`, name: "", openingBalance: 0, active: true }] })}>
            + حساب جديد
          </button>

          <h2 style={{ fontSize: 16, margin: "22px 0 6px" }}>التصنيفات</h2>
          {editing.categories.map((c, i) => (
            <div className="field-grid" key={c.id} style={{ marginBottom: 8 }}>
              <label className="field">
                <span>{c.type === "income" ? "تصنيف إيراد" : "تصنيف مصروف"}</span>
                <input value={c.name} onChange={(e) => setDraft({ ...editing, categories: editing.categories.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              </label>
              <label className="checkbox-line">
                <input type="checkbox" checked={c.active} onChange={(e) => setDraft({ ...editing, categories: editing.categories.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)) })} />
                شغّال
              </label>
            </div>
          ))}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {(["income", "expense"] as const).map((t) => (
              <button key={t} className="btn-text" onClick={() => setDraft({ ...editing, categories: [...editing.categories, { id: `cat-${crypto.randomUUID().slice(0, 8)}`, name: "", type: t, active: true }] })}>
                + تصنيف {t === "income" ? "إيراد" : "مصروف"}
              </button>
            ))}
          </div>
          {draft && (
            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              <button className="btn-primary" onClick={saveSettings}>حفظ</button>
              <button className="btn-secondary" onClick={() => setDraft(null)}>تراجع</button>
            </div>
          )}
        </section>
      )}

      {form && (
        <div className="dialog-backdrop">
          <div className="panel" ref={formRef} role="dialog" aria-modal="true" aria-labelledby="acc-form-title" style={{ width: "min(520px,100%)", padding: 27 }}>
            <div className="page-heading">
              <div>
                <h2 id="acc-form-title" style={{ fontSize: 20, fontWeight: 600 }}>
                  {form.mode === "correct" ? "تصحيح حركة" : form.input.type === "income" ? "تسجيل إيراد" : "تسجيل مصروف"}
                </h2>
                {form.mode === "correct" && <p>الحركة القديمة هتتلغي وتفضل محفوظة، والجديدة بتتربط بيها.</p>}
              </div>
              <button className="icon-button" onClick={() => setForm(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="field-grid">
                {form.mode === "new" && (
                  <label className="field">
                    <span>النوع</span>
                    <select
                      value={form.input.type}
                      onChange={(e) => {
                        const type = e.target.value as AccountEntryType;
                        setForm({ ...form, input: { ...form.input, type, categoryId: settings.categories.find((c) => c.active && c.type === type)?.id ?? "" } });
                      }}
                    >
                      <option value="income">إيراد</option>
                      <option value="expense">مصروف</option>
                    </select>
                  </label>
                )}
                <label className="field">
                  <span>التاريخ <em>مطلوب</em></span>
                  <input type="date" required max={today()} value={form.input.date} onChange={(e) => setForm({ ...form, input: { ...form.input, date: e.target.value } })} />
                </label>
                <label className="field">
                  <span>المبلغ (ج.م) <em>مطلوب</em></span>
                  <input required inputMode="decimal" dir="ltr" value={form.amountText} onChange={(e) => setForm({ ...form, amountText: e.target.value })} placeholder="0.00" />
                </label>
                <label className="field">
                  <span>الحساب</span>
                  <select value={form.input.accountId} onChange={(e) => setForm({ ...form, input: { ...form.input, accountId: e.target.value } })}>
                    {settings.accounts.filter((a) => a.active).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>التصنيف</span>
                  <select value={form.input.categoryId} onChange={(e) => setForm({ ...form, input: { ...form.input, categoryId: e.target.value } })}>
                    {catOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>المسؤول <em className="optional-tag">اختياري</em></span>
                  <select
                    value={form.input.employeeId ?? ""}
                    onChange={(e) => {
                      const u = employees.find((x) => x.id === e.target.value);
                      setForm({ ...form, input: { ...form.input, employeeId: u?.id, employeeName: u?.name, branchId: u?.branchId } });
                    }}
                  >
                    <option value="">—</option>
                    {employees.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>البيان <em>مطلوب</em></span>
                <input required value={form.input.description} onChange={(e) => setForm({ ...form, input: { ...form.input, description: e.target.value } })} placeholder="مثلاً: دفعة من العميل أحمد، فاتورة كهرباء…" />
              </label>
              <label className="field">
                <span>رقم مرجع / إيصال <em className="optional-tag">اختياري</em></span>
                <input value={form.input.reference ?? ""} onChange={(e) => setForm({ ...form, input: { ...form.input, reference: e.target.value } })} />
              </label>
              {form.mode === "correct" && (
                <label className="field">
                  <span>سبب التصحيح <em>مطلوب</em></span>
                  <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                </label>
              )}
              {error && <p className="notice warning" role="alert">{error}</p>}
              <button className="btn-primary" type="submit" style={{ marginTop: 14 }}>
                {form.mode === "correct" ? "تأكيد التصحيح" : "تسجيل"}
              </button>
            </form>
          </div>
        </div>
      )}

      {cancelling && (
        <div className="dialog-backdrop">
          <div className="panel" ref={cancelRef} role="dialog" aria-modal="true" aria-labelledby="acc-cancel-title" style={{ width: "min(430px,100%)", padding: 27 }}>
            <h2 id="acc-cancel-title" style={{ fontSize: 20, fontWeight: 600 }}>إلغاء حركة</h2>
            <p className="table-secondary" style={{ marginBlock: 8 }}>
              {cancelling.type === "income" ? "إيراد" : "مصروف"} {money(cancelling.amount)} ج.م: {cancelling.description}. الحركة هتفضل محفوظة ومعلّمة «ملغاة» ومش هتتحسب في الأرصدة.
            </p>
            <form onSubmit={submitCancel}>
              <label className="field">
                <span>سبب الإلغاء <em>مطلوب</em></span>
                <input required autoFocus value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              </label>
              {error && <p className="notice warning" role="alert">{error}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn-primary" type="submit">تأكيد الإلغاء</button>
                <button className="btn-secondary" type="button" onClick={() => setCancelling(null)}>رجوع</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
