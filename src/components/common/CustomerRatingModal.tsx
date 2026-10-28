import { useEffect, useMemo, useState } from "react";
import { X, Copy, MessageCircle, Check } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { canRequestReview } from "../../lib/access";
import type { Lead, ReviewRequest } from "../../types/crm";
import { requestMessage, reviewLink, whatsappUrl } from "../../lib/reviews";
import { useDialog } from "./useDialog";

interface Props {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  /** Right after a visit or a new customer: skip the choice and ask about exactly that. */
  subject?: { kind: "visit" | "booking" | "general"; id?: string; label: string };
}

/** Ask a customer to rate one visit or booking: a unique link goes out on WhatsApp and the request is logged. */
export function CustomerRatingModal({ lead, isOpen, onClose, subject }: Props) {
  const { effectiveUser, visits, bookings, reviewRequests, requestReview } = useCRM();
  const ref = useDialog(isOpen, onClose);
  const [choice, setChoice] = useState("general");
  const [sent, setSent] = useState<ReviewRequest | null>(null);
  const [copied, setCopied] = useState(false);

  const options = useMemo(() => {
    if (!lead) return [];
    const v = visits
      .filter((x) => x.linkedLeadId === lead.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((x) => ({ key: `visit:${x.id}`, kind: "visit" as const, id: x.id, label: `زيارة ${x.branchName || "الفرع"} يوم ${x.date}` }));
    const b = bookings
      .filter((x) => x.leadId === lead.id)
      .sort((a, c) => c.bookingDate.localeCompare(a.bookingDate))
      .map((x) => ({ key: `booking:${x.id}`, kind: "booking" as const, id: x.id, label: `تعاقد ${x.courseName} بتاريخ ${x.bookingDate}` }));
    return [...v, ...b, { key: "general", kind: "general" as const, id: undefined, label: `تجربتك مع شلبي` }];
  }, [lead, visits, bookings]);

  useEffect(() => {
    if (isOpen) {
      setSent(null);
      setCopied(false);
      setChoice(options[0]?.key || "general");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead || !canRequestReview(effectiveUser, lead)) return null;
  const picked = subject
    ? { key: "preset", kind: subject.kind, id: subject.id, label: subject.label }
    : options.find((o) => o.key === choice) || options[options.length - 1];
  const pendingForPicked = reviewRequests.find(
    (r) => r.leadId === lead.id && r.status === "sent" && r.subjectKind === picked.kind && r.subjectId === picked.id,
  );
  const answeredForPicked = reviewRequests.find(
    (r) => r.leadId === lead.id && r.status === "answered" && r.subjectKind === picked.kind && r.subjectId === picked.id,
  );
  const phone = lead.whatsappPhone || lead.phone;

  const preview = requestMessage(lead, picked.label, "…");
  const send = () => {
    // Re-use a request that is still waiting for the same visit instead of creating a second link.
    const req = pendingForPicked ?? requestReview({ lead, subjectKind: picked.kind, subjectId: picked.id, subjectLabel: picked.label });
    setSent(req);
    window.open(whatsappUrl(phone, requestMessage(lead, req.subjectLabel, reviewLink(req.id))), "_blank", "noopener");
  };
  const copy = async () => {
    if (!sent) return;
    try {
      await navigator.clipboard.writeText(reviewLink(sent.id));
      setCopied(true);
    } catch {
      /* the link is selectable in the field */
    }
  };

  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex: 80 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="rating-share-title" className="panel" ref={ref} style={{ width: "min(480px,100%)", padding: 27 }}>
        <div className="page-heading">
          <div>
            <span className="eyebrow">رأي العميل يهمنا</span>
            <h2 id="rating-share-title" style={{ fontSize: 20, fontWeight: 600 }}>
              طلب تقييم من {lead.name}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        {!sent ? (
          <>
            <p className="quiet-note" style={{ padding: "0 0 16px" }}>
              هنفتح واتساب برسالة جاهزة فيها لينك خاص بالعميل ده، وانت اللي بتدوس إرسال. لو ما قيّمش بعد 48 ساعة هتظهرلك تذكير.
            </p>
            {!subject && options.length > 1 && (
              <label className="field">
                <span>التقييم يخص إيه؟</span>
                <select value={choice} onChange={(e) => setChoice(e.target.value)}>
                  {options.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="review-preview" aria-label="شكل الرسالة">
              {preview}
            </div>
            {answeredForPicked && !pendingForPicked && (
              <p className="notice warning">العميل رد على طلب تقييم لنفس الموضوع قبل كده ({answeredForPicked.answeredAt?.slice(0, 10)}). متأكد إنك عايز تبعت طلب جديد؟ ممكن تختار زيارة أو موضوع تاني بدل كده.</p>
            )}
            {pendingForPicked && <p className="notice warning">فيه طلب تقييم متبعت قبل كده لنفس الموضوع. هنفتح نفس اللينك تاني من غير ما نعمل طلب جديد.</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={send}>
                <MessageCircle size={16} />
                {answeredForPicked && !pendingForPicked ? "أيوه، ابعت طلب جديد" : "إرسال على واتساب"}
              </button>
              <button className="btn-text" onClick={onClose}>
                إلغاء
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="notice" role="status">
              اتفتح واتساب بالرسالة الجاهزة. اضغط إرسال هناك، وهنفكّرك بعد 48 ساعة لو العميل ما ردش.
            </p>
            <label className="field">
              <span>لينك التقييم</span>
              <input readOnly value={reviewLink(sent.id)} dir="ltr" onFocus={(e) => e.target.select()} />
            </label>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn-secondary" onClick={copy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "تم النسخ" : "نسخ اللينك"}
              </button>
              <button className="btn-primary" onClick={onClose}>
                تمام
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
