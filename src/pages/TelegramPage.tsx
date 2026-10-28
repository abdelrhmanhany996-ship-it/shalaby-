import { useMemo, useState } from "react";
import { Send, Plus, X, Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { hasPermission } from "../lib/permissions";
import { useDialog } from "../components/common/useDialog";
import { filterGroups, normalizeTelegramLink } from "../lib/telegram";
import type { TelegramGroup } from "../types/crm";

interface Form {
  id?: string;
  name: string;
  link: string;
  description: string;
  branchId: string;
}
const blank: Form = { name: "", link: "", description: "", branchId: "" };

export function TelegramPage() {
  const { effectiveUser, telegramGroups, branches, addTelegramGroup, updateTelegramGroup, setTelegramGroupActive, removeTelegramGroup } = useCRM();
  const canManage = hasPermission(effectiveUser, "telegram.manage");
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [confirming, setConfirming] = useState("");
  const [msg, setMsg] = useState("");
  const ref = useDialog(!!form, () => setForm(null));

  // People who are not managers see only the groups that are switched on.
  const visible = useMemo(() => filterGroups(telegramGroups.filter((g) => canManage || g.active), q, branch), [telegramGroups, canManage, q, branch]);
  const branchName = (id?: string) => (id ? branches.find((b) => b.id === id)?.name ?? "" : "كل الشركة");
  const flash = (t: string) => {
    setMsg(t);
    window.setTimeout(() => setMsg(""), 4000);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      const input = { name: form.name, link: form.link, description: form.description, branchId: form.branchId || undefined };
      if (form.id) updateTelegramGroup(form.id, input);
      else addTelegramGroup(input);
      setForm(null);
      flash(form.id ? "اتحفظ التعديل." : "اتضاف الجروب.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الحفظ.");
    }
  };
  const copy = async (g: TelegramGroup) => {
    try {
      await navigator.clipboard.writeText(g.link);
      setCopied(g.id);
      window.setTimeout(() => setCopied(""), 2500);
    } catch {
      /* the link stays visible on the card */
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">كل جروبات الفريق في مكان واحد</span>
          <h1>جروبات التليجرام</h1>
          <p>اختار الجروب المناسب وادخله بضغطة. {canManage ? "تقدر تضيف جروب وتعدّله أو توقفه." : ""}</p>
        </div>
        {canManage && (
          <button
            className="btn-primary"
            onClick={() => {
              setError("");
              setForm(blank);
            }}
          >
            <Plus size={15} />
            جروب جديد
          </button>
        )}
      </div>
      {msg && (
        <p className="notice" role="status">
          {msg}
        </p>
      )}

      <section className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <div className="field-grid">
          <label className="field">
            <span>بحث</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم الجروب أو وصفه…" />
          </label>
          <label className="field">
            <span>الفرع</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">الكل</option>
              <option value="none">جروبات الشركة كلها</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {visible.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {visible.map((g) => (
            <article className="panel" key={g.id} style={{ padding: 18, opacity: g.active ? 1 : 0.6 }}>
              <div className="followup-heading">
                <h2 style={{ fontSize: 15, fontWeight: 600 }}>{g.name}</h2>
                {!g.active && <span className="status-pill">موقوف</span>}
              </div>
              {g.description && <p className="table-secondary" style={{ marginTop: 8 }}>{g.description}</p>}
              <p className="quiet-note" style={{ marginTop: 8 }}>
                {branchName(g.branchId)}
              </p>
              <div className="followup-actions">
                {g.active && (
                  <a className="btn-primary" href={g.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} />
                    افتح الجروب
                  </a>
                )}
                <button className="btn-secondary" onClick={() => copy(g)}>
                  <Copy size={14} />
                  {copied === g.id ? "اتنسخ" : "انسخ اللينك"}
                </button>
              </div>
              {canManage && (
                <div className="followup-actions" style={{ marginTop: 10 }}>
                  <button
                    className="btn-text"
                    onClick={() => {
                      setError("");
                      setForm({ id: g.id, name: g.name, link: g.link, description: g.description ?? "", branchId: g.branchId ?? "" });
                    }}
                  >
                    <Pencil size={13} />
                    تعديل
                  </button>
                  <button className="btn-text" onClick={() => setTelegramGroupActive(g.id, !g.active)}>
                    {g.active ? "إيقاف" : "تفعيل"}
                  </button>
                  {confirming === g.id ? (
                    <span className="confirm-inline" role="alert">
                      متأكد؟
                      <button className="btn-primary" onClick={() => (removeTelegramGroup(g.id), setConfirming(""))}>
                        احذف
                      </button>
                      <button className="btn-text" onClick={() => setConfirming("")}>
                        لأ
                      </button>
                    </span>
                  ) : (
                    <button className="btn-text" onClick={() => setConfirming(g.id)}>
                      <Trash2 size={13} />
                      حذف
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <div className="empty-state">
            <Send size={28} strokeWidth={1.3} />
            <h3>{telegramGroups.length ? "مفيش جروب بالشكل ده" : "لسه مفيش جروبات"}</h3>
            <p>{canManage ? "ضيف أول جروب من زرار «جروب جديد»." : "هتظهر هنا لما الإدارة تضيفها."}</p>
          </div>
        </section>
      )}

      {form && (
        <div className="dialog-backdrop">
          <div className="panel" ref={ref} role="dialog" aria-modal="true" aria-labelledby="tg-title" style={{ width: "min(480px,100%)", padding: 27 }}>
            <div className="page-heading">
              <h2 id="tg-title" style={{ fontSize: 20, fontWeight: 600 }}>
                {form.id ? "تعديل الجروب" : "جروب جديد"}
              </h2>
              <button className="icon-button" onClick={() => setForm(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit}>
              <label className="field">
                <span>
                  اسم الجروب <em>مطلوب</em>
                </span>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="field">
                <span>
                  لينك التليجرام <em>مطلوب</em>
                </span>
                <input required dir="ltr" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://t.me/+xxxxxxxx" />
                {form.link.trim() !== "" && !normalizeTelegramLink(form.link) && <small className="table-secondary">لازم لينك تليجرام (t.me/…)</small>}
              </label>
              <label className="field">
                <span>
                  وصف <em className="optional-tag">اختياري</em>
                </span>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="الجروب ده لإيه؟" />
              </label>
              <label className="field">
                <span>
                  الفرع <em className="optional-tag">اختياري</em>
                </span>
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                  <option value="">كل الشركة</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              {error && (
                <p className="notice warning" role="alert">
                  {error}
                </p>
              )}
              <button className="btn-primary" type="submit" style={{ marginTop: 14 }}>
                حفظ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
