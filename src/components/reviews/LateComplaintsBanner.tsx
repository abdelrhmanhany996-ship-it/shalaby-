import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { COMPLAINT_ESCALATION_HOURS, isLateComplaint } from "../../lib/reviews";

const key = (userId: string) => `crm_late_complaints_seen_${userId}`;

/** Escalation: complaints left with no follow-up for a day are raised on every screen of the managers who own them. */
export function LateComplaintsBanner({ onOpen }: { onOpen: () => void }) {
  const { reviewRequests, reviewNotes, effectiveUser } = useCRM();
  const [now, setNow] = useState(() => Date.now());
  const [seen, setSeen] = useState(0);
  const handles = ["admin", "general_manager", "regional_manager", "branch_manager"].includes(effectiveUser.role);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10 * 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    try {
      setSeen(Number(sessionStorage.getItem(key(effectiveUser.id)) || 0));
    } catch {
      setSeen(0);
    }
  }, [effectiveUser.id]);

  if (!handles) return null;
  const late = reviewRequests.filter((r) => isLateComplaint(r, reviewNotes, now)).length;
  // Hidden once dismissed, until a new complaint becomes late.
  if (!late || late <= seen) return null;

  const dismiss = () => {
    setSeen(late);
    try {
      sessionStorage.setItem(key(effectiveUser.id), String(late));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="notice warning" role="alert" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <AlertTriangle size={18} />
      <span style={{ flex: 1, minWidth: 200 }}>
        <strong>{late === 1 ? "شكوى" : `${late} شكاوى`}</strong> من العملاء عدّى عليها أكتر من {COMPLAINT_ESCALATION_HOURS} ساعة من غير أي متابعة.
      </span>
      <button onClick={onOpen}>افتح الشكاوى</button>
      <button onClick={dismiss}>بعدين</button>
    </div>
  );
}
