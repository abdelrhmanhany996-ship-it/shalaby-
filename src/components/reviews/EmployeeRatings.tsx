import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
import { employeeRatings, ratingLevelLabel, PRIOR_WEIGHT, type EmployeeRating, type RatingLevel } from "../../lib/employeeRating";
import { Stars } from "./ReviewCard";

const levelStyle: Record<RatingLevel, { background: string; color: string }> = {
  excellent: { background: "#e4f4e9", color: "#1b6b3a" },
  good: { background: "#e6eefb", color: "#1f4f9a" },
  needs_work: { background: "#fbeceb", color: "#a51a21" },
  new: { background: "var(--surface-soft)", color: "var(--muted)" },
};

export const LevelPill = ({ level }: { level: RatingLevel }) => (
  <span className="status-pill" style={levelStyle[level]}>
    {ratingLevelLabel[level]}
  </span>
);

/** The employee's rating from what customers said, as a score with the stars and how many ratings stand behind it. */
export function RatingBadge({ rating }: { rating?: EmployeeRating }) {
  if (!rating || rating.score === null) return <span className="table-secondary">لسه مفيش تقييمات</span>;
  return (
    <span>
      <Stars n={Math.round(rating.score)} /> <strong>{rating.score.toFixed(1)}</strong>{" "}
      <span className="table-secondary">({rating.count})</span>
    </span>
  );
}

const trendIcon = (t: EmployeeRating["trend"]) =>
  t === "up" ? <TrendingUp size={14} color="#15803d" aria-label="في تحسن" /> : t === "down" ? <TrendingDown size={14} color="#c8232b" aria-label="في تراجع" /> : null;

/** Every employee's customer rating for managers; the employee's own rating for a salesperson. */
export function EmployeeRatings() {
  const { users, reviewRequests, followUps, effectiveUser, branches } = useCRM();
  const rows = useMemo(() => employeeRatings(users, reviewRequests, followUps), [users, reviewRequests, followUps]);
  const salesperson = ["sales_agent", "team_leader"].includes(effectiveUser.role);
  const mine = rows.find((r) => r.userId === effectiveUser.id);
  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name ?? "—";

  if (salesperson)
    return (
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2>تقييمك من العملاء</h2>
            <p>من تقييمات اللينك ورضا العميل في متابعات ما بعد البيع.</p>
          </div>
          {mine && <LevelPill level={mine.level} />}
        </div>
        {mine && mine.count > 0 ? (
          <div className="metric-grid" style={{ padding: "0 16px 16px" }}>
            <div className="metric">
              <span className="metric-top">تقييمك</span>
              <strong className="metric-value">{mine.score?.toFixed(1)}</strong>
              <span className="metric-note">
                <Stars n={Math.round(mine.score ?? 0)} /> متوسطك الفعلي {mine.average?.toFixed(1)}
              </span>
            </div>
            <div className="metric">
              <span className="metric-top">عدد التقييمات</span>
              <strong className="metric-value">{mine.count}</strong>
              <span className="metric-note">{mine.count < 3 ? "لسه بدري، محتاج 3 تقييمات على الأقل" : `آخر 30 يوم: ${mine.last30.count}`}</span>
            </div>
            <div className="metric">
              <span className="metric-top">الشكاوى</span>
              <strong className="metric-value">{mine.complaints}</strong>
              <span className="metric-note">{mine.responseRatePercent === null ? "—" : `${mine.responseRatePercent}% من العملاء ردوا`}</span>
            </div>
          </div>
        ) : (
          <p className="quiet-note" style={{ padding: "0 16px 16px" }}>
            لسه مفيش تقييمات من عملائك. ابعت لينك التقييم بعد كل زيارة أو شراء، وتقييمك هيظهر هنا.
          </p>
        )}
      </section>
    );

  const list = rows.filter((r) => r.count > 0 || r.responseRatePercent !== null);
  return (
    <section className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-header">
        <div>
          <h2>تقييم الموظفين من العملاء</h2>
          <p>
            متوسط تقييمات العملاء ورضاهم بعد البيع، مع تعديل بسيط بيمنع إن تقييم واحد يرفع موظف فوق اللي عنده تقييمات كتير (بنعتبر {PRIOR_WEIGHT} تقييمات
            افتراضية بـ 4 نجوم). الموظف اللي له أقل من 3 تقييمات بيظهر «لسه بدري».
          </p>
        </div>
      </div>
      {list.length ? (
        <div className="overflow-x-auto">
          <table className="data-table stack-table">
            <thead>
              <tr>
                <th>#</th>
                <th>الموظف</th>
                <th>الفرع</th>
                <th>التقييم</th>
                <th>عدد التقييمات</th>
                <th>آخر 30 يوم</th>
                <th>الشكاوى</th>
                <th>ردّ العملاء</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.userId}>
                  <td data-label="#">{i + 1}</td>
                  <td data-label="الموظف">
                    {r.name} <LevelPill level={r.level} />
                  </td>
                  <td data-label="الفرع">{branchName(r.branchId)}</td>
                  <td data-label="التقييم">
                    <RatingBadge rating={r} />
                  </td>
                  <td data-label="عدد التقييمات">{r.count}</td>
                  <td data-label="آخر 30 يوم">
                    {r.last30.average === null ? "—" : `${r.last30.average.toFixed(1)} (${r.last30.count})`} {trendIcon(r.trend)}
                  </td>
                  <td data-label="الشكاوى" style={r.complaints ? { color: "#c8232b", fontWeight: 600 } : undefined}>
                    {r.complaints}
                  </td>
                  <td data-label="ردّ العملاء">{r.responseRatePercent === null ? "—" : `${r.responseRatePercent}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="quiet-note" style={{ padding: "0 16px 16px" }}>
          لسه مفيش تقييمات عملاء للموظفين في نطاقك.
        </p>
      )}
    </section>
  );
}
