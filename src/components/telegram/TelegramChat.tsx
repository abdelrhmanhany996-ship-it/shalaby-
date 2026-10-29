import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, ExternalLink, Send, FileText, Mic, MapPin, Image as ImageIcon, Video } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { mergeMessages, sendTelegram, telegramFile, telegramMessages, type TgMessage } from "../../lib/telegramClient";
import type { TelegramGroup } from "../../types/crm";

const POLL_MS = 3000;
const NAME_COLORS = ["#d94f4f", "#2f8f5b", "#3b6fd4", "#b5651d", "#8a4fd1", "#1f8a99", "#c2417e"];
const colorOf = (key: string) => NAME_COLORS[([...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0) % NAME_COLORS.length];
const dayKey = (ts: number) => new Date(ts * 1000).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Cairo" });
const timeOf = (ts: number) => new Date(ts * 1000).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Cairo" });

/** Loads a photo or file from the chat once and keeps it for the session. */
const fileCache = new Map<string, Promise<string>>();
function useChatFile(groupId: string, fileId: string | null, auto: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [wanted, setWanted] = useState(auto);
  useEffect(() => {
    if (!fileId || !wanted) return;
    const key = `${groupId}:${fileId}`;
    if (!fileCache.has(key)) fileCache.set(key, telegramFile(groupId, fileId));
    let live = true;
    fileCache.get(key)!.then(
      (u) => live && setUrl(u),
      () => {
        fileCache.delete(key);
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [groupId, fileId, wanted]);
  return { url, failed, load: () => setWanted(true) };
}

function Attachment({ groupId, m }: { groupId: string; m: TgMessage }) {
  const auto = m.kind === "photo";
  const { url, failed, load } = useChatFile(groupId, m.fileId, auto);
  if (m.kind === "photo")
    return url ? (
      <a href={url} target="_blank" rel="noreferrer">
        <img className="tg-photo" src={url} alt={m.text || "صورة"} />
      </a>
    ) : (
      <span className="tg-file">
        <ImageIcon size={15} /> {failed ? "الصورة مش متاحة" : "بتحمّل الصورة…"}
      </span>
    );
  if (m.kind === "voice")
    return url ? (
      <audio controls src={url} style={{ maxWidth: "100%" }} />
    ) : (
      <button type="button" className="tg-file" onClick={load}>
        <Mic size={15} /> {failed ? "التسجيل مش متاح" : "شغّل التسجيل"}
      </button>
    );
  if (m.kind === "document")
    return url ? (
      <a className="tg-file" href={url} download={m.fileName || "file"}>
        <FileText size={15} /> احفظ {m.fileName}
      </a>
    ) : (
      <button type="button" className="tg-file" onClick={load}>
        <FileText size={15} /> {failed ? "الملف مش متاح" : m.fileName || "ملف"}
      </button>
    );
  if (m.kind === "video")
    return (
      <span className="tg-file">
        <Video size={15} /> فيديو (افتحه في تليجرام)
      </span>
    );
  if (m.kind === "location" && m.text)
    return (
      <a className="tg-file" href={`https://maps.google.com/?q=${encodeURIComponent(m.text)}`} target="_blank" rel="noreferrer">
        <MapPin size={15} /> موقع على الخريطة
      </a>
    );
  return null;
}

interface Props {
  group: TelegramGroup;
  onBack: () => void;
}

/** The group's Telegram chat inside the CRM: read live and reply through the bot. */
export function TelegramChat({ group, onBack }: Props) {
  const { effectiveUser } = useCRM();
  const [messages, setMessages] = useState<TgMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const rev = useRef(0);
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    let live = true;
    let timer = 0;
    rev.current = 0;
    setMessages([]);
    setLoading(true);
    setError("");
    const tick = async () => {
      if (!live) return;
      if (document.visibilityState === "visible") {
        try {
          const page = await telegramMessages(group.id, rev.current);
          if (!live) return;
          rev.current = Math.max(rev.current, page.rev);
          setMessages((prev) => mergeMessages(prev, page.messages));
          setError("");
        } catch (e) {
          if (live) setError(e instanceof Error ? e.message : "تعذر تحميل الرسائل.");
        } finally {
          if (live) setLoading(false);
        }
      }
      timer = window.setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [group.id]);

  // The chat's composer sits where Shalaby's floating button is, so the button steps aside while a chat is open.
  useEffect(() => {
    document.body.classList.add("tg-chat-open");
    return () => document.body.classList.remove("tg-chat-open");
  }, []);

  // Stay at the bottom while the person is reading the latest messages.
  useLayoutEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await sendTelegram(group.id, t);
      setText("");
      stick.current = true;
      const page = await telegramMessages(group.id, rev.current);
      rev.current = Math.max(rev.current, page.rev);
      setMessages((prev) => mergeMessages(prev, page.messages));
    } catch (e) {
      setError(e instanceof Error ? e.message : "الرسالة ماتبعتتش.");
    } finally {
      setSending(false);
    }
  };

  let lastDay = "";
  return (
    <section className="panel tg-chat" aria-label={`شات ${group.name}`}>
      <header className="tg-chat-head">
        <button className="icon-button" onClick={onBack} aria-label="رجوع للجروبات">
          <ArrowRight size={18} />
        </button>
        <div className="tg-avatar" style={{ background: colorOf(group.id) }} aria-hidden>
          {group.name.trim().charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{group.name}</strong>
          <span className="table-secondary">{error ? error : loading ? "بيحمّل…" : `${messages.length} رسالة · بيتحدّث تلقائي`}</span>
        </div>
        {group.link && (
          <a className="btn-secondary" href={group.link} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} />
            تليجرام
          </a>
        )}
      </header>

      <div
        className="tg-messages"
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {!loading && !messages.length && !error && <p className="tg-empty">لسه مفيش رسائل. أي رسالة تتكتب في الجروب هتظهر هنا.</p>}
        {messages.map((m) => {
          const day = dayKey(m.date);
          const sep = day !== lastDay;
          lastDay = day;
          const mine = m.sentBy === effectiveUser.id;
          return (
            <div key={m.id}>
              {sep && <div className="tg-day">{day}</div>}
              {m.kind === "service" ? (
                <div className="tg-service">{m.text}</div>
              ) : (
                <div className={`tg-bubble ${mine ? "is-mine" : ""}`}>
                  {!mine && (
                    <span className="tg-name" style={{ color: colorOf(m.fromId || m.fromName) }}>
                      {m.fromName}
                      {m.sentBy && " · من السيستم"}
                    </span>
                  )}
                  <Attachment groupId={group.id} m={m} />
                  {m.text && m.kind !== "location" && <p dir="auto">{m.text}</p>}
                  <span className="tg-time">
                    {m.edited && "اتعدلت · "}
                    {timeOf(m.date)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form
        className="tg-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          rows={1}
          value={text}
          maxLength={3500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="اكتب رسالة للجروب…"
          aria-label="رسالة للجروب"
        />
        <button className="btn-primary" type="submit" disabled={!text.trim() || sending} aria-label="إرسال">
          <Send size={16} />
        </button>
      </form>
      <p className="tg-note">الرسائل اللي بتبعتها من هنا بتوصل الجروب من بوت السيستم وعليها اسمك.</p>
    </section>
  );
}
