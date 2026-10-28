import { useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { requestForSubject, requestMessage, reviewLink, whatsappUrl } from "../../lib/reviews";

export interface VisitReviewTarget {
  visitId: string;
  label: string;
  client?: { leadId: string; name: string; phone: string };
  broker?: { brokerId: string };
}

/** Right after a visit is saved: one tap per person opens WhatsApp with their own link; each answer is kept on that person. */
export function PostVisitReview({ target, compact = false }: { target: VisitReviewTarget; compact?: boolean }) {
  const { leads, brokers, reviewRequests, requestReview, requestBrokerReview } = useCRM();
  const [error, setError] = useState("");
  const lead = target.client ? leads.find((l) => l.id === target.client!.leadId) : undefined;
  const broker = target.broker ? brokers.find((b) => b.id === target.broker!.brokerId) : undefined;
  const clientReq = target.client ? requestForSubject(reviewRequests, { leadId: target.client.leadId }, "visit", target.visitId) : undefined;
  const brokerReq = target.broker ? requestForSubject(reviewRequests, { brokerId: target.broker.brokerId }, "visit", target.visitId) : undefined;

  const run = (send: () => void) => {
    setError("");
    try {
      send();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تجهيز طلب التقييم.");
    }
  };
  const sendClient = () =>
    run(() => {
      if (!target.client || !lead) throw new Error("ملف العميل لسه بيتحفظ، جرّب بعد ثانية.");
      const req = clientReq ?? requestReview({ lead, subjectKind: "visit", subjectId: target.visitId, subjectLabel: target.label });
      window.open(whatsappUrl(lead.whatsappPhone || lead.phone || target.client.phone, requestMessage(lead, req.subjectLabel, reviewLink(req.id))), "_blank", "noopener");
    });
  const sendBroker = () =>
    run(() => {
      if (!broker) throw new Error("الوسيط لسه بيتحفظ، جرّب بعد ثانية.");
      const req = brokerReq ?? requestBrokerReview({ broker, branchId: leads.find((l) => l.id === target.client?.leadId)?.branchId ?? broker.branchIds?.[0] ?? "", subjectId: target.visitId, subjectLabel: target.label });
      window.open(whatsappUrl(broker.phone, requestMessage({ name: broker.name }, req.subjectLabel, reviewLink(req.id))), "_blank", "noopener");
    });

  const row = (who: string, name: string, sent: boolean, onSend: () => void, ready: boolean) =>
    compact ? (
      <button className="btn-primary" key={who} onClick={onSend} disabled={!ready}>
        <MessageCircle size={15} />
        {sent ? "افتح واتساب تاني" : `ابعت التقييم لل${who}`}
      </button>
    ) : (
    <div className="review-offer" key={who}>
      <span>
        <strong>
          {sent ? <Check size={14} /> : null} تقييم {who}: {name}
        </strong>
        <small>{sent ? "اتجهّز له لينك. دوس تاني لو محتاج تفتح واتساب من جديد." : "هنفتح واتساب برسالة جاهزة، وانت اللي بتدوس إرسال."}</small>
      </span>
      <button className="btn-secondary" onClick={onSend} disabled={!ready}>
        <MessageCircle size={15} />
        {sent ? "افتح واتساب تاني" : `إرسال التقييم لل${who}`}
      </button>
    </div>
  );
  return (
    <div style={compact ? { display: "contents" } : undefined}>
      {target.client && row("عميل", target.client.name, !!clientReq, sendClient, !!lead)}
      {target.broker && broker && row("وسيط", broker.name, !!brokerReq, sendBroker, true)}
      {error && <p className="notice warning">{error}</p>}
    </div>
  );
}
