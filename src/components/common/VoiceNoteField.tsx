import { useEffect, useRef, useState } from "react";
import { Mic, Square, Sparkles, Loader2, Undo2 } from "lucide-react";
import { aiStatus, refineText, transcribeAudio } from "../../lib/aiClient";

interface Props {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  /** Reasons offered to the AI so it can suggest one from the note. */
  reasons?: { id: string; label: string }[];
  onSuggestReason?: (id: string) => void;
  /** Enter (without Shift) calls this, e.g. to send a chat message. */
  onSubmit?: () => void;
  hideImprove?: boolean;
  onFocusChange?: (focused: boolean) => void;
}

const MAX_SECONDS = 90;

/**
 * A textarea the salesperson can type in or dictate into. Speech goes to the
 * server-side Egyptian-Arabic transcription when it is configured, otherwise
 * to the browser's own dictation. "Improve" asks the AI to tidy the note.
 */
export function VoiceNoteField({
  value,
  onChange,
  rows = 2,
  placeholder,
  required,
  reasons,
  onSuggestReason,
  onSubmit,
  hideImprove,
  onFocusChange,
}: Props) {
  const [mode, setMode] = useState<"idle" | "recording" | "working">("idle");
  const [seconds, setSeconds] = useState(0);
  const [msg, setMsg] = useState("");
  const [server, setServer] = useState(false);
  const [before, setBefore] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const speech = useRef<any>(null);
  const timer = useRef<number | null>(null);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    aiStatus().then((s) => setServer(s === "server"));
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    try {
      speech.current?.stop();
    } catch {
      /* ignore */
    }
  };
  const startTimer = () => {
    setSeconds(0);
    timer.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stop();
        return s + 1;
      });
    }, 1000);
  };
  const append = (text: string) => {
    const t = text.trim();
    if (!t) return;
    onChange(latest.current ? `${latest.current.trim()} ${t}` : t);
  };

  const start = async () => {
    setMsg("");
    setBefore(null);
    if (server) {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setMsg("المتصفح لا يدعم التسجيل الصوتي. اكتب الملاحظة.");
        return;
      }
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setMsg("لازم تسمح للموقع باستخدام الميكروفون.");
        return;
      }
      chunks.current = [];
      const rec = new MediaRecorder(stream.current);
      recorder.current = rec;
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        cleanup();
        if (blob.size < 1000) {
          setMode("idle");
          setMsg("التسجيل قصير جدًا، حاول تاني.");
          return;
        }
        setMode("working");
        try {
          append(await transcribeAudio(blob));
        } catch (e) {
          setMsg("تعذر تحويل الصوت لنص. اكتب الملاحظة أو حاول تاني.");
        } finally {
          setMode("idle");
        }
      };
      rec.start();
      setMode("recording");
      startTimer();
      return;
    }
    // Fallback: the browser's built-in dictation (Egyptian Arabic).
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMsg("المتصفح لا يدعم الإملاء الصوتي. اكتب الملاحظة.");
      return;
    }
    const sr = new SR();
    sr.lang = "ar-EG";
    sr.continuous = true;
    sr.interimResults = false;
    sr.onresult = (ev: any) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) append(ev.results[i][0].transcript);
      }
    };
    sr.onerror = () => setMsg("تعذر الإملاء الصوتي. اكتب الملاحظة.");
    sr.onend = () => {
      cleanup();
      setMode("idle");
    };
    speech.current = sr;
    try {
      sr.start();
      setMode("recording");
      startTimer();
    } catch {
      setMsg("تعذر تشغيل الميكروفون.");
    }
  };

  function stop() {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    else {
      cleanup();
      setMode("idle");
    }
  }

  const improve = async () => {
    setMsg("");
    setMode("working");
    try {
      const out = await refineText(value, reasons);
      setBefore(value);
      onChange(out.text);
      if (out.reasonId && onSuggestReason) onSuggestReason(out.reasonId);
    } catch {
      setMsg("تعذر تحسين النص حاليًا.");
    } finally {
      setMode("idle");
    }
  };

  return (
    <div className="voice-field">
      <textarea
        rows={rows}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        onKeyDown={(e) => {
          if (onSubmit && e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="voice-actions">
        {mode === "recording" ? (
          <button type="button" className="voice-btn is-recording" onClick={stop}>
            <Square size={14} /> إيقاف · {seconds}ث
          </button>
        ) : (
          <button
            type="button"
            className="voice-btn"
            onClick={start}
            disabled={mode === "working"}
            title="تكلّم بالعامية وهيتحول لنص"
          >
            <Mic size={14} /> تكلّم
          </button>
        )}
        {server && !hideImprove && value.trim().length > 3 && mode !== "recording" && (
          <button type="button" className="voice-btn" onClick={improve} disabled={mode === "working"}>
            <Sparkles size={14} /> حسّن النص
          </button>
        )}
        {before !== null && mode !== "working" && (
          <button
            type="button"
            className="voice-btn"
            onClick={() => {
              onChange(before);
              setBefore(null);
            }}
          >
            <Undo2 size={14} /> رجوع للأصلي
          </button>
        )}
        {mode === "working" && (
          <span className="voice-status">
            <Loader2 size={14} className="spin" /> جاري المعالجة…
          </span>
        )}
        {msg && <span className="voice-status is-error">{msg}</span>}
      </div>
    </div>
  );
}
