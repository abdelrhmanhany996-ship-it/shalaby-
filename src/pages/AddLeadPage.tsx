import { PageGuide } from "../components/common/PageGuide";
import { BrokerSearch } from "../components/common/BrokerSearch";
import { CustomerRatingModal } from "../components/common/CustomerRatingModal";
import {
  canCreateCustomer,
  branchAgents,
  defaultAgent,
  canAssignCustomers,
  canManageCatalog,
  canContactCustomer,
  canRequestReview,
  canScheduleFollowUp,
} from "../lib/access";
import { purchaseFromItems } from "../lib/purchases";
import { OutcomeSection, emptyOutcome, outcomeError, type OutcomeState } from "../components/common/OutcomeSection";
import { InterestPicker, interestNames } from "../components/common/InterestPicker";
import { NameWithTitle } from "../components/common/NameWithTitle";
import { hasPermission } from "../lib/permissions";
import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Plus,
  CheckCircle2,
  MessageCircle,
  UserRound,
  FileText,
  ShoppingBag,
  SlidersHorizontal,
  ArrowUpLeft,
  X,
} from "lucide-react";
import { useCRM } from "../context/CRMContext";
import {
  departmentNames,
  sourceNames,
  canSeeBranch,
  isManagement,
  phoneNumber,
  today,
  formatMoney,
} from "../lib/presentation";
import type {
  Lead,
  Department,
  LeadSource,
  InvoiceLineItem,
  PurchaseInvoice,
} from "../types/crm";
import type { LeadQuickAction } from "../components/common/LeadDetailsModal";

interface Props {
  onSuccessNavigate: (leadId?: string) => void;
  onOpenExistingLead: (lead: Lead, action?: LeadQuickAction) => void;
}
export function AddLeadPage({ onSuccessNavigate, onOpenExistingLead }: Props) {
  const {
    effectiveUser,
    branches,
    users,
    brokers,
    purchaseCategories,
    addLead,
    addBroker,
    addBooking,
    addNotBoughtRecord,
    findDuplicateLeadsByPhone,
  } = useCRM();
  const availableBranches = branches.filter(
    (b) => b.active && canSeeBranch(effectiveUser, b.id, branches),
  );
  const initialBranch =
    effectiveUser.branchId || availableBranches[0]?.id || "";
  const [branchId, setBranchId] = useState(initialBranch);
  const agents = branchAgents(users, branchId);
  const [agentId, setAgentId] = useState(defaultAgent(users, effectiveUser, initialBranch));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interests, setInterests] = useState<Department[]>(["decor"]);
  const department = interests[0];
  const [source, setSource] = useState<LeadSource>("walk_in");
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [brokerMode, setBrokerMode] = useState<"none" | "existing" | "new">(
    "none",
  );
  const [brokerId, setBrokerId] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [brokerPhone, setBrokerPhone] = useState("");
  const [outcome, setOutcome] = useState<OutcomeState>(emptyOutcome);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Lead | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const duplicates =
    phone.replace(/\D/g, "").length >= 10
      ? findDuplicateLeadsByPhone(phone)
      : [];
  const total = outcome.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const selectedAgent = users.find((u) => u.id === agentId);
  const changeBranch = (id: string) => {
    setBranchId(id);
    setAgentId(defaultAgent(users, effectiveUser, id));
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!canCreateCustomer(effectiveUser)) {
      setError("حسابك مش مسموحله يضيف عملاء. راجع مديرك لو محتاج الصلاحية.");
      return;
    }
    if (!name.trim() || !/^\+?[\d\s()-]{10,18}$/.test(phone.trim())) {
      setError("اكتب اسم العميل ورقم هاتف صحيح من 10 إلى 15 رقم.");
      return;
    }
    if (duplicates.length) {
      setError("الرقم مسجل بالفعل. افتح ملف العميل الموجود لتكمل التعامل.");
      return;
    }
    if (!sameWhatsapp && !/^\+?[\d\s()-]{10,18}$/.test(whatsapp.trim())) {
      setError("راجع رقم الواتساب، أو اختَر استخدام رقم الهاتف نفسه.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("راجع صيغة البريد الإلكتروني أو سيبه فاضي.");
      return;
    }
    if (!branchId || !agentId) {
      setError("حدد الفرع والموظف المسؤول قبل الحفظ.");
      return;
    }
    if (brokerMode === "existing" && !brokerId) {
      setError("اختَر الوسيط، أو اختَر بدون وسيط.");
      return;
    }
    if (
      brokerMode === "new" &&
      (!brokerName.trim() || !/^\+?[\d\s()-]{10,18}$/.test(brokerPhone.trim()))
    ) {
      setError("بيانات الوسيط تحتاج اسم ورقم هاتف صحيح.");
      return;
    }
    const outErr = outcomeError(outcome, false);
    if (outErr || (outcome.result === "bought" && !hasPermission(effectiveUser, "bookings.create"))) {
      setError(outErr || "حسابك مش مسموحله يسجل مشتريات.");
      return;
    }
    try {
    let linkedBroker =
      brokerMode === "existing"
        ? brokers.find((b) => b.id === brokerId)
        : undefined;
    if (brokerMode === "new" && canCreateCustomer(effectiveUser))
      linkedBroker = addBroker({
        name: brokerName.trim(),
        phone: brokerPhone.trim(),
        type: "individual",
        active: true,
        notes: "",
      });
    const lead = addLead({
      name: name.trim(),
      phone: phone.trim(),
      whatsappPhone: sameWhatsapp ? phone.trim() : whatsapp.trim(),
      isSameWhatsApp: sameWhatsapp,
      email: email.trim() || undefined,
      source: linkedBroker ? "referral" : source,
      customerCategory: "individual",
      companyNameRelationship: linkedBroker
        ? `الوسيط المرتبط: ${linkedBroker.name}`
        : undefined,
      brokerId: linkedBroker?.id,
      brokerName: linkedBroker?.name,
      branchId,
      assignedAgentId: agentId,
      status: "new",
      classification: "B",
      department,
      interests,
      departmentName: interestNames(interests),
      notes: notes.trim(),
    });
    if (outcome.result === "bought" && hasPermission(effectiveUser, "bookings.create")) {
      const purchase = purchaseFromItems(outcome.items);
      addBooking({
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        branchId,
        branchName: lead.branchName,
        agentId,
        ...purchase,
        bookingDate: today(),
        bookingStatus: "confirmed",
        source: lead.source,
        notes: "",
      });
    } else if (outcome.result === "not_yet") {
      addNotBoughtRecord({
        leadId: lead.id,
        leadName: lead.name,
        branchId,
        agentId,
        reasons: outcome.reasons,
        otherText: outcome.reasons.includes("other") ? outcome.otherText.trim() : undefined,
        note: outcome.note.trim() || undefined,
      });
    }
    setCreated(lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إضافة العميل.");
    }
  };
  if (created)
    return (
      <div className="form-page">
        <section className="panel success-card" role="status">
          <CheckCircle2 size={39} strokeWidth={1.4} />
          <span className="eyebrow">بداية علاقة جديدة</span>
          <h1>اتضاف {created.name}.</h1>
          <p>الخطوة الجاية: تواصل مع العميل أو حدد أول متابعة.</p>
          {canRequestReview(effectiveUser, created) && (
            <div className="review-offer">
              <span>
                <strong>تبعت للعميل لينك تقييم؟</strong>
                <small>اختياري: رسالة واتساب جاهزة، وانت اللي بتدوس إرسال.</small>
              </span>
              <button className="btn-secondary" onClick={() => setReviewOpen(true)}>
                <MessageCircle size={16} />
                ابعت لينك التقييم
              </button>
            </div>
          )}
          <CustomerRatingModal
            lead={created}
            isOpen={reviewOpen}
            onClose={() => setReviewOpen(false)}
            subject={{ kind: "general", label: "تجربتك مع شلبي" }}
          />
          <div className="success-actions">
            {canScheduleFollowUp(effectiveUser, created) && (
              <button
                className="btn-primary"
                onClick={() => onOpenExistingLead(created, "followup")}
              >
                <Plus size={16} />
                تحديد متابعة
              </button>
            )}
            <button
              className="btn-secondary"
              onClick={() => onOpenExistingLead(created)}
            >
              فتح ملف العميل
              <ArrowUpLeft size={16} />
            </button>
            {canContactCustomer(effectiveUser, created, []) && (
              <a
                className="btn-secondary"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/${phoneNumber(created.whatsappPhone || created.phone)}?text=${encodeURIComponent(`أهلاً أ/ ${created.name}، معاك فريق شلبي. يسعدنا نساعدك في طلبك.`)}`}
              >
                <MessageCircle size={16} />
                رسالة ترحيب
              </a>
            )}
          </div>
          <p className="quiet-note">
            البيانات محفوظة على هذا الجهاز. لم يتم تأكيد المزامنة مع باقي
            الأجهزة.
          </p>
          <button className="btn-text" onClick={() => onSuccessNavigate()}>
            العودة للعملاء
            <ArrowRight size={15} />
          </button>
        </section>
      </div>
    );
  if (!canCreateCustomer(effectiveUser)) return null;
  return (
    <div className="form-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">العملاء / تسجيل جديد</span>
          <h1>نبدأ بالأساسيات.</h1>
          <p>الاسم ورقم الهاتف مطلوبان. التفاصيل الإضافية تقدر تكملها بعدين.</p>
        </div>
        <button className="btn-text" onClick={() => onSuccessNavigate()}>
          <ArrowRight size={15} />
          رجوع
        </button>
      </div>
      <PageGuide id="addCustomer" />
      {availableBranches.length === 0 && (
        <p className="notice warning" role="alert">
          لسه مفيش أي فرع مسجّل. أضف الفرع الأول من «إدارة المؤسسة ← الهيكل الإداري»، وأضف موظفين من «الموظفون»، وبعدها سجّل عملاءك.
        </p>
      )}
      <form className="panel" onSubmit={submit} noValidate>
        <section className="form-section">
          <div className="section-title">
            <span className="section-number">01</span>
            <div>
              <h2>بيانات العميل</h2>
              <p>عشان نعرفه ونقدر نتواصل معاه.</p>
            </div>
          </div>
          <div className="field-grid">
            <NameWithTitle value={name} onChange={setName} required />
            <label className="field">
              <span>
                رقم الهاتف <em>مطلوب</em>
              </span>
              <input
                name="customerPhone"
                autoComplete="off"
                dir="ltr"
                type="tel"
                required
                inputMode="tel"
                placeholder="01xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            {!!duplicates.length && (
              <div className="notice warning full-width" role="status">
                الرقم ده موجود عندنا باسم {duplicates[0].name}.
                <button
                  type="button"
                  onClick={() => onOpenExistingLead(duplicates[0])}
                >
                  فتح الملف الموجود
                  <ArrowUpLeft size={13} />
                </button>
              </div>
            )}
            <InterestPicker value={interests} onChange={setInterests} />
            <label className="field">
              <span>عرفنا منين؟</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
              >
                {Object.entries(sourceNames).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <details className="optional-section">
          <summary>
            <UserRound size={18} />
            <span>الفرع والموظف المسؤول</span>
            <ChevronDown size={16} />
          </summary>
          <div className="optional-content">
            <p className="quiet-note" style={{ padding: "0 0 18px" }}>
              محدد تلقائيًا:{" "}
              {branches.find((b) => b.id === branchId)?.name || "لم يُحدد"} ·{" "}
              {selectedAgent?.name || "لم يُحدد"}
            </p>
            <div className="field-grid">
              <label className="field">
                <span>الفرع</span>
                <select
                  aria-label="فرع العميل"
                  value={branchId}
                  onChange={(e) => changeBranch(e.target.value)}
                >
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>الموظف المسؤول</span>
                <select
                  aria-label="الموظف المسؤول"
                  value={agentId}
                  disabled={!canAssignCustomers(effectiveUser)}
                  onChange={(e) => setAgentId(e.target.value)}
                >
                  {[
                    ...agents,
                    ...(agents.some((u) => u.id === effectiveUser.id)
                      ? []
                      : [effectiveUser]),
                  ].map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </details>
        <details className="optional-section">
          <summary>
            <SlidersHorizontal size={18} />
            <span>
              تفاصيل إضافية <em className="optional-tag">اختياري</em>
            </span>
            <ChevronDown size={16} />
          </summary>
          <div className="optional-content">
            <div className="field-grid">
              <label className="checkbox-line full-width">
                <input
                  type="checkbox"
                  checked={sameWhatsapp}
                  onChange={(e) => setSameWhatsapp(e.target.checked)}
                />
                رقم الواتساب هو نفس رقم الهاتف
              </label>
              {!sameWhatsapp && (
                <label className="field">
                  <span>رقم الواتساب</span>
                  <input
                    type="tel"
                    dir="ltr"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </label>
              )}
              <label className="field">
                <span>
                  البريد الإلكتروني <em>اختياري</em>
                </span>
                <input
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field full-width">
                <span>
                  ملاحظات <em>اختياري</em>
                </span>
                <textarea
                  rows={3}
                  placeholder="تفاصيل تساعد زميلك يكمل من مكانك…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>
          </div>
        </details>
        <details className="optional-section">
          <summary>
            <UserRound size={18} />
            <span>
              ربط وسيط أو جهة ترشيح <em className="optional-tag">اختياري</em>
            </span>
            <ChevronDown size={16} />
          </summary>
          <div className="optional-content">
            {brokerMode !== "new" ? (
              <BrokerSearch
                label="الوسيط أو جهة الترشيح"
                brokers={brokers}
                value={brokerMode === "existing" ? brokerId : ""}
                onChange={(id) => {
                  setBrokerId(id);
                  setBrokerMode(id ? "existing" : "none");
                }}
                onCreate={
                  canCreateCustomer(effectiveUser)
                    ? (name) => {
                        setBrokerName(name);
                        setBrokerId("");
                        setBrokerMode("new");
                      }
                    : undefined
                }
              />
            ) : (
              <button type="button" className="btn-text" onClick={() => setBrokerMode("none")}>
                ← دوّر في الوسطاء المسجلين بدل كده
              </button>
            )}
            {brokerMode === "new" && (
              <div className="field-grid" style={{ marginTop: 12 }}>
                <label className="field">
                  <span>
                    اسم الوسيط <em>مطلوب عند الإضافة</em>
                  </span>
                  <input
                    value={brokerName}
                    onChange={(e) => setBrokerName(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>
                    رقم هاتف الوسيط <em>مطلوب عند الإضافة</em>
                  </span>
                  <input
                    type="tel"
                    dir="ltr"
                    value={brokerPhone}
                    onChange={(e) => setBrokerPhone(e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>
        </details>
        <details className="optional-section" open={!!outcome.result || undefined}>
          <summary>
            <ShoppingBag size={18} />
            <span>
              نتيجة التعامل <em className="optional-tag">اختياري</em>
            </span>
            <ChevronDown size={16} />
          </summary>
          <div className="optional-content">
            <p className="quiet-note" style={{ padding: "0 0 14px" }}>
              لو العميل اشترى أو قال ليه لسه، سجّلها دلوقتي. وسيبها فاضية لو لسه مفيش نتيجة.
            </p>
            <OutcomeSection value={outcome} onChange={setOutcome} />
          </div>
        </details>
        {error && (
          <div
            className="notice warning"
            style={{ margin: "0 20px 20px" }}
            role="alert"
          >
            {error}
          </div>
        )}
        <div className="form-actions">
          <p>
            هنفتح لك الخطوة التالية بعد التسجيل. التفاصيل الاختيارية مش هتعطّل
            حفظ العميل.
          </p>
          <div>
            <button
              className="btn-text"
              type="button"
              onClick={() => onSuccessNavigate()}
            >
              إلغاء
            </button>
            <button type="submit" className="btn-primary">
              <Plus size={16} />
              حفظ العميل
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
