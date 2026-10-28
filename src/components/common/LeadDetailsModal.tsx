import { BrokerSearch } from "./BrokerSearch";
import { CustomerBrief } from "./CustomerBrief";
import { buildTimeline, dayLabel, timeLabel, timelineGroupLabels, type TimelineGroup } from "../../lib/timeline";
import { departmentIds, bookingSplit } from "../../lib/purchases";
import {
  canEditCustomer,
  canContactCustomer,
  canRequestReview,
  branchAgents,
  canCreateCustomer,
  canScheduleFollowUp,
  canAssignCustomers,
  isSales,
} from "../../lib/access";
import { hasPermission } from "../../lib/permissions";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  X,
  Phone,
  MessageCircle,
  Plus,
  MoreHorizontal,
  ArrowRight,
  Pencil,
  MapPin,
  FileText,
  ShoppingBag,
  Users,
  Star,
  CalendarDays,
  Clock3,
  Building2,
  UserRound,
  CheckCircle2,
} from "lucide-react";
import type { Lead, Department, LeadStatus, Booking } from "../../types/crm";
import { useCRM } from "../../context/CRMContext";
import {
  statusNames,
  sourceNames,
  departmentNames,
  phoneNumber,
  formatMoney,
  today,
  followUpStatus,
  isManagement,
  canSeeBranch,
} from "../../lib/presentation";
import { useDialog } from "./useDialog";
import { requestsTo } from "../../lib/reviews";
import { CustomerRatingModal } from "./CustomerRatingModal";
import { InterestPicker, interestNames } from "./InterestPicker";
import { NameWithTitle } from "./NameWithTitle";
import { ReviewCard } from "../reviews/ReviewCard";
import { VoiceNoteField } from "./VoiceNoteField";
import { PurchaseOutcomeDialog } from "./PurchaseOutcomeDialog";

export type LeadQuickAction = "edit" | "visit" | "followup" | "outcome";
interface Props {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  initialAction?: LeadQuickAction | null;
  /** Opens another customer, such as the one who recommended this one. */
  onOpenLead?: (id: string) => void;
}
type Action =
  | Exclude<LeadQuickAction, "outcome">
  | "note"
  | "booking"
  | "reassign"
  | null;
export function LeadDetailsModal({
  lead,
  isOpen,
  onClose,
  initialAction = null,
  onOpenLead,
}: Props) {
  const {
    effectiveUser,
    leads,
    users,
    branches,
    timelineEvents,
    visits,
    followUps,
    bookings,
    purchaseInvoices,
    brokers,
    updateLead,
    addFollowUp,
    addBooking,
    addVisit,
    reassignLead,
    addTimelineEvent,
    reviewRequests,
    reviewNotes,
  } = useCRM();
  const [tab, setTab] = useState("timeline");
  const [timelineFilter, setTimelineFilter] = useState<"all" | TimelineGroup>("all");
  const [action, setAction] = useState<Action>(null);
  const [more, setMore] = useState(false);
  const [rating, setRating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [interests, setInterests] = useState<Department[]>(["decor"]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState("");
  const [deptAmounts, setDeptAmounts] = useState<Record<Department, string>>({
    construction: "",
    decor: "",
    garden: "",
    general: "",
  });
  const [agent, setAgent] = useState("");
  const [feedback, setFeedback] = useState("");
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [brokerSel, setBrokerSel] = useState("");
  const allowed = (value: Action) =>
    !!lead &&
    (value === "edit" || value === "note"
      ? canEditCustomer(effectiveUser, lead)
      : value === "followup"
        ? canScheduleFollowUp(effectiveUser, lead)
        : value === "reassign"
          ? canAssignCustomers(effectiveUser)
          : value === "visit"
            ? canCreateCustomer(effectiveUser)
            : value === "booking"
              ? hasPermission(effectiveUser, "bookings.create") &&
                (!isSales(effectiveUser) ||
                  lead.assignedAgentId === effectiveUser.id)
              : false);
  const ref = useDialog(isOpen, onClose);
  const actionForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!isOpen || !action) return;
    const form = actionForm.current;
    const scroll = form?.closest<HTMLElement>(".client-scroll");
    if (!form || !scroll) return;
    scroll.scrollTo({
      top:
        scroll.scrollTop +
        form.getBoundingClientRect().top -
        scroll.getBoundingClientRect().top -
        16,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [action, isOpen]);
  useEffect(() => {
    if (isOpen && lead) {
      setTab("timeline");
      setOutcomeOpen(initialAction === "outcome" && canEditCustomer(effectiveUser, lead));
      setAction(
        initialAction && initialAction !== "outcome" && allowed(initialAction)
          ? initialAction
          : null,
      );
      setMore(false);
      setRating(false);
      setName(lead.name);
      setPhone(lead.phone);
      setEmail(lead.email || "");
      setWhatsapp(lead.whatsappPhone || lead.phone);
      setInterests(lead.interests?.length ? lead.interests : [lead.department]);
      setBrokerSel(lead.brokerId || "");
      setDate(today());
      setNote(initialAction === "edit" ? lead.notes : "");
      setReason("");
      setDeptAmounts({ construction: "", decor: "", garden: "", general: "" });
      setAgent(
        lead.assignedAgentId ||
          (isSales(effectiveUser) ? effectiveUser.id : ""),
      );
      setFeedback("");
    }
  }, [isOpen, lead?.id, initialAction]);
  if (!isOpen || !lead) return null;
  const events = buildTimeline(lead.id, timelineEvents, reviewRequests, reviewNotes);
  const shownEvents = timelineFilter === "all" ? events : events.filter((e) => e.group === timelineFilter);
  const timelineGroups = (Object.keys(timelineGroupLabels) as TimelineGroup[]).filter((g) => events.some((e) => e.group === g));
  const leadVisits = visits.filter((v) => v.linkedLeadId === lead.id);
  const broughtLeads = leads.filter((l) => l.referredByLeadId === lead.id);
  const leadFollowUps = followUps
    .filter((f) => f.leadId === lead.id)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const leadBookings = bookings.filter((b) => b.leadId === lead.id);
  const invoices = purchaseInvoices.filter((i) => i.leadId === lead.id);
  const next = leadFollowUps.find(
    (f) => !["completed", "cancelled"].includes(followUpStatus(f)),
  );
  const show = (value: Action) => {
    if (!allowed(value)) return;
    setAction(action === value ? null : value);
    setMore(false);
    setFeedback("");
    setNote(value === "edit" ? lead.notes : "");
    setReason("");
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("");
    if (!allowed(action)) return;
    if (
      ["followup", "booking", "visit", "reassign"].includes(action || "") &&
      !agent
    ) {
      setFeedback("اختَر الموظف المسؤول من نفس الفرع.");
      return;
    }
    if (action === "edit") {
      if (!name.trim() || !/^\+?[\d\s()-]{10,18}$/.test(phone)) {
        setFeedback("راجع الاسم ورقم الهاتف.");
        return;
      }
      updateLead(lead.id, {
        name: name.trim(),
        phone: phone.trim(),
        department: interests[0],
        interests,
        departmentName: interestNames(interests),
        email: email.trim() || undefined,
        whatsappPhone: whatsapp.trim() || phone.trim(),
        isSameWhatsApp: !whatsapp.trim() || whatsapp.trim() === phone.trim(),
        notes: note.trim(),
        brokerId: brokerSel || undefined,
        brokerName: brokers.find((b) => b.id === brokerSel)?.name,
      });
    }
    if (action === "note") {
      if (!note.trim()) {
        setFeedback("اكتب الملاحظة قبل الحفظ.");
        return;
      }
      addTimelineEvent({
        leadId: lead.id,
        authorId: effectiveUser.id,
        authorName: effectiveUser.name,
        type: "note",
        title: "ملاحظة على ملف العميل",
        details: note.trim(),
      });
      updateLead(lead.id, {
        ...(canContactCustomer(effectiveUser, lead, followUps)
          ? { lastContactDate: today() }
          : {}),
        notes: [lead.notes, note.trim()].filter(Boolean).join(" | "),
      });
    }
    if (action === "followup") {
      if (!date || !reason.trim()) {
        setFeedback("حدد الموعد وسبب المتابعة.");
        return;
      }
      addFollowUp({
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        assignedAgentId: agent,
        branchId: lead.branchId,
        scheduledAt: date,
        reason: reason.trim(),
        type: "call",
        notes: note.trim(),
      });
      setTab("followups");
    }
    if (action === "visit") {
      if (!date || !reason.trim()) {
        setFeedback("حدد تاريخ الزيارة وسببها.");
        return;
      }
      addVisit({
        visitorName: lead.name,
        phone: lead.phone,
        whatsappPhone: lead.whatsappPhone,
        date,
        time: new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Africa/Cairo",
        }).format(new Date()),
        branchId: lead.branchId,
        receivedByAgentId: agent,
        source: lead.source,
        department: lead.department,
        reason: reason.trim(),
        outcome: note.trim() || "لم تُسجل نتيجة",
        notes: note.trim(),
        hasPreviousRecord: true,
        linkedLeadId: lead.id,
        requiresFollowUp: false,
      });
      setTab("visits");
    }
    if (action === "booking") {
      const parts = departmentIds
        .map((id) => [id, Number(deptAmounts[id] || 0)] as const)
        .filter(([, v]) => v !== 0);
      if (
        !parts.length ||
        parts.some(([, v]) => !Number.isFinite(v) || v < 0)
      ) {
        setFeedback("اكتب قيمة أكبر من صفر في قسم واحد على الأقل.");
        return;
      }
      const total = parts.reduce((s, [, v]) => s + v, 0);
      const primary = [...parts].sort((a, b) => b[1] - a[1])[0][0];
      addBooking({
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        branchId: lead.branchId,
        agentId: agent,
        department: primary,
        courseId: parts.length === 1 ? `ps-${primary}` : "ps-multi",
        courseName: parts.map(([id]) => departmentNames[id]).join(" + "),
        bookingDate: today(),
        amount: total,
        departmentAmounts: Object.fromEntries(parts),
        bookingStatus: "confirmed",
        source: lead.source,
        notes: note.trim(),
      });
      setDeptAmounts({ construction: "", decor: "", garden: "", general: "" });
      setTab("bookings");
    }
    if (action === "reassign") {
      if (!agent) {
        setFeedback("اختَر الموظف المسؤول.");
        return;
      }
      reassignLead(lead.id, agent);
    }
    setAction(null);
    setFeedback("حُفظ التعديل على هذا الجهاز.");
  };
  const actionTitles: Record<NonNullable<Action>, string> = {
    edit: "تعديل بيانات العميل",
    note: "تسجيل ملاحظة",
    followup: "تحديد متابعة",
    visit: "تسجيل زيارة",
    booking: "تسجيل شراء",
    reassign: "تغيير الموظف المسؤول",
  };
  const leadReviews = reviewRequests.filter((r) => r.leadId === lead.id);
  const sentBefore = requestsTo(reviewRequests, { leadId: lead.id })[0];
  const labels: Record<string, string> = {
    timeline: "سجل التعاملات",
    followups: `المتابعات (${leadFollowUps.length})`,
    visits: `الزيارات (${leadVisits.length})`,
    bookings: `المشتريات (${leadBookings.length})`,
    reviews: `التقييمات (${leadReviews.length})`,
  };
  return (
    <div
      className="dialog-backdrop client-sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="client-dialog client-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-profile-title"
        ref={ref}
      >
        <div className="client-dialog-header">
          <div className="client-identity">
            <span className="client-avatar" aria-hidden="true">
              {lead.name.trim().charAt(0)}
            </span>
            <div>
              <span className="client-profile-kicker">
                ملف العميل <span>·</span>{" "}
                {canEditCustomer(effectiveUser, lead)
                  ? "مساحة المتابعة"
                  : "للمراجعة"}
              </span>
              <h2 id="client-profile-title">{lead.name}</h2>
              <div className="client-identity-meta">
                <span dir="ltr">{lead.phone}</span>
                <span
                  className={`status-pill ${lead.status === "booked" ? "is-success" : lead.status === "new" ? "is-new" : lead.status === "needs_followup" ? "is-warning" : ""}`}
                >
                  <i />
                  {statusNames[lead.status]}
                </span>
              </div>
            </div>
          </div>
          <button
            className="icon-button client-close"
            onClick={onClose}
            aria-label="إغلاق ملف العميل"
          >
            <X size={20} />
          </button>
        </div>
        <div className="client-action-bar">
          {allowed("followup") && (
            <button className="btn-primary" onClick={() => show("followup")}>
              <Plus size={15} />
              تحديد متابعة
            </button>
          )}
          {canContactCustomer(effectiveUser, lead, followUps) && (
            <a
              className="btn-secondary"
              href={`tel:${phoneNumber(lead.phone)}`}
            >
              <Phone size={15} />
              اتصال
            </a>
          )}
          {canContactCustomer(effectiveUser, lead, followUps) && (
            <a
              className="btn-secondary"
              href={`https://wa.me/${phoneNumber(lead.whatsappPhone || lead.phone)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={15} />
              واتساب
            </a>
          )}
          {canRequestReview(effectiveUser, lead) && (
            <button className="btn-secondary" onClick={() => setRating(true)}>
              <Star size={15} />
              {sentBefore ? "طلب تقييم جديد؟" : "طلب تقييم"}
            </button>
          )}
          {(["edit", "note", "visit", "booking", "reassign"].some((v) =>
            allowed(v as Action),
          ) ||
            canContactCustomer(effectiveUser, lead, followUps)) && (
            <button
              className="btn-secondary client-more-toggle"
              aria-expanded={more}
              aria-controls="client-more-actions"
              onClick={() => setMore(!more)}
            >
              <MoreHorizontal size={17} />
              المزيد
            </button>
          )}
          {more && (
            <div className="client-more" id="client-more-actions">
              {[
                { id: "edit", label: "تعديل البيانات", Icon: Pencil },
                { id: "visit", label: "تسجيل زيارة", Icon: MapPin },
                { id: "note", label: "إضافة ملاحظة", Icon: FileText },
                { id: "booking", label: "تسجيل شراء", Icon: ShoppingBag },
                ...(canAssignCustomers(effectiveUser)
                  ? [{ id: "reassign", label: "تغيير المسؤول", Icon: Users }]
                  : []),
              ]
                .filter(({ id }) => allowed(id as Action))
                .map(({ id, label, Icon }) => (
                  <button
                    className={`btn-secondary${id === "booking" ? " btn-buy" : ""}`}
                    key={id}
                    onClick={() => show(id as Action)}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
            </div>
          )}
        </div>
        {sentBefore && (
          <p className="review-sent-note" role="status">
            <Star size={13} /> تم إرسال طلب تقييم ({sentBefore.subjectLabel}) يوم {sentBefore.sentAt.slice(0, 10)}:{" "}
            {sentBefore.status === "answered" ? "العميل رد عليه" : "لسه ما ردش"}. اضغط «طلب تقييم جديد؟» لو محتاج تبعت طلب تاني.
          </p>
        )}
        <div className="client-scroll">
          <div className="profile-summary">
            <div>
              <small>
                <CalendarDays size={15} /> المتابعة القادمة
              </small>
              <span>
                {next ? (
                  <bdi>{next.scheduledAt.replace("T", " ").slice(0, 16)}</bdi>
                ) : (
                  "لم يُحدد موعد"
                )}
              </span>
            </div>
            <label>
              <small>
                <UserRound size={15} /> حالة العميل
              </small>
              {canEditCustomer(effectiveUser, lead) ? (
                <select
                  aria-label="تحديث حالة العميل"
                  value={lead.status}
                  onChange={(e) =>
                    updateLead(lead.id, {
                      status: e.target.value as LeadStatus,
                    })
                  }
                >
                  {Object.entries(statusNames).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{statusNames[lead.status]}</span>
              )}
            </label>
          </div>
          <div className="client-context-strip">
            <div>
              <Building2 size={16} />
              <span>
                <small>الفرع</small>
                {lead.branchName || "لم يحدد"}
              </span>
            </div>
            <div>
              <UserRound size={16} />
              <span>
                <small>الموظف المسؤول</small>
                {lead.assignedAgentName || "لم يحدد"}
              </span>
            </div>
            <div>
              <ShoppingBag size={16} />
              <span>
                <small>القسم / المصدر</small>
                {lead.interests?.length ? interestNames(lead.interests) : departmentNames[lead.department]} · {sourceNames[lead.source]}
              </span>
            </div>
            {(lead.referredByLeadId || broughtLeads.length > 0) && (
              <div>
                <Users size={16} />
                <span>
                  <small>الترشيحات</small>
                  {lead.referredByLeadId && (
                    <button className="btn-text" style={{ padding: 0 }} onClick={() => onOpenLead?.(lead.referredByLeadId!)}>
                      رشّحه {lead.referredByName || "عميل"}
                    </button>
                  )}
                  {lead.referredByLeadId && broughtLeads.length > 0 && " · "}
                  {broughtLeads.length > 0 && `رشّح ${broughtLeads.length} (${broughtLeads.filter((l) => l.status === "booked").length} اشتروا)`}
                </span>
              </div>
            )}
          </div>
          {canEditCustomer(effectiveUser, lead) && <CustomerBrief lead={lead} />}
          {lead.notes && (
            <div className="client-note-preview">
              <FileText size={16} />
              <div>
                <h3>ملاحظات العميل</h3>
                <p>{lead.notes}</p>
              </div>
            </div>
          )}
          {action && (
            <form
              className="profile-form"
              ref={actionForm}
              key={action}
              onSubmit={submit}
              noValidate
            >
              <div className="section-title">
                <div>
                  <h3>{actionTitles[action]}</h3>
                </div>
                <button
                  type="button"
                  className="btn-text"
                  style={{ marginInlineStart: "auto" }}
                  onClick={() => setAction(null)}
                >
                  إلغاء
                  <X size={14} />
                </button>
              </div>
              <div className="field-grid">
                {action === "edit" && (
                  <>
                    <NameWithTitle value={name} onChange={setName} required fieldName="editCustomerName" />
                    <label className="field">
                      <span>
                        رقم الهاتف <em>مطلوب</em>
                      </span>
                      <input
                        type="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </label>
                  </>
                )}
                {action === "edit" && (
                  <InterestPicker value={interests} onChange={setInterests} />
                )}
                {(action === "followup" || action === "visit") && (
                  <>
                    <label className="field">
                      <span>
                        {action === "followup"
                          ? "موعد المتابعة"
                          : "تاريخ الزيارة"}{" "}
                        <em>مطلوب</em>
                      </span>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>
                        السبب <em>مطلوب</em>
                      </span>
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={
                          action === "followup"
                            ? "مثلاً: متابعة عرض سعر"
                            : "مثلاً: معاينة عينات"
                        }
                      />
                    </label>
                  </>
                )}
                {action === "booking" && (
                  <>
                    {departmentIds.map((id) => (
                      <label className="field" key={id}>
                        <span>{departmentNames[id]} (ج.م)</span>
                        <input
                          type="number"
                          min="0"
                          step=".01"
                          placeholder="0"
                          value={deptAmounts[id]}
                          onChange={(e) =>
                            setDeptAmounts((prev) => ({
                              ...prev,
                              [id]: e.target.value,
                            }))
                          }
                        />
                      </label>
                    ))}
                    <p className="table-secondary full-width">
                      إجمالي المشتريات:{" "}
                      <strong>
                        {formatMoney(
                          departmentIds.reduce(
                            (s, id) => s + (Number(deptAmounts[id]) || 0),
                            0,
                          ),
                        )}{" "}
                        ج.م
                      </strong>{" "}
                      — اكتب المبلغ في القسم أو الأقسام اللي اشترى منها فقط، وسيب الباقي فاضي.
                    </p>
                  </>
                )}
                {["reassign", "followup", "booking", "visit"].includes(
                  action || "",
                ) && (
                  <label className="field full-width">
                    <span>
                      الموظف المسؤول <em>مطلوب</em>
                    </span>
                    <select
                      disabled={isSales(effectiveUser)}
                      value={agent}
                      onChange={(e) => setAgent(e.target.value)}
                    >
                      <option value="">اختَر موظفًا من نفس الفرع</option>
                      {branchAgents(users, lead.branchId)
                        .filter((u) => canSeeBranch(effectiveUser, lead.branchId, branches))
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {action === "edit" && (
                  <details className="optional-section full-width">
                    <summary>
                      <span>
                        تفاصيل التواصل <em className="optional-tag">اختياري</em>
                      </span>
                    </summary>
                    <div className="field-grid">
                      <BrokerSearch
                        label="الوسيط اللي جاب العميل"
                        brokers={brokers}
                        value={brokerSel}
                        onChange={setBrokerSel}
                      />
                      <label className="field">
                        <span>رقم الواتساب</span>
                        <input
                          type="tel"
                          dir="ltr"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>البريد الإلكتروني</span>
                        <input
                          type="email"
                          dir="ltr"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </label>
                      <label className="field full-width">
                        <span>ملاحظات</span>
                        <VoiceNoteField value={note} onChange={setNote} rows={2} />
                      </label>
                    </div>
                  </details>
                )}
                {!["edit", "reassign"].includes(action) && (
                  <label className="field full-width">
                    <span>
                      {action === "visit" ? "نتيجة الزيارة" : "ملاحظات"}{" "}
                      <em>{action === "note" ? "مطلوب" : "اختياري"}</em>
                    </span>
                    <VoiceNoteField value={note} onChange={setNote} rows={2} />
                  </label>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <button className="btn-primary" type="submit">
                  حفظ{" "}
                  {action === "followup"
                    ? "المتابعة"
                    : action === "booking"
                      ? "التعاقد"
                      : action === "visit"
                        ? "الزيارة"
                        : "التعديل"}
                </button>
                <span className="quiet-note" style={{ padding: 0 }}>
                  الحقول المكتوب عليها «اختياري» تقدر تسيبها فاضية.
                </span>
              </div>
            </form>
          )}
          {feedback && (
            <p className="notice" role="status" style={{ margin: "16px 26px" }}>
              {feedback}
            </p>
          )}
          <div
            className="client-tabs"
            role="tablist"
            aria-label="تفاصيل العميل"
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              const tabs = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                ),
              );
              const current = tabs.indexOf(event.target as HTMLButtonElement);
              if (current < 0) return;
              event.preventDefault();
              const rtl = document.documentElement.dir === "rtl";
              const step =
                event.key === "ArrowRight" ? (rtl ? -1 : 1) : rtl ? 1 : -1;
              const target =
                event.key === "Home"
                  ? tabs[0]
                  : event.key === "End"
                    ? tabs[tabs.length - 1]
                    : tabs[(current + step + tabs.length) % tabs.length];
              target.focus();
              target.click();
            }}
          >
            {Object.entries(labels)
              .filter(
                ([id]) =>
                  id === "timeline" ||
                  id === "reviews" ||
                  hasPermission(
                    effectiveUser,
                    (
                      {
                        followups: "followups.view",
                        visits: "visits.view",
                        bookings: "bookings.view",
                        invoices: "invoices.view",
                      } as const
                    )[id as "followups" | "visits" | "bookings" | "invoices"],
                  ),
              )
              .map(([id, label]) => (
                <button
                  key={id}
                  id={`client-tab-${id}`}
                  role="tab"
                  aria-selected={tab === id}
                  tabIndex={tab === id ? 0 : -1}
                  aria-controls="client-tab-panel"
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
          </div>
          <div
            className="profile-content"
            key={tab}
            role="tabpanel"
            id="client-tab-panel"
            aria-labelledby={`client-tab-${tab}`}
          >
            {tab === "timeline" &&
              (events.length ? (
                <>
                  {timelineGroups.length > 1 && (
                    <div className="tab-filter timeline-filter" role="group" aria-label="تصفية سجل التعاملات">
                      <button type="button" aria-pressed={timelineFilter === "all"} onClick={() => setTimelineFilter("all")}>
                        الكل ({events.length})
                      </button>
                      {timelineGroups.map((g) => (
                        <button type="button" key={g} aria-pressed={timelineFilter === g} onClick={() => setTimelineFilter(g)}>
                          {timelineGroupLabels[g]} ({events.filter((e) => e.group === g).length})
                        </button>
                      ))}
                    </div>
                  )}
                  <ol className="timeline">
                    {shownEvents.map((e, i) => {
                      const day = dayLabel(e.at);
                      const newDay = i === 0 || day !== dayLabel(shownEvents[i - 1].at);
                      const Icon =
                        e.group === "purchase" ? ShoppingBag
                        : e.group === "visit" ? MapPin
                        : e.group === "review" ? Star
                        : e.type === "followup_result" ? CheckCircle2
                        : e.group === "followup" ? CalendarDays
                        : e.type === "call" || e.type === "inquiry" ? Phone
                        : e.type === "note" ? FileText
                        : UserRound;
                      return (
                        <Fragment key={e.id}>
                        {newDay && <li className="timeline-day" aria-hidden="true">{day}</li>}
                        <li className={`timeline-item group-${e.group}${e.tone ? ` tone-${e.tone}` : ""}`}>
                          <span className="timeline-dot" aria-hidden="true">
                            <Icon size={14} />
                          </span>
                          <div className="timeline-body">
                            <h3>{e.title}</h3>
                            {e.details && <p>{e.details}</p>}
                            <small>
                              {timeLabel(e.at)}
                              {e.by ? ` · ${e.by}` : ""}
                            </small>
                          </div>
                        </li>
                        </Fragment>
                      );
                    })}
                  </ol>
                </>
              ) : (
                <div className="empty-state">
                  <Clock3 size={24} />
                  <h3>لسه مفيش تعاملات مسجلة</h3>
                  <p>تظهر هنا التعاملات المسجلة حسب صلاحياتك.</p>
                </div>
              ))}
            {tab === "followups" &&
              (leadFollowUps.length ? (
                leadFollowUps.map((f) => (
                  <article className="profile-record" key={f.id}>
                    <span className="status-pill">
                      {
                        {
                          due: "اليوم",
                          overdue: "متأخرة",
                          upcoming: "قادمة",
                          completed: "مكتملة",
                          cancelled: "ملغاة",
                        }[followUpStatus(f)]
                      }
                    </span>
                    <h3>{f.reason}</h3>
                    <p>
                      {f.scheduledAt.replace("T", " ")} · {f.assignedAgentName}
                    </p>
                    {f.outcomeResult && <p>النتيجة: {f.outcomeResult}</p>}
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <h3>مفيش متابعة مسجلة</h3>
                  {allowed("followup") && (
                    <button
                      className="btn-secondary"
                      onClick={() => show("followup")}
                    >
                      تحديد أول متابعة
                    </button>
                  )}
                </div>
              ))}
            {tab === "visits" &&
              (leadVisits.length ? (
                leadVisits.map((v) => (
                  <article className="profile-record" key={v.id}>
                    <small>
                      {v.date} · {v.time}
                    </small>
                    <h3>{v.reason}</h3>
                    <p>{v.outcome}</p>
                    <p>{v.notes}</p>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <h3>مفيش زيارات مسجلة</h3>
                  {allowed("visit") && (
                    <button
                      className="btn-secondary"
                      onClick={() => show("visit")}
                    >
                      تسجيل زيارة
                    </button>
                  )}
                </div>
              ))}
            {tab === "bookings" &&
              (leadBookings.length ? (
                leadBookings.map((b) => (
                  <article className="profile-record" key={b.id}>
                    <span className="status-pill">
                      {b.bookingStatus === "cancelled" ? "ملغى" : "تم الشراء"}
                    </span>
                    <h3>{b.courseName}</h3>
                    <p>
                      {formatMoney(b.amount)} ج.م · {b.bookingDate}
                    </p>
                    {departmentIds.filter((id) => bookingSplit(b)[id] > 0)
                      .length > 1 && (
                      <p>
                        {departmentIds
                          .filter((id) => bookingSplit(b)[id] > 0)
                          .map(
                            (id) =>
                              `${departmentNames[id]}: ${formatMoney(bookingSplit(b)[id])}`,
                          )
                          .join(" · ")}
                      </p>
                    )}
                    <p>{b.notes}</p>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <h3>مفيش مشتريات مسجلة</h3>
                  {allowed("booking") && (
                    <button
                      className="btn-secondary btn-buy"
                      onClick={() => show("booking")}
                    >
                      تسجيل شراء
                    </button>
                  )}
                </div>
              ))}
            {tab === "reviews" &&
              (leadReviews.length ? (
                leadReviews.map((r) => <ReviewCard key={r.id} request={r} />)
              ) : (
                <div className="empty-state">
                  <h3>لسه ما اتطلبش تقييم من العميل</h3>
                  <p>اضغط «طلب تقييم» من الأزرار فوق، وهيوصله لينك على واتساب عن زيارته أو شرائه.</p>
                </div>
              ))}
          </div>
        </div>
        <div className="profile-footer">
          <span>
            <span className="local-data-dot" /> بيانات الجهاز الحالي · المزامنة
            غير مؤكدة
          </span>
          <button className="btn-text" onClick={onClose}>
            رجوع للعملاء
            <ArrowRight size={14} />
          </button>
        </div>
        {outcomeOpen && (
          <PurchaseOutcomeDialog
            lead={lead}
            agentId={
              lead.assignedAgentId ||
              (isSales(effectiveUser) ? effectiveUser.id : "")
            }
            canBook={allowed("booking")}
            onBought={() => {
              setOutcomeOpen(false);
              show("booking");
            }}
            onClose={() => setOutcomeOpen(false)}
          />
        )}
        <CustomerRatingModal
          lead={lead}
          isOpen={rating}
          onClose={() => setRating(false)}
        />
      </div>
    </div>
  );
}
