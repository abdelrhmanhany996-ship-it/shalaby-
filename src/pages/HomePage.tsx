import { useMemo } from "react";
import { UserPlus, PhoneCall, Target, Sparkles, CalendarDays, ArrowUpLeft } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { canAccessPage, canCreateCustomer, worksOwnCustomers } from "../lib/access";
import { hasPermission, isSalesCapable } from "../lib/permissions";
import { bucketize, priorityNames, priorityOf } from "../lib/followUps";
import { formatMoney, today } from "../lib/presentation";
import { monthOf, overview, targetable, targetStateNames } from "../lib/targets";
import { openShalaby } from "../components/zaki/shalabyEvents";
import { TargetBar } from "../components/common/TargetBar";

interface Props {
  setActiveTab: (tab: string) => void;
  onOpenLead: (id: string) => void;
}

const pct = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}٪`;

/** The simplified home: today's follow-ups, where the targets stand, and a way into Shalaby AI. */
export function HomePage({ setActiveTab, onOpenLead }: Props) {
  const { effectiveUser, leads, followUps, bookings, employeeTargets, targetSettings, targetUsers } = useCRM();
  const now = today();
  const own = worksOwnCustomers(effectiveUser);
  const groups = useMemo(() => bucketize(own ? followUps.filter((f) => f.assignedAgentId === effectiveUser.id) : followUps, now), [followUps, own, effectiveUser.id, now]);
  const canTeam = hasPermission(effectiveUser, "targets.view");
  const t = useMemo(() => overview(targetUsers, employeeTargets, bookings, monthOf(now), now, targetSettings), [targetUsers, employeeTargets, bookings, now, targetSettings]);
  const mine = t.rows.find((r) => r.user.id === effectiveUser.id);
  const behind = t.rows.filter((r) => r.state === "behind" || r.state === "missed");
  const achieved = t.rows.filter((r) => r.state === "achieved");
  const urgent = [...groups.overdue, ...groups.today].slice(0, 6);
  const first = effectiveUser.name.split(" ")[0];

  const questions = canTeam
    ? ["مين الموظفين اللي متأخرين عن التارجت؟", "إيه أهم المتابعات اللي محتاجة تدخل النهارده؟", "مين أقرب موظف لتحقيق التارجت؟"]
    : ["إيه اللي محتاج أركز عليه النهارده؟", "أنا فين من التارجت بتاعي؟", "لخصلي العملاء اللي محتاجين متابعة."];

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Cairo" })}</span>
          <h1>أهلًا {first}</h1>
          <p>متابعاتك وأهدافك في مكان واحد، واسأل شلبي عن أي حاجة.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canCreateCustomer(effectiveUser) && canAccessPage(effectiveUser, "add_client") && (
            <button className="btn-primary" onClick={() => setActiveTab("add_client")}>
              <UserPlus size={15} />
              عميل جديد
            </button>
          )}
          <button className="btn-secondary" onClick={() => openShalaby()}>
            <Sparkles size={15} />
            اسأل شلبي
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <button type="button" className="metric" onClick={() => setActiveTab("clients")} style={{ cursor: "pointer" }} disabled={!canAccessPage(effectiveUser, "clients")}>
          <span className="metric-top">العملاء</span>
          <strong className="metric-value">{leads.length}</strong>
          <span className="metric-note">{own ? "عملاؤك" : "داخل نطاقك"}</span>
        </button>
        <button type="button" className="metric" onClick={() => setActiveTab("followups")} style={{ cursor: "pointer" }}>
          <span className="metric-top">متابعات متأخرة</span>
          <strong className="metric-value" style={groups.overdue.length ? { color: "var(--late)" } : undefined}>{groups.overdue.length}</strong>
          <span className="metric-note">النهارده {groups.today.length} · قادمة {groups.upcoming.length}</span>
        </button>
        <button type="button" className="metric" onClick={() => setActiveTab("targets")} style={{ cursor: "pointer" }}>
          <span className="metric-top">{canTeam ? "إنجاز الفريق" : "هدفي"}</span>
          <strong className="metric-value">
            {canTeam ? (t.total.target ? pct(t.total.percent) : "—") : mine?.target ? pct(mine.percent) : "—"}
          </strong>
          <span className="metric-note">
            {canTeam
              ? t.total.target
                ? `${formatMoney(t.total.achieved)} من ${formatMoney(t.total.target)} ج.م`
                : "لسه ما اتحددتش أهداف للشهر ده"
              : mine?.target
                ? `${formatMoney(mine.achieved)} من ${formatMoney(mine.target)} ج.م`
                : "لسه ما اتحددلكش هدف"}
          </span>
        </button>
        <div className="metric">
          <span className="metric-top">{canTeam ? "متأخرين عن الهدف" : "المتبقي"}</span>
          <strong className="metric-value">{canTeam ? behind.length : mine?.target ? formatMoney(mine.remaining) : "—"}</strong>
          <span className="metric-note">{canTeam ? `${achieved.length} حققوا الهدف` : mine?.target ? targetStateNames[mine.state] : ""}</span>
        </div>
      </div>

      {targetable(effectiveUser) && own && (
        <section className="panel" style={{ marginBottom: 16, padding: "18px 20px" }} aria-label="هدفي هذا الشهر">
          {mine?.target ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                <span className="eyebrow">هدفك الشهر ده</span>
                <strong style={{ fontSize: 22 }}>{formatMoney(mine.target)} ج.م</strong>
              </div>
              <div style={{ margin: "14px 0 10px" }}>
                <TargetBar percent={mine.percent} expectedPercent={mine.expectedPercent} height={16} />
              </div>
              <p style={{ margin: 0 }}>
                {mine.percent > 100 ? "⭐ " : ""}بعت <strong>{formatMoney(mine.achieved)}</strong> ج.م ({pct(mine.percent)})
                {mine.percent > 100 ? ` · تخطّيت الهدف بـ ${formatMoney(mine.achieved - mine.target)} ج.م` : ` · فاضلك ${formatMoney(mine.remaining)} ج.م`}
              </p>
            </>
          ) : (
            <p style={{ margin: 0 }}>لسه ما اتحددلكش هدف للشهر ده. المدير هيحدده، وأول ما يتحدد هيظهر هنا وكل بيع بتسجّله بيتحسب منه.</p>
          )}
        </section>
      )}

      <div className="home-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>محتاج تتحرك فيه دلوقتي</h2>
              <p>المتأخر الأول، وبعدين النهارده</p>
            </div>
            <button className="btn-text" onClick={() => setActiveTab("followups")}>
              كل المتابعات
              <ArrowUpLeft size={14} />
            </button>
          </div>
          {urgent.length ? (
            urgent.map((f) => (
              <div className="task-row" key={f.id}>
                <PhoneCall size={16} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button className="btn-text" onClick={() => f.leadId && onOpenLead(f.leadId)} style={{ padding: 0 }}>
                    <strong>{f.leadName}</strong>
                  </button>
                  <p className="table-secondary" style={{ margin: 0 }}>
                    {f.reason}
                    {!own && f.assignedAgentName ? ` · ${f.assignedAgentName}` : ""}
                  </p>
                </div>
                <span className={`status-pill ${groups.overdue.includes(f) ? "is-new" : "is-warning"}`}>
                  <CalendarDays size={12} /> {f.scheduledAt.replace("T", " ").slice(0, 16)}
                </span>
                {priorityOf(f) === "high" && <span className="status-pill is-new">{priorityNames.high}</span>}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <PhoneCall size={26} strokeWidth={1.3} />
              <h3>مفيش متابعات متأخرة أو النهارده</h3>
              <p>شغل ممتاز. القادمة في صفحة المتابعات.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{canTeam ? "الأهداف الشهر ده" : "هدفي الشهر ده"}</h2>
              <p>من المبيعات المسجّلة فعلًا</p>
            </div>
            <button className="btn-text" onClick={() => setActiveTab("targets")}>
              التفاصيل
              <ArrowUpLeft size={14} />
            </button>
          </div>
          {canTeam ? (
            t.rows.some((r) => r.target > 0) ? (
              t.rows
                .filter((r) => r.target > 0)
                .slice(0, 6)
                .map((r) => (
                  <div className="task-row" key={r.user.id}>
                    <Target size={16} />
                    <div style={{ flex: 1 }}>
                      <strong>{r.user.name}</strong>
                      <TargetBar percent={r.percent} expectedPercent={r.expectedPercent} />
                    </div>
                    <span className="table-secondary">{pct(r.percent)}</span>
                  </div>
                ))
            ) : (
              <div className="empty-state">
                <Target size={26} strokeWidth={1.3} />
                <h3>مفيش أهداف للشهر ده</h3>
                <p>حدد أهداف الموظفين من صفحة الأهداف.</p>
              </div>
            )
          ) : targetable(effectiveUser) && mine?.target ? (
            <div style={{ padding: "0 20px 20px" }}>
              <p>
                <strong>{pct(mine.percent)}</strong> · {targetStateNames[mine.state]}
              </p>
              <TargetBar percent={mine.percent} expectedPercent={mine.expectedPercent} height={14} />
              <p className="table-secondary" style={{ marginTop: 10 }}>
                فاضلك {formatMoney(mine.remaining)} ج.م · المفروض توصل {pct(mine.expectedPercent)} لحد النهارده
              </p>
            </div>
          ) : (
            <div className="empty-state">
              <Target size={26} strokeWidth={1.3} />
              <h3>لسه مفيش هدف</h3>
              <p>المدير هيحدد هدفك الشهري.</p>
            </div>
          )}
        </section>
      </div>

      <section className="panel" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
          <Sparkles size={15} style={{ verticalAlign: "middle", marginInlineEnd: 6 }} />
          اسأل شلبي
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {questions.map((q) => (
            <button key={q} className="btn-secondary" onClick={() => openShalaby(q)}>
              {q}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
