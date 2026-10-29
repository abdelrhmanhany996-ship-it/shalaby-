import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { aiStatus, runZaki, type ChatTurn } from "../../lib/aiClient";
import { runTool, toolLabels, type ToolData } from "../../lib/zakiTools";
import { zakiGuide, zakiToolsFor } from "../../lib/zakiGuide";
import { hasPermission, isSalesCapable } from "../../lib/permissions";
import { canAccessPage } from "../../lib/access";
import { today } from "../../lib/presentation";
import { VoiceNoteField } from "../common/VoiceNoteField";
import { ZakiAvatar, type ZakiMood } from "./ZakiAvatar";
import { onOpenShalaby } from "./shalabyEvents";

const examples = [
  "مين الموظفين اللي متأخرين عن التارجت؟",
  "مين عنده متابعات متأخرة النهارده؟",
  "إيه أهم المتابعات اللي محتاجة تدخل النهارده؟",
  "مين أقرب موظف لتحقيق التارجت؟",
  "لخصلي حالة العملاء اللي محتاجين متابعة.",
  "What should I focus on today?",
];

const thinkingLines = ["بدوّر في الملفات…", "بحسبها لحظة…", "بجمّع الأرقام…", "قربت أخلّص…"];

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Types an example, pauses, erases it, then moves on to the next one. */
function useTypedExamples(active: boolean) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!active) return setText("");
    if (reduced()) return setText(examples[0]);
    let i = 0;
    let n = 0;
    let erasing = false;
    let timer: number;
    const tick = () => {
      const full = examples[i];
      if (!erasing) {
        n++;
        setText(full.slice(0, n));
        if (n >= full.length) {
          erasing = true;
          timer = window.setTimeout(tick, 1700);
          return;
        }
        timer = window.setTimeout(tick, 55 + Math.random() * 45);
      } else {
        n -= 2;
        setText(full.slice(0, Math.max(n, 0)));
        if (n <= 0) {
          erasing = false;
          n = 0;
          i = (i + 1) % examples.length;
          timer = window.setTimeout(tick, 450);
          return;
        }
        timer = window.setTimeout(tick, 22);
      }
    };
    timer = window.setTimeout(tick, 600);
    return () => window.clearTimeout(timer);
  }, [active]);
  return text;
}

/** Reveals a finished answer gradually, word by word. */
function useReveal(full: string, animate: boolean) {
  const [shown, setShown] = useState(animate ? "" : full);
  useEffect(() => {
    if (!animate || reduced()) return setShown(full);
    const words = full.split(/(\s+)/);
    let k = 0;
    const id = window.setInterval(() => {
      k += 2;
      setShown(words.slice(0, k).join(""));
      if (k >= words.length) window.clearInterval(id);
    }, 28);
    return () => window.clearInterval(id);
  }, [full, animate]);
  return shown;
}

function BotAnswer({ text, fresh }: { text: string; fresh: boolean }) {
  const shown = useReveal(text, fresh);
  return <Rich text={shown} />;
}


function Rich({ text }: { text: string }) {
  const inline = (t: string) =>
    t.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
    );
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`l${out.length}`}>
          {list.map((l, i) => (
            <li key={i}>{inline(l)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*[-•*]\s+(.*)$/);
    if (m) list.push(m[1]);
    else {
      flush();
      if (line.trim()) out.push(<p key={`p${out.length}`}>{inline(line)}</p>);
    }
  }
  flush();
  return <>{out}</>;
}

/** Zaki: a floating assistant that answers questions about the data the user can see. */
export function ZakiChat() {
  const { currentUser, effectiveUser, leads, bookings, followUps, visits, notBoughtRecords, brokers, users, branches, reviewRequests, reviewNotes, employeeTargets, targetSettings, accountEntries, accountingSettings, targetUsers } = useCRM();
  const canTargets = hasPermission(effectiveUser, "targets.view") || isSalesCapable(effectiveUser);
  // The accounts screen was taken out of the simplified CRM, so its tool is not offered either.
  const canAccounts = hasPermission(effectiveUser, "accounts.view") && canAccessPage(effectiveUser, "accounts");
  // Always the latest data: the ref is refreshed on every render, and Firestore keeps the state live.
  const dataRef = useRef<ToolData | null>(null);
  dataRef.current = {
    today: today(), leads, bookings, followUps, visits, notBoughtRecords, brokers, users, branches, reviewRequests, reviewNotes,
    ...(canTargets ? { employeeTargets, targetSettings, targetUsers } : {}),
    ...(canAccounts ? { accounting: { entries: accountEntries, settings: accountingSettings } } : {}),
  };
  const [steps, setSteps] = useState<string[]>([]);
  // "off" = the server has no Claude key yet: the assistant still opens and says exactly what is missing.
  const [available, setAvailable] = useState<"checking" | "on" | "off">("checking");
  const [speaking, setSpeaking] = useState(false);
  const sendRef = useRef<(q: string) => void>(() => {});
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [greet, setGreet] = useState(false);
  const [mood, setMood] = useState<ZakiMood>("idle");
  const [line, setLine] = useState(0);
  const [slow, setSlow] = useState(false);
  const [freshIdx, setFreshIdx] = useState(-1);
  const end = useRef<HTMLDivElement>(null);
  const typed = useTypedExamples(open && turns.length === 0 && !busy);
  const titles = new Set(["م", "م.", "eng", "eng.", "dr", "dr.", "د", "د.", "أ", "أ.", "المهندس", "الدكتور", "الحاج", "الأستاذ"]);
  const first = currentUser.name.split(" ").find((w) => !titles.has(w.toLowerCase())) ?? currentUser.name;

  useEffect(() => {
    aiStatus().then((s) => setAvailable(s === "server" ? "on" : "off"));
  }, []);
  // A quick hello after the page settles, once per session.
  useEffect(() => {
    if (available !== "on") return;
    let seen = false;
    try {
      seen = sessionStorage.getItem("zaki-greeted") === "1";
    } catch {
      /* storage unavailable */
    }
    if (seen) return;
    const a = window.setTimeout(() => {
      setGreet(true);
      setMood("wave");
      try {
        sessionStorage.setItem("zaki-greeted", "1");
      } catch {
        /* ignore */
      }
    }, 2500);
    const b = window.setTimeout(() => {
      setGreet(false);
      setMood("idle");
    }, 9000);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [available]);
  // Rotate the status line while thinking.
  useEffect(() => {
    if (!busy) return;
    setLine(0);
    setSlow(false);
    const slowId = window.setTimeout(() => setSlow(true), 9000);
    const id = window.setInterval(() => setLine((l) => (l + 1) % thinkingLines.length), 1800);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(slowId);
    };
  }, [busy]);
  // Doze off after a while without use.
  useEffect(() => {
    if (open || busy || greet) return;
    setMood("idle");
    const id = window.setTimeout(() => setMood("sleepy"), 90000);
    return () => window.clearTimeout(id);
  }, [open, busy, greet]);
  // Other screens can open the chat, optionally with a question ready.
  useEffect(
    () =>
      onOpenShalaby((question) => {
        setGreet(false);
        setOpen(true);
        if (question) window.setTimeout(() => sendRef.current(question), 50);
      }),
    [],
  );
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy, open]);

  const openChat = () => {
    setGreet(false);
    setOpen(true);
    // the welcome wave, then back to listening
    setMood("wave");
    window.setTimeout(() => setMood((m) => (m === "wave" ? "idle" : m)), 2600);
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy || available !== "on") return;
    setInput("");
    const history = turns;
    setTurns((t) => [...t, { role: "user", text: q }]);
    setBusy(true);
    setMood("thinking");
    setSteps([]);
    try {
      const { answer, used } = await runZaki({
        question: q,
        history,
        tools: zakiToolsFor({ targets: canTargets, accounts: canAccounts }),
        guide: zakiGuide,
        today: today(),
        viewer: currentUser.name,
        execute: (name, args) => runTool(name, args, dataRef.current!),
        onStep: (name) => setSteps((s) => [...s, toolLabels[name] ?? name]),
      });
      setTurns((t) => {
        setFreshIdx(t.length + 1);
        return [...t, { role: "assistant", text: answer, used: [...new Set(used.map((u) => toolLabels[u] ?? u))] }];
      });
      setSpeaking(true);
      setMood("talking");
      // roughly how long the answer takes to appear on screen
      window.setTimeout(() => {
        setSpeaking(false);
        setMood("happy");
        window.setTimeout(() => setMood((m) => (m === "happy" ? "idle" : m)), 2200);
      }, Math.min(9000, 600 + answer.split(/\s+/).length * 16));
    } catch (e) {
      setMood("sorry");
      window.setTimeout(() => setMood("idle"), 4000);
      const code = e instanceof Error ? e.message.slice(0, 160) : "";
      setTurns((t) => [
        ...t,
        { role: "assistant", text: `حصلت مشكلة وأنا بجهّز الرد. جرّب تسألني تاني بعد شوية.${code ? `\n(${code})` : ""}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  sendRef.current = send;
  return (
    <>
      {!open && (
        <div className="zaki-fab-wrap">
          {greet && (
            <div className="zaki-bubble" role="status">
              أهلًا {first}! أنا شلبي، اسألني عن أي حاجة في النظام 👋
            </div>
          )}
          <button
            className={`zaki-fab ${mood === "sleepy" ? "is-sleepy" : ""}`}
            onClick={openChat}
            aria-label="افتح شلبي، المساعد الذكي"
          >
            <ZakiAvatar mood={mood} size={96} />
            <span className="zaki-fab-label">شلبي</span>
          </button>
        </div>
      )}
      {open && (
        <div className="zaki-panel" role="dialog" aria-label="شلبي، المساعد الذكي">
          <div className="zaki-head">
            <ZakiAvatar mood={busy ? "thinking" : speaking ? "talking" : mood} size={168} className="zaki-head-art" />
            <div>
              <strong>شلبي</strong>
              <small>
                <i className="zaki-online" style={available === "on" ? undefined : { background: "var(--wait)" }} />
                {available === "on" ? (busy ? "بيفكّر…" : speaking ? "بيرد…" : "متاح · بيجاوب من بيانات نظامك") : available === "checking" ? "بيتأكد من الاتصال…" : "محتاج إعداد على السيرفر"}
              </small>
            </div>
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>
          <div className="zaki-body">
            {available === "off" && (
              <div className="zaki-setup" role="status">
                <p>
                  <strong>أهلًا! أنا شلبي.</strong> لسه مش متوصّل بالذكاء الاصطناعي على السيرفر، فمش هقدر أجاوب دلوقتي.
                </p>
                <p className="table-secondary">
                  المطلوب مرة واحدة: إضافة مفتاح Claude (<code>claude_key</code>) في ملف <code>crm-ai-secrets.php</code> خارج <code>public_html</code> على السيرفر. التفاصيل في <code>docs/ai-setup.md</code>.
                </p>
              </div>
            )}
            {available === "on" && turns.length === 0 && !busy && (
              <>
                <div className="zaki-demo" aria-hidden="true">
                  <small>اسألني بالمصري أو بالإنجليزي، مثلًا:</small>
                  <div className="zaki-demo-line">
                    <span>{typed}</span>
                    <i className="zaki-caret" />
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 12px 12px" }}>
                  {examples.slice(0, 4).map((q) => (
                    <button key={q} className="btn-secondary" style={{ fontSize: 12, minHeight: 32, padding: "4px 10px" }} onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
            {turns.map((t, i) => (
              <div key={i} className={`zaki-msg ${t.role === "user" ? "me" : "bot"}`}>
                {t.role === "user" ? <p>{t.text}</p> : <BotAnswer text={t.text} fresh={i === freshIdx} />}
                {t.used && t.used.length > 0 && <small className="zaki-used">بص على: {t.used.join("، ")}</small>}
              </div>
            ))}
            {busy && (
              <div className="zaki-msg bot zaki-thinking" aria-live="polite">
                <span className="zaki-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span key={steps.length ? steps.length : `l${line}`} className="zaki-status">
                  {steps.length ? `${steps[steps.length - 1]}…` : thinkingLines[line]}
                </span>
              </div>
            )}
            <div ref={end} />
          </div>
          <div className="zaki-foot">
            <VoiceNoteField
              value={input}
              onChange={setInput}
              rows={1}
              hideImprove
              placeholder="اكتب سؤالك أو اضغط تكلّم…"
              onSubmit={() => send(input)}
            />
            <button className="btn-primary zaki-send" onClick={() => send(input)} disabled={busy || !input.trim() || available !== "on"} aria-label="إرسال">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
