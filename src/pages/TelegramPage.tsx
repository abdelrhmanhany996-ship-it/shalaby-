import { useEffect, useMemo, useState } from "react";
import { Send, Plus, X, Copy, ExternalLink, Pencil, Trash2, MessagesSquare, Bot, Link2 } from "lucide-react";
import { TelegramChat } from "../components/telegram/TelegramChat";
import { setupTelegram, telegramChats, telegramConfigured, telegramStatus, type TgChat, type TgStatus } from "../lib/telegramClient";
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
  chatId: string;
}
const blank: Form = { name: "", link: "", description: "", branchId: "", chatId: "" };

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
  const isTop = ["admin", "general_manager"].includes(effectiveUser.role);
  const [chatOpen, setChatOpen] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [status, setStatus] = useState<TgStatus | null>(null);
  const [chats, setChats] = useState<TgChat[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState("");

  const refreshBot = async () => {
    const ok = await telegramConfigured();
    setConfigured(ok);
    if (!ok) return;
    if (isTop) telegramStatus().then(setStatus, () => setStatus(null));
    if (canManage) telegramChats().then(setChats, () => setChats([]));
  };
  useEffect(() => {
    void refreshBot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const linkedIds = new Set(telegramGroups.map((g) => g.chatId).filter(Boolean));
  const unlinked = chats.filter((c) => c.member && !linkedIds.has(c.chatId));
  const connectBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupBusy(true);
    setSetupError("");
    try {
      setStatus(await setupTelegram(botToken.trim()));
      setBotToken("");
      await refreshBot();
      flash("البوت اتربط. ضيفه للجروبات وابعت أي رسالة عشان يظهر الجروب هنا.");
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "تعذر الربط.");
    } finally {
      setSetupBusy(false);
    }
  };
  const addFromChat = (c: TgChat) => {
    try {
      addTelegramGroup({ name: c.title || "جروب تليجرام", link: "", chatId: c.chatId, chatTitle: c.title });
      flash(`اتضاف «${c.title}» واتربط بالشات.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "تعذر الإضافة.");
    }
  };
  const openGroup = telegramGroups.find((g) => g.id === chatOpen && !!g.chatId);

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
      const chat = chats.find((c) => c.chatId === form.chatId);
      const input = { name: form.name, link: form.link, description: form.description, branchId: form.branchId || undefined, chatId: form.chatId || null, chatTitle: chat?.title };
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

  if (openGroup) return <TelegramChat group={openGroup} onBack={() => setChatOpen("")} />;

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">كل جروبات الفريق في مكان واحد</span>
          <h1>جروبات التليجرام</h1>
          <p>اضغط على الجروب يفتح الشات هنا جوه السيستم. {canManage ? "تقدر تضيف جروب وتعدّله أو توقفه." : ""}</p>
        </div>
        {isTop && (
          <button className="btn-secondary" onClick={() => setShowSetup(!showSetup)} aria-expanded={showSetup}>
            <Bot size={15} />
            إعداد البوت
          </button>
        )}
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

      {isTop && (showSetup || configured === false) && (
        <section className="panel" style={{ padding: 18, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            <Bot size={16} style={{ verticalAlign: "middle", marginInlineEnd: 6 }} />
            ربط بوت التليجرام
          </h2>
          {status ? (
            <p className="table-secondary">
              البوت: <bdi>@{status.bot.username}</bdi> · {status.webhook.connected ? "متوصل ✓" : "مش متوصل"}
              {status.webhook.lastError ? ` · آخر خطأ: ${status.webhook.lastError}` : ""}
            </p>
          ) : (
            <p className="table-secondary">{configured ? "بيحمّل الحالة…" : "لسه مفيش بوت مربوط."}</p>
          )}
          {status && !status.bot.readsAllMessages && (
            <p className="notice warning">البوت مش هيشوف رسائل الجروب. من BotFather ابعت ‎/setprivacy واختار البوت ثم Disable، أو خلّي البوت أدمن في الجروب.</p>
          )}
          <ol className="table-secondary" style={{ paddingInlineStart: 18, margin: "8px 0", lineHeight: 1.9 }}>
            <li>من تليجرام افتح <bdi>@BotFather</bdi> وابعت ‎/newbot وخد التوكن.</li>
            <li>ابعت ‎/setprivacy واختار البوت ثم Disable (عشان يقرأ كل رسائل الجروب).</li>
            <li>حط التوكن هنا واضغط «ربط البوت».</li>
            <li>ضيف البوت لكل جروب، وابعت أي رسالة؛ الجروب هيظهر تحت عشان تربطه.</li>
          </ol>
          <form onSubmit={connectBot} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label className="field" style={{ flex: "1 1 280px", margin: 0 }}>
              <span>توكن البوت</span>
              <input dir="ltr" autoComplete="off" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder={configured ? "سيبه فاضي لإعادة الربط بنفس البوت" : "123456789:AA…"} />
            </label>
            <button className="btn-primary" type="submit" disabled={setupBusy || (!botToken.trim() && !configured)}>
              {setupBusy ? "بيربط…" : "ربط البوت"}
            </button>
          </form>
          {setupError && (
            <p className="notice warning" role="alert">
              {setupError}
            </p>
          )}
          <p className="quiet-note" style={{ marginTop: 8 }}>التوكن بيتحفظ على السيرفر بس ومش بيظهر لحد.</p>
        </section>
      )}

      {canManage && unlinked.length > 0 && (
        <section className="panel" style={{ padding: 18, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            <Link2 size={16} style={{ verticalAlign: "middle", marginInlineEnd: 6 }} />
            جروبات البوت موجود فيها ومش مربوطة
          </h2>
          {unlinked.map((c) => (
            <div className="task-row" key={c.chatId}>
              <MessagesSquare size={16} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{c.title || "جروب"}</strong>
                <p className="table-secondary" style={{ margin: 0 }}>
                  {c.count} رسالة{c.lastText ? ` · ${c.lastText}` : ""}
                </p>
              </div>
              <button className="btn-secondary" onClick={() => addFromChat(c)}>
                <Plus size={14} />
                ضيفه
              </button>
            </div>
          ))}
        </section>
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
                {g.chatId && (g.active || canManage) && (
                  <button className="btn-primary" onClick={() => setChatOpen(g.id)}>
                    <MessagesSquare size={14} />
                    افتح الشات
                  </button>
                )}
                {g.active && g.link && (
                  <a className={g.chatId ? "btn-secondary" : "btn-primary"} href={g.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} />
                    {g.chatId ? "تليجرام" : "افتح الجروب"}
                  </a>
                )}
                {g.link && (
                  <button className="btn-secondary" onClick={() => copy(g)}>
                    <Copy size={14} />
                    {copied === g.id ? "اتنسخ" : "انسخ اللينك"}
                  </button>
                )}
              </div>
              {!g.chatId && canManage && configured && <p className="quiet-note">الشات مش مربوط: عدّل الجروب واختار الشات بتاعه.</p>}
              {canManage && (
                <div className="followup-actions" style={{ marginTop: 10 }}>
                  <button
                    className="btn-text"
                    onClick={() => {
                      setError("");
                      setForm({ id: g.id, name: g.name, link: g.link, description: g.description ?? "", branchId: g.branchId ?? "", chatId: g.chatId ?? "" });
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
                  لينك التليجرام {form.chatId ? <em className="optional-tag">اختياري</em> : <em>مطلوب</em>}
                </span>
                <input required={!form.chatId} dir="ltr" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://t.me/+xxxxxxxx" />
                {form.link.trim() !== "" && !normalizeTelegramLink(form.link) && <small className="table-secondary">لازم لينك تليجرام (t.me/…)</small>}
              </label>
              {configured && (
                <label className="field">
                  <span>
                    شات التليجرام (عن طريق البوت) <em className="optional-tag">اختياري</em>
                  </span>
                  <select value={form.chatId} onChange={(e) => setForm({ ...form, chatId: e.target.value })}>
                    <option value="">مش مربوط</option>
                    {chats
                      .filter((c) => c.chatId === form.chatId || !linkedIds.has(c.chatId))
                      .map((c) => (
                        <option key={c.chatId} value={c.chatId}>
                          {c.title || c.chatId}
                        </option>
                      ))}
                    {form.chatId && !chats.some((c) => c.chatId === form.chatId) && <option value={form.chatId}>الشات الحالي</option>}
                  </select>
                </label>
              )}
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
