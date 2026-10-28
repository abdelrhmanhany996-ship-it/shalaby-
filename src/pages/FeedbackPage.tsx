import { PageGuide } from "../components/common/PageGuide";
import { useMemo, useState } from "react";
import { useCRM } from "../context/CRMContext";
import { ReviewCard } from "../components/reviews/ReviewCard";
import { EmployeeRatings } from "../components/reviews/EmployeeRatings";
import { hasReferral, pendingReferral } from "../lib/referrals";
import { FilterBar, inDateRange } from "../components/common/FilterBar";
import { averageRating, complaintState, isComplaint, isLateComplaint, resolutionHours, reviewPhase } from "../lib/reviews";

type Tab = "complaints" | "referrals" | "all" | "waiting";

/** Customer reviews and complaints inside the viewer's scope. */
export function FeedbackPage({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const { reviewRequests, reviewNotes, effectiveUser } = useCRM();
  const [tab, setTab] = useState<Tab>("complaints");
  const [q, setQ] = useState("");
  const [fBranch, setFBranch] = useState("all");
  const [fAgent, setFAgent] = useState("all");
  const [fRating, setFRating] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const manager = ["admin", "general_manager", "regional_manager", "branch_manager"].includes(effectiveUser.role);

  const data = useMemo(() => {
    const sorted = [...reviewRequests].sort((a, b) => (b.answeredAt || b.sentAt).localeCompare(a.answeredAt || a.sentAt));
    const complaints = sorted.filter(isComplaint);
    const open = complaints.filter((r) => complaintState(r, reviewNotes) !== "resolved");
    const waiting = sorted.filter((r) => r.status === "sent");
    const answered = sorted.filter((r) => r.status === "answered");
    const late = open.filter((r) => isLateComplaint(r, reviewNotes));
    const hours = complaints.map((r) => resolutionHours(r, reviewNotes)).filter((h): h is number => h !== null);
    const avgHours = hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : null;
    const referrals = sorted.filter(hasReferral);
    const newReferrals = referrals.filter(pendingReferral);
    return { sorted, complaints, open, late, avgHours, waiting, answered, referrals, newReferrals, avg: averageRating(sorted) };
  }, [reviewRequests, reviewNotes]);

  const dueReminders = data.waiting.filter((r) => reviewPhase(r) === "reminder_due").length;
  // Late complaints come first so they get picked up.
  const lateIds = new Set(data.late.map((r) => r.id));
  const base = tab === "referrals" ? data.referrals : tab === "complaints" ? [...data.complaints].sort((a, b) => Number(lateIds.has(b.id)) - Number(lateIds.has(a.id))) : tab === "waiting" ? data.waiting : data.sorted;
  const list = base.filter((r) => {
    const stars = r.response?.rating;
    return (
      (!q.trim() || r.leadName.includes(q.trim()) || r.subjectLabel.includes(q.trim()) || (r.response?.comment || "").includes(q.trim())) &&
      (fBranch === "all" || r.branchId === fBranch) &&
      (fAgent === "all" || r.agentId === fAgent) &&
      (fRating === "all" || (stars !== undefined && (fRating === "low" ? stars <= 2 : fRating === "mid" ? stars === 3 : stars >= 4))) &&
      inDateRange(r.answeredAt || r.sentAt, fFrom, fTo)
    );
  });
  const uniq = (l: string[]) => [...new Set(l.filter(Boolean))];
  const resetFilters = () => {
    setQ("");
    setFBranch("all");
    setFAgent("all");
    setFRating("all");
    setFFrom("");
    setFTo("");
  };
  const rate = reviewRequests.length ? Math.round((data.answered.length / reviewRequests.filter((r) => r.status !== "cancelled").length || 0) * 100) : 0;

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">صوت العميل</span>
          <h1>التقييمات والشكاوى</h1>
          <p>
            {manager
              ? "الشكاوى بتوصل هنا فور ما العميل يبعتها. تقدر تضيف متابعة عليها بس، من غير تعديل أو حذف."
              : "تقييمات عملائك وطلبات التقييم اللي لسه مستنية رد."}
          </p>
        </div>
      </div>
      <PageGuide id="feedback" />

      <EmployeeRatings />

      <div className="metric-grid" style={{ marginBottom: 16 }}>
        <div className="metric">
          <span className="metric-top">متوسط التقييم</span>
          <strong className="metric-value">{data.avg === null ? "—" : data.avg.toFixed(1)}</strong>
          <span className="metric-note">من {data.answered.length} تقييم</span>
        </div>
        <div className="metric">
          <span className="metric-top">شكاوى مفتوحة</span>
          <strong className="metric-value" style={data.open.length ? { color: "#c8232b" } : undefined}>
            {data.open.length}
          </strong>
          <span className="metric-note" style={data.late.length ? { color: "#c8232b", fontWeight: 600 } : undefined}>
            {data.late.length ? `${data.late.length} متأخرة +24 ساعة من غير متابعة` : `من إجمالي ${data.complaints.length}`}
            {data.avgHours !== null && ` · متوسط الحل ${data.avgHours < 48 ? `${data.avgHours} ساعة` : `${Math.round(data.avgHours / 24)} يوم`}`}
          </span>
        </div>
        <div className="metric">
          <span className="metric-top">مستنية رد العميل</span>
          <strong className="metric-value">{data.waiting.length}</strong>
          <span className="metric-note">{dueReminders ? `${dueReminders} محتاجة تذكير` : "مفيش تذكير مطلوب"}</span>
        </div>
        <div className="metric">
          <span className="metric-top">نسبة الرد</span>
          <strong className="metric-value">{Number.isFinite(rate) ? rate : 0}%</strong>
          <span className="metric-note">من الطلبات المبعوتة</span>
        </div>
      </div>

      <section className="panel">
        <div className="tab-filter" role="group" aria-label="تصفية التقييمات" style={{ marginBottom: 12 }}>
          {(
            [
              ["complaints", `الشكاوى (${data.complaints.length})`],
              ["referrals", `ترشيحات (${data.referrals.length}${data.newReferrals.length ? `، ${data.newReferrals.length} جديد` : ""})`],
              ["all", `كل الطلبات (${data.sorted.length})`],
              ["waiting", `مستنية رد (${data.waiting.length})`],
            ] as const
          ).map(([id, label]) => (
            <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ padding: "0 16px" }}>
          <FilterBar
            search={{ value: q, onChange: setQ, placeholder: "ابحث باسم العميل أو نص التعليق…" }}
            selects={[
              { id: "branch", label: "الفرع", value: fBranch, onChange: setFBranch, allLabel: "كل الفروع", primary: true, options: uniq(reviewRequests.map((r) => r.branchId)).map((id) => ({ value: id, label: reviewRequests.find((r) => r.branchId === id)?.branchName || id })) },
              { id: "rating", label: "التقييم", value: fRating, onChange: setFRating, allLabel: "كل التقييمات", primary: true, options: [{ value: "low", label: "ضعيف (1–2)" }, { value: "mid", label: "متوسط (3)" }, { value: "high", label: "ممتاز (4–5)" }] },
              { id: "agent", label: "الموظف", value: fAgent, onChange: setFAgent, allLabel: "كل الموظفين", options: uniq(reviewRequests.map((r) => r.agentId)).map((id) => ({ value: id, label: reviewRequests.find((r) => r.agentId === id)?.agentName || id })) },
            ]}
            dates={{ from: fFrom, to: fTo, onFrom: setFFrom, onTo: setFTo, label: "التاريخ" }}
            count={{ shown: list.length, noun: "طلب" }}
            onReset={resetFilters}
          />
        </div>
        {list.length === 0 ? (
          <div className="empty-state">
            <h3>{tab === "complaints" ? "مفيش شكاوى. كويس!" : tab === "referrals" ? "لسه مفيش ترشيحات" : "لسه مفيش حاجة هنا"}</h3>
            <p>الموظف بيطلب التقييم من ملف العميل بزر «طلب تقييم»، والرد بيظهر هنا تلقائيًا.</p>
          </div>
        ) : (
          <div className="review-list">
            {list.map((r) => (
              <ReviewCard key={r.id} request={r} showCustomer onOpenLead={onOpenLead} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
