import { CustomerBrief } from "../components/common/CustomerBrief";
import { REFERRAL_MIN_STARS, isReferralPhone } from "../lib/referrals";
import { canCompleteFollowUp, canAccessPage, isSales, worksOwnCustomers } from "../lib/access";
import { hasPermission } from "../lib/permissions";
import { useState } from "react";
import {
  Phone,
  MessageCircle,
  CalendarDays,
  ArrowUpLeft,
  Check,
  X,
  Clock3,
  Star,
} from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { followUpStatus, phoneNumber } from "../lib/presentation";
import type { FollowUp } from "../types/crm";
import { useDialog } from "../components/common/useDialog";
import { milestoneLabel } from "../lib/postSale";
import { FilterBar, inDateRange } from "../components/common/FilterBar";
import { ReviewCard } from "../components/reviews/ReviewCard";
import { reviewPhase, reminderMessage, reviewLink, whatsappUrl } from "../lib/reviews";
import { reminderTasks, type ReminderTask } from "../lib/reminders";
import { PageGuide } from "../components/common/PageGuide";
import { PostVisitReview } from "../components/common/PostVisitReview";
import { SuggestionsTab } from "../components/followups/SuggestionsTab";
import { lastOutcome } from "../lib/purchases";
import { VoiceNoteField } from "../components/common/VoiceNoteField";
import type { LeadQuickAction } from "../components/common/LeadDetailsModal";
interface Props {
  onOpenLead: (id: string, action?: LeadQuickAction) => void;
  initialTab?: "due" | "overdue";
}
export function FollowUpsPage({ onOpenLead, initialTab = "due" }: Props) {
  const { effectiveUser, leads, branches, followUps, updateFollowUpResult, reviewRequests, addReferralLead, bookings, notBoughtRecords, visits, brokers, reminderDone, markReminderDone, markReviewReminderSent, aiSuggestions } =
    useCRM();
  // The one 48-hour nudge for review requests the customer has not answered.
  const tasks = reminderTasks({ visits, reviewRequests, leads, brokers, reminderDone }, effectiveUser.id);
  const [view, setView] = useState<"followups" | "reminders" | "suggestions">("followups");
  const [origin, setOrigin] = useState<"all" | "manual" | "auto" | "zaki">("all");
  const [confirming, setConfirming] = useState("");
  const [toast, setToast] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [selected, setSelected] = useState<FollowUp | null>(null);
  const [result, setResult] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [referralNote, setReferralNote] = useState("");
  const [referralName, setReferralName] = useState("");
  const [referralPhone, setReferralPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [q, setQ] = useState("");
  const [fBranch, setFBranch] = useState("all");
  const [fAgent, setFAgent] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const isPostSale = (f: FollowUp) => f.category === "post_sale";
  const originOf = (f: FollowUp): "manual" | "auto" | "zaki" => (f.origin === "zaki" ? "zaki" : f.origin === "auto" || isPostSale(f) ? "auto" : "manual");
  const visible = followUps.filter(
    (f) =>
      (origin === "all" || originOf(f) === origin) &&
      (!q.trim() || f.leadName.includes(q.trim()) || (f.leadPhone || "").includes(q.trim()) || (f.reason || "").includes(q.trim())) &&
      (fBranch === "all" || f.branchId === fBranch) &&
      (fAgent === "all" || f.assignedAgentId === fAgent) &&
      inDateRange(f.scheduledAt, fFrom, fTo),
  );
  const uniq = (l: string[]) => [...new Set(l.filter(Boolean))];
  const rated = followUps.filter(
    (f) => isPostSale(f) && f.status === "completed" && f.satisfactionRating,
  );
  const avgRating = rated.length
    ? rated.reduce((s, f) => s + (f.satisfactionRating || 0), 0) / rated.length
    : 0;
  const ref = useDialog(!!selected, () => setSelected(null));
  const complete = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selected ||
      !canCompleteFollowUp(effectiveUser, selected) ||
      !result.trim() ||
      (hasNext && !nextDate) ||
      (isPostSale(selected) && !rating)
    )
      return;
    const hasReferral = isPostSale(selected) && rating >= REFERRAL_MIN_STARS && !!(referralName.trim() || referralPhone.trim());
    if (hasReferral && (!referralName.trim() || !isReferralPhone(referralPhone))) {
      setFormError("اكتب اسم المرشَّح ورقم موبايله بشكل صحيح، أو سيب الخانتين فاضيين.");
      return;
    }
    setFormError("");
    updateFollowUpResult(
      selected.id,
      "completed",
      result.trim(),
      hasNext ? nextDate : undefined,
      isPostSale(selected)
        ? {
            satisfactionRating: rating,
            satisfactionComment: ratingComment.trim() || undefined,
            referralNote: [referralName.trim(), referralPhone.trim(), referralNote.trim()].filter(Boolean).join(" · ") || undefined,
          }
        : undefined,
    );
    if (hasReferral) {
      try {
        addReferralLead({ fromLeadId: selected.leadId, name: referralName, phone: referralPhone, followUpId: selected.id });
      } catch {
        /* the call result is already saved; the salesperson can register the prospect from the customer file */
      }
    }
    setSelected(null);
    setRating(0);
    setRatingComment("");
    setReferralNote("");
    setReferralName("");
    setReferralPhone("");
    setResult("");
    setNextDate("");
    setHasNext(false);
  };
  const byStatus = (st: string) => visible.filter((f) => followUpStatus(f) === st).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const overdueList = byStatus("overdue");
  const todayList = byStatus("due");
  const upcomingList = byStatus("upcoming");
  const finished = [...byStatus("completed"), ...byStatus("cancelled")];
  const originLabel: Record<string, string> = { manual: "جدولها السيلز", auto: "تلقائية من السيستم", zaki: "اقتراح من زكي" };
  const flash = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 5000);
  };

  const card = (f: FollowUp, section: "overdue" | "due" | "upcoming" | "done") => (
    <article className={`followup-card ${section === "overdue" ? "is-overdue" : section === "due" ? "is-today" : ""}`} key={f.id}>
      <div className="followup-heading">
        {canAccessPage(effectiveUser, "clients") && f.leadId && (
          <button onClick={() => onOpenLead(f.leadId)}>
            <h2>{f.leadName}</h2>
          </button>
        )}
        <span className="followup-pills">
          <span className="status-pill">{originLabel[originOf(f)]}</span>
          <span className={`status-pill ${section === "overdue" ? "is-new" : section === "done" ? "is-success" : section === "due" ? "is-warning" : ""}`}>
            {section === "overdue" ? "متأخرة" : section === "due" ? "النهارده" : section === "upcoming" ? "قادمة" : followUpStatus(f) === "cancelled" ? "ملغاة" : "تمت"}
          </span>
        </span>
      </div>
      {isPostSale(f) && <span className="status-pill is-success">بعد البيع · {milestoneLabel(f.milestone)}</span>}
      <p>{f.reason}</p>
      <div className="followup-meta">
        <span>
          <CalendarDays size={14} />
          {f.scheduledAt.replace("T", " ").slice(0, 16)}
        </span>
        <span>{f.assignedAgentName}</span>
        <span dir="ltr">{f.leadPhone}</span>
      </div>
      {f.outcomeResult && <p>النتيجة: {f.outcomeResult}</p>}
      {f.satisfactionRating && (
        <p>
          رضا العميل: {"★".repeat(f.satisfactionRating)}
          {"☆".repeat(5 - f.satisfactionRating)}
          {f.satisfactionComment ? ` — ${f.satisfactionComment}` : ""}
        </p>
      )}
      {f.referralNote && <p>ترشيحات: {f.referralNote}</p>}
      <div className="followup-actions">
        {canCompleteFollowUp(effectiveUser, f) && section !== "done" && (
          <button
            className="btn-primary"
            onClick={() => {
              setSelected(f);
              setRating(0);
              setRatingComment("");
              setReferralNote("");
              setResult("");
              setHasNext(false);
              setNextDate("");
            }}
          >
            <Check size={15} />
            تسجيل النتيجة
          </button>
        )}
        {canAccessPage(effectiveUser, "clients") && f.category !== "post_sale" && f.leadId && (() => {
          const last = lastOutcome(f.leadId, bookings, notBoughtRecords);
          return last.kind === "bought" ? (
            <span className="last-bought" title={last.what}>
              آخر مرة اشترى: <bdi>{last.date}</bdi> · <bdi>{last.amount.toLocaleString("en-US")}</bdi> ج.م
            </span>
          ) : (
            <button className="btn-secondary" onClick={() => onOpenLead(f.leadId, "outcome")}>
              اشترى ولا لسه؟
            </button>
          );
        })()}
        {canAccessPage(effectiveUser, "clients") && f.leadId && (
          <button className="btn-secondary" onClick={() => onOpenLead(f.leadId)}>
            ملف العميل
            <ArrowUpLeft size={14} />
          </button>
        )}
        {f.assignedAgentId === effectiveUser.id && hasPermission(effectiveUser, "customers.contact") && (
          <a className="btn-secondary" href={`tel:${phoneNumber(f.leadPhone)}`}>
            <Phone size={14} />
            اتصال
          </a>
        )}
        {f.assignedAgentId === effectiveUser.id && hasPermission(effectiveUser, "customers.contact") && (
          <a className="btn-secondary" href={`https://wa.me/${phoneNumber(leads.find((l) => l.id === f.leadId)?.whatsappPhone || f.leadPhone)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={14} />
            واتساب
          </a>
        )}
      </div>
    </article>
  );

  const section = (title: string, list: FollowUp[], kindOf: "overdue" | "due" | "upcoming", note?: string) =>
    list.length > 0 && (
      <div className={`followup-section is-${kindOf}`}>
        <h3 className="followup-section-title">
          {title} <span>{list.length}</span>
        </h3>
        {note && <p className="table-secondary">{note}</p>}
        {list.map((f) => card(f, kindOf))}
      </div>
    );

  const reminderCard = (t: ReminderTask) => {
    const review = t.reviewId ? reviewRequests.find((r) => r.id === t.reviewId) : undefined;
    const lead = t.leadId ? leads.find((l) => l.id === t.leadId) : undefined;
    const broker = t.brokerId ? brokers.find((b) => b.id === t.brokerId) : undefined;
    const visit = t.visitId ? visits.find((v) => v.id === t.visitId) : undefined;
    return (
      <article className={`followup-card ${t.level === "overdue" ? "is-overdue" : "is-today"}`} key={t.id}>
        <div className="followup-heading">
          <h2>{t.title}</h2>
          <span className={`status-pill ${t.level === "overdue" ? "is-new" : "is-warning"}`}>{t.level === "overdue" ? "متأخر" : "النهارده"}</span>
        </div>
        <p>{t.detail}</p>
        <div className="followup-actions">
          {t.kind === "review_send" && visit && (
            <PostVisitReview
              compact
              target={{
                visitId: visit.id,
                label: `زيارة ${visit.branchName || "الفرع"} يوم ${visit.date}`,
                client: t.id.endsWith(":client") && t.leadId ? { leadId: t.leadId, name: visit.visitorName, phone: visit.phone } : undefined,
                broker: t.id.endsWith(":broker") && t.brokerId ? { brokerId: t.brokerId } : undefined,
              }}
            />
          )}
          {t.kind === "review_nudge" && review && (
            <button
              className="btn-primary"
              onClick={() => {
                const to = broker?.phone || lead?.whatsappPhone || lead?.phone || "";
                window.open(whatsappUrl(to, reminderMessage({ name: review.leadName }, reviewLink(review.id))), "_blank", "noopener");
                markReviewReminderSent(review.id);
                flash("اتفتح واتساب بالتذكير واتسجّل إنك بعتّه.");
              }}
            >
              <MessageCircle size={15} />
              ابعت التذكير
            </button>
          )}
          {t.kind === "referral_register" && review?.response?.referral && lead && (
            <button
              className="btn-primary"
              onClick={() => {
                try {
                  const res = addReferralLead({ fromLeadId: lead.id, name: review.response!.referral!.name, phone: review.response!.referral!.phone, reviewId: review.id });
                  flash(res.created ? "اتسجّل كعميل محتمل واتجدولت متابعة بعد يومين." : `الرقم ده مسجّل بالفعل باسم ${res.lead.name}.`);
                } catch (e) {
                  flash(e instanceof Error ? e.message : "تعذر تسجيل الترشيح.");
                }
              }}
            >
              سجّله كعميل محتمل
            </button>
          )}
          {confirming === t.id ? (
            <span className="confirm-inline" role="alert">
              خلّصتها فعلًا؟
              <button
                className="btn-primary"
                onClick={() => {
                  markReminderDone(t.id, t.branchId);
                  setConfirming("");
                  flash("تمام ✓ اتسجّلت كمنجَزة ومش هترجع تاني.");
                }}
              >
                أيوه، تمت
              </button>
              <button className="btn-text" onClick={() => setConfirming("")}>
                لأ
              </button>
            </span>
          ) : (
            <button className="btn-secondary btn-buy" onClick={() => setConfirming(t.id)}>
              <Check size={15} />
              تمت
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">كل تواصل له خطوة جاية</span>
          <h1>المتابعات</h1>
          <p>
            {worksOwnCustomers(effectiveUser)
              ? "ابدأ بالمتأخر، وبعدين النهارده. سجّل نتيجة كل تواصل."
              : "راجع التأخير والموظف المسؤول عن كل متابعة داخل نطاقك."}
          </p>
        </div>
      </div>
      {toast && (
        <p className="notice" role="status">
          {toast}
        </p>
      )}
      <PageGuide id="followups" />
      <div className="tab-filter" role="group" aria-label="أقسام المتابعات" style={{ marginBottom: 12 }}>
        <button aria-pressed={view === "followups"} onClick={() => setView("followups")}>
          المتابعات
          {overdueList.length > 0 && <span className="tab-alert">{overdueList.length} متأخرة</span>}
        </button>
        <button aria-pressed={view === "reminders"} onClick={() => setView("reminders")}>
          تذكيرات <span style={{ opacity: 0.65, marginInlineStart: 5 }}>{tasks.length}</span>
        </button>
        <button aria-pressed={view === "suggestions"} onClick={() => setView("suggestions")}>
          اقتراحات زكي
          {aiSuggestions.filter((x) => x.status === "pending" && x.agentId === effectiveUser.id).length > 0 && (
            <span className="tab-alert" style={{ background: "var(--wait)", color: "#3b2600" }}>
              {aiSuggestions.filter((x) => x.status === "pending" && x.agentId === effectiveUser.id).length} جديد
            </span>
          )}
        </button>
      </div>

      {view === "reminders" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>تذكيرات ({tasks.length})</h2>
              <p>حاجات المفروض تعملها: طلبات التقييم، تذكير العملاء، وترشيحات لسه ما اتسجلتش. بتختفي لوحدها لما تتعمل، أو دوس «تمت».</p>
            </div>
          </div>
          {tasks.length ? tasks.map(reminderCard) : (
            <div className="empty-state">
              <Check size={28} strokeWidth={1.3} />
              <h3>مفيش تذكيرات عليك دلوقتي</h3>
              <p>كل حاجة اتعملت. ✓</p>
            </div>
          )}
        </section>
      )}

      {view === "suggestions" && <SuggestionsTab onOpenLead={onOpenLead} />}

      {view === "followups" && (
        <section className="panel">
          <FilterBar
            search={{ value: q, onChange: setQ, placeholder: "ابحث باسم العميل أو رقمه أو سبب المتابعة…" }}
            selects={[
              { id: "branch", label: "الفرع", value: fBranch, onChange: setFBranch, allLabel: "كل الفروع", primary: true, options: uniq(followUps.map((f) => f.branchId)).map((id) => ({ value: id, label: branches.find((b) => b.id === id)?.name || id })) },
              { id: "agent", label: "الموظف", value: fAgent, onChange: setFAgent, allLabel: "كل الموظفين", primary: !worksOwnCustomers(effectiveUser), options: uniq(followUps.map((f) => f.assignedAgentId)).map((id) => ({ value: id, label: followUps.find((f) => f.assignedAgentId === id)?.assignedAgentName || id })) },
            ]}
            dates={{ from: fFrom, to: fTo, onFrom: setFFrom, onTo: setFTo, label: "موعد المتابعة" }}
            onReset={() => {
              setQ("");
              setFBranch("all");
              setFAgent("all");
              setFFrom("");
              setFTo("");
            }}
          />
          <div className="tab-filter" role="group" aria-label="مين جدولها" style={{ marginBottom: 10 }}>
            {(
              [
                ["all", "الكل"],
                ["manual", "جدولها السيلز بنفسه"],
                ["auto", "تلقائية من السيستم"],
                ["zaki", "من اقتراحات زكي"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} aria-pressed={origin === id} onClick={() => setOrigin(id)}>
                {label}
              </button>
            ))}
          </div>
          {rated.length > 0 && origin !== "manual" && (
            <p className="table-secondary" style={{ marginBottom: 10 }}>
              متوسط رضا العملاء بعد التسليم: <strong>{avgRating.toFixed(1)}</strong> / 5 من {rated.length} تقييم
            </p>
          )}
          {!overdueList.length && !todayList.length && !upcomingList.length && (
            <div className="empty-state">
              <Clock3 size={28} strokeWidth={1.3} />
              <h3>مفيش متابعات مفتوحة</h3>
              <p>المتابعات المتاحة حسب صلاحياتك تظهر هنا.</p>
            </div>
          )}
          {section("متأخرة: ابدأ بيها", overdueList, "overdue", "عدّى موعدها. كلّم العميل أو أجّل بسبب مكتوب.")}
          {section("النهارده", todayList, "due")}
          {section("قادمة", upcomingList, "upcoming")}
          {finished.length > 0 && (
            <div className="followup-section">
              <button className="btn-text" onClick={() => setShowDone(!showDone)} aria-expanded={showDone}>
                {showDone ? "إخفاء" : "عرض"} المكتملة والملغاة ({finished.length})
              </button>
              {showDone && finished.map((f) => card(f, "done"))}
            </div>
          )}
        </section>
      )}
      {selected && (
        <div className="dialog-backdrop">
          <div
            className="panel"
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="followup-result-title"
            style={{ width: "min(490px,100%)", padding: 27 }}
          >
            <div className="page-heading">
              <div>
                <h2
                  id="followup-result-title"
                  style={{ fontSize: 20, fontWeight: 600 }}
                >
                  نتيجة التواصل
                </h2>
                <p>{selected.leadName}</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelected(null)}
                aria-label="إغلاق تسجيل النتيجة"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={complete}>
              {(() => {
                const l = leads.find((x) => x.id === selected.leadId);
                return l ? <CustomerBrief lead={l} compact /> : null;
              })()}
              <label className="field">
                <span>
                  إيه اللي حصل؟ <em>مطلوب</em>
                </span>
                <VoiceNoteField
                  rows={3}
                  required
                  value={result}
                  onChange={setResult}
                  placeholder="مثلاً: العميل طلب عرض سعر وهيرد يوم الأحد."
                />
              </label>
              {isPostSale(selected) && (
                <>
                  <div className="field">
                    <span>
                      رضا العميل عن الشغل <em>مطلوب</em>
                    </span>
                    <div
                      role="radiogroup"
                      aria-label="تقييم الرضا"
                      style={{ display: "flex", gap: 6 }}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          type="button"
                          key={n}
                          role="radio"
                          aria-checked={rating === n}
                          aria-label={`${n} من 5`}
                          onClick={() => setRating(n)}
                          className="icon-button"
                        >
                          <Star
                            size={20}
                            fill={n <= rating ? "#e9a82b" : "none"}
                            color={n <= rating ? "#e9a82b" : "currentColor"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="field">
                    <span>
                      ملاحظة العميل <em className="optional-tag">اختياري</em>
                    </span>
                    <textarea
                      rows={2}
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="إيه اللي عجبه أو ما عجبوش؟"
                    />
                  </label>
                  {rating >= REFERRAL_MIN_STARS ? (
                    <>
                  <div className="field">
                    <span>
                      حد من قرايبه أو معارفه محتاج؟{" "}
                      <em className="optional-tag">اختياري</em>
                    </span>
                    <div className="field-grid">
                      <input value={referralName} onChange={(e) => setReferralName(e.target.value)} placeholder="اسمه" />
                      <input dir="ltr" type="tel" inputMode="tel" value={referralPhone} onChange={(e) => setReferralPhone(e.target.value)} placeholder="01xxxxxxxxx" />
                    </div>
                    <p className="quiet-note">لو العميل سمح، هيتسجل كعميل محتمل وتتجدول متابعة بعد يومين.</p>
                  </div>
                  <label className="field">
                    <span>
                      ملاحظة عن احتياجه <em className="optional-tag">اختياري</em>
                    </span>
                    <textarea rows={2} value={referralNote} onChange={(e) => setReferralNote(e.target.value)} placeholder="محتاج إيه؟ (دهان شقة، تشطيب…)" />
                  </label>
                    </>
                  ) : (
                    <p className="quiet-note">الترشيحات بنسألها بس للعميل اللي قيّم 4 أو 5 نجوم. اللي مش راضي بنركّز على حل مشكلته الأول.</p>
                  )}
                </>
              )}
              {formError && <p className="notice warning" role="alert">{formError}</p>}
              <label className="checkbox-line" style={{ marginBlock: 20 }}>
                <input
                  type="checkbox"
                  checked={hasNext}
                  onChange={(e) => setHasNext(e.target.checked)}
                />
                تحديد متابعة تانية <em className="optional-tag">اختياري</em>
              </label>
              {hasNext && (
                <label className="field">
                  <span>الموعد القادم</span>
                  <input
                    type="date"
                    required
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                  />
                </label>
              )}
              <button
                className="btn-primary"
                type="submit"
                style={{ marginTop: 22 }}
              >
                حفظ النتيجة
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
