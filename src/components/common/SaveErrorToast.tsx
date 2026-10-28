import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { ActionDenied } from "../../lib/actionDenied";

/** Shows a clear message when the server refused to save something, instead of the change silently vanishing. */
export function SaveErrorToast() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let timer: number;
    const onFail = (e: Event) => {
      const code = (e as CustomEvent<{ code?: string }>).detail?.code || "";
      setMessage(
        code.includes("permission")
          ? "التعديل ما اتحفظش: مش مسموح لدورك أو خارج نطاق فرعك. راجع مديرك لو محتاج الصلاحية."
          : code.includes("unavailable") || code.includes("network")
            ? "مفيش اتصال بالسيرفر دلوقتي. هنحاول نحفظ أول ما النت يرجع."
            : "حصلت مشكلة وإحنا بنحفظ آخر تعديل. جرّب تاني.",
      );
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(""), 9000);
    };
    // A refused action that no screen caught: say why, instead of doing nothing.
    const show = (text: string) => {
      setMessage(text);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(""), 9000);
    };
    const onError = (e: ErrorEvent) => {
      if (e.error instanceof ActionDenied) {
        e.preventDefault();
        show(e.error.message);
      }
    };
    const onReject = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof ActionDenied) {
        e.preventDefault();
        show(e.reason.message);
      }
    };
    window.addEventListener("crm-save-failed", onFail);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("crm-save-failed", onFail);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
      window.clearTimeout(timer);
    };
  }, []);
  if (!message) return null;
  return (
    <div className="save-toast" role="alert">
      <AlertTriangle size={18} />
      <span>{message}</span>
      <button className="icon-button" onClick={() => setMessage("")} aria-label="إغلاق">
        <X size={16} />
      </button>
    </div>
  );
}
