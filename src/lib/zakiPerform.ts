import type { CRMContextType } from "../context/CRMContext";
import type { Lead } from "../types/crm";
import { bookingFor, type PendingAction } from "./zakiActions";
import { joinSchedule } from "./followUps";
import { QUOTE_FOLLOWUP_DAYS } from "./quotes";
import { SATISFACTION_DAYS } from "./postSale";
import { AUTO_FOLLOWUP_DAYS } from "./followUpDefaults";

/** What performing a confirmed action may use: the same guarded workspace functions the screens call. */
export type PerformCtx = Pick<
  CRMContextType,
  "addLead" | "addBooking" | "saveQuote" | "setQuoteStatus" | "acceptQuote" | "addFollowUp" | "updateFollowUpResult" | "rescheduleFollowUp" | "updateLead" | "addTimelineEvent" | "setEmployeeTarget" | "reassignLead" | "findDuplicateLeadsByPhone"
> & {
  leads: Lead[];
  quotes: CRMContextType["quotes"];
  me: { id: string; name: string; branchId?: string };
  firstBranchId: string;
  newCustomerAgentId: (branchId: string) => string;
  interestNames: (ids: ("general")[]) => string;
};

const money = (n: number) => n.toLocaleString("en-US");

/** Records a confirmed action and returns the message to show, including what happens next so the person is not left guessing. */
export function performAction(a: PendingAction, c: PerformCtx): string {
  const findLead = () => c.leads.find((l) => l.id === a.leadId);
  const need = (): Lead => {
    const l = findLead();
    if (!l) throw new Error("العميل مش موجود.");
    return l;
  };

  switch (a.kind) {
    case "customer":
    case "sale": {
      let lead = findLead();
      let created = false;
      if (!lead && a.newCustomer) {
        if (c.findDuplicateLeadsByPhone(a.newCustomer.phone).length) throw new Error("رقم الموبايل ده متسجّل قبل كده لعميل. اطلب مني أدور عليه وأسجل له البيع.");
        const branchId = c.me.branchId || c.firstBranchId;
        if (!branchId) throw new Error("مش قادر أحدد الفرع للعميل الجديد. سجّله من صفحة العملاء.");
        lead = c.addLead({
          name: a.newCustomer.name,
          phone: a.newCustomer.phone,
          whatsappPhone: a.newCustomer.phone,
          isSameWhatsApp: true,
          source: "phone_inquiry",
          customerCategory: "individual",
          branchId,
          assignedAgentId: c.newCustomerAgentId(branchId),
          status: "new",
          classification: "B",
          department: "general",
          interests: ["general"],
          departmentName: c.interestNames(["general"]),
          notes: a.newCustomer.notes ?? "",
        });
        created = true;
      }
      if (!lead) throw new Error("العميل مش موجود.");
      if (a.kind === "customer") return `اتسجّل العميل ${lead.name}. وهتجيلك متابعة أولى معاه بعد ${AUTO_FOLLOWUP_DAYS} أيام.`;
      c.addBooking(bookingFor(lead, a, lead.assignedAgentId || c.me.id));
      return `${created ? `اتسجّل العميل ${lead.name} و` : ""}اتسجّلت عملية بيع ${lead.name} بإجمالي ${money(a.total)} ج.م. وهفكّرك تسأله عن رضاه بعد ${SATISFACTION_DAYS} أيام (التقييم اختياري).`;
    }
    case "quote": {
      const lead = need();
      const q = c.saveQuote({ leadId: lead.id, addressedTo: a.quote?.addressedTo ?? "", lines: a.lines, terms: a.quote?.terms ?? [] }, { send: !!a.quote?.send });
      if (!a.quote?.send) return `اتحفظ عرض السعر ${q.number} (${money(q.total)} ج.م) كمسودة. لما تبعته للعميل قولّي وأجدول لك المتابعة، وتقدر تطبعه من صفحة «عروض الأسعار».`;
      return `اتحفظ عرض السعر ${q.number} (${money(q.total)} ج.م) واتعلّم إنه اتبعت. ${q.followUpId ? `واتجدولت متابعة معاه بعد ${QUOTE_FOLLOWUP_DAYS} أيام وهفكّرك بيها.` : "وعندك متابعة مفتوحة مع العميل فمفيش متابعة تلقائية."}`;
    }
    case "quote_status": {
      const q = c.quotes.find((x) => x.id === a.quoteId);
      if (!q) throw new Error("عرض السعر مش موجود.");
      if (a.quoteStatus === "accepted") {
        c.acceptQuote(q.id);
        return `اتسجّل بيع ${money(q.total)} ج.م من عرض السعر ${q.number} للعميل ${q.leadName}. وهفكّرك تسأله عن رضاه بعد ${SATISFACTION_DAYS} أيام.`;
      }
      if (a.quoteStatus === "lost") {
        c.setQuoteStatus(q.id, "lost", a.reason);
        return `اتقفل عرض السعر ${q.number} (ما اتقبلش)${a.reason ? `: ${a.reason}` : ""}. والمتابعة التلقائية بتاعته اتلغت.`;
      }
      c.setQuoteStatus(q.id, "sent");
      return `اتعلّم عرض السعر ${q.number} إنه اتبعت، واتجدولت متابعة بعد ${QUOTE_FOLLOWUP_DAYS} أيام لو مكنش عندك متابعة مفتوحة مع العميل.`;
    }
    case "followup": {
      const lead = need();
      const f = a.followUp!;
      c.addFollowUp({
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        assignedAgentId: lead.assignedAgentId || c.me.id,
        branchId: lead.branchId,
        scheduledAt: joinSchedule(f.date!, f.time),
        reason: f.reason!,
        priority: f.priority,
        type: f.type ?? "call",
        notes: "",
      });
      return `اتجدولت متابعة مع ${lead.name} يوم ${f.date}${f.time ? ` الساعة ${f.time}` : ""}، وهفكّرك بيها.`;
    }
    case "followup_done": {
      c.updateFollowUpResult(a.followUp!.id!, "completed", a.followUp!.result!, a.followUp!.nextDate);
      return `اتقفلت المتابعة مع ${a.customerName}.${a.followUp!.nextDate ? ` والمتابعة الجاية يوم ${a.followUp!.nextDate}.` : ""}`;
    }
    case "followup_move": {
      const f = a.followUp!;
      c.rescheduleFollowUp(f.id!, joinSchedule(f.date!, f.time), f.reason!);
      return `اتأجلت متابعة ${a.customerName} لـ ${f.date}${f.time ? ` ${f.time}` : ""}.`;
    }
    case "note": {
      const lead = need();
      c.updateLead(lead.id, { notes: [lead.notes, a.note].filter(Boolean).join(" | ") });
      c.addTimelineEvent({ leadId: lead.id, authorId: c.me.id, authorName: c.me.name, type: "note", title: "ملاحظة على ملف العميل", details: a.note! });
      return `اتسجّلت الملاحظة على ملف ${lead.name}.`;
    }
    case "target": {
      const t = a.target!;
      c.setEmployeeTarget(t.userId, t.month, t.amount);
      return `اتحدد هدف ${t.userName} لشهر ${t.month}: ${money(t.amount)} ج.م.`;
    }
    case "reassign": {
      const lead = need();
      c.reassignLead(lead.id, a.reassign!.toUserId);
      return `اتنقل العميل ${lead.name} للموظف ${a.reassign!.toName}.`;
    }
  }
}
