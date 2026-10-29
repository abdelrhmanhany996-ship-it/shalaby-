import { Fragment, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Target, Settings2, Check, X } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { hasPermission, isSalesCapable } from "../lib/permissions";
import { formatMoney, today } from "../lib/presentation";
import { bucketOf } from "../lib/followUps";
import { achievedFor, evaluate, monthOf, overview, shiftMonth, targetId, targetStateNames, type Performance, type TargetState } from "../lib/targets";

const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("ar-EG", { month: "long", year: "numeric", timeZone: "UTC" });
const stateColor: Record<TargetState, string> = {
  achieved: "var(--buy)",
  on_track: "var(--wait)",
  behind: "var(--late)",
  missed: "var(--late)",
  no_target: "var(--line)",
};
const stateClass: Record<TargetState, string> = { achieved: "is-success", on_track: "is-warning", behind: "is-new", missed: "is-new", no_target: "" };

function Bar({ p }: { p: Performance }) {
  return (
    <div className="department-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(p.percent))} aria-label="نسبة الإنجاز" style={{ position: "relative" }}>
      <i style={{ width: `${Math.min(100, p.percent)}%`, background: stateColor[p.state], opacity: 1 }} />
      {p.expectedPercent > 0 && p.expectedPercent < 100 && (
        <span title={`المفروض تكون هنا النهارده (${p.expectedPercent}%)`} style={{ position: "absolute", insetBlock: -3, insetInlineStart: `${p.expectedPercent}%`, width: 2, background: "var(--ink)", opacity: 0.55 }} />
      )}
    </div>
  );
}

const pct = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}٪`;

export function TargetsPage() {
  const { effectiveUser, targetUsers: users, bookings, followUps, employeeTargets, targetSettings, setEmployeeTarget, removeEmployeeTarget, updateTargetSettings, branches } = useCRM();
  const canView = hasPermission(effectiveUser, "targets.view");
  const canManage = hasPermission(effectiveUser, "targets.manage");
  const canConfigure = canManage && ["admin", "general_manager", "regional_manager"].includes(effectiveUser.role);
  const sells = isSalesCapable(effectiveUser);
  const now = today();
  const [month, setMonth] = useState(monthOf(now));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [open, setOpen] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [showLate, setShowLate] = useState("");
  const [only, setOnly] = useState<"all" | "behind" | "achieved">("all");

  const data = useMemo(() => overview(users, employeeTargets, bookings, month, now, targetSettings), [users, employeeTargets, bookings, month, now, targetSettings]);
  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name ?? "";

  // The signed-in person's own standing (everyone who sells has one).
  const mine = useMemo(() => {
    const row = employeeTargets.find((t) => t.id === targetId(effectiveUser.id, month));
    const a = achievedFor(effectiveUser.id, month, bookings, targetSettings);
    const amount = row ? row.amount : targetSettings.defaultAmount;
    return { row, a, p: evaluate(amount, a.amount, month, now, targetSettings) };
  }, [employeeTargets, bookings, effectiveUser.id, month, now, targetSettings]);
  const lastMonths = useMemo(
    () =>
      [1, 2, 3].map((i) => {
        const m = shiftMonth(month, -i);
        const row = employeeTargets.find((t) => t.id === targetId(effectiveUser.id, m));
        const a = achievedFor(effectiveUser.id, m, bookings, targetSettings);
        return { m, p: evaluate(row ? row.amount : targetSettings.defaultAmount, a.amount, m, now, targetSettings) };
      }),
    [employeeTargets, bookings, effectiveUser.id, month, now, targetSettings],
  );

  const flash = (text: string, bad = false) => {
    setMsg({ text, bad });
    window.setTimeout(() => setMsg(null), 5000);
  };
  const save = (userId: string) => {
    const raw = (drafts[userId] ?? "").replace(/[,٬\s]/g, "");
    const amount = Number(raw);
    try {
      if (raw === "" || !Number.isFinite(amount)) throw new Error("اكتب قيمة الهدف بالأرقام.");
      setEmployeeTarget(userId, month, amount);
      setDrafts((d) => {
        const { [userId]: _x, ...rest } = d;
        return rest;
      });
      flash("اتحفظ الهدف.");
    } catch (e) {
      flash(e instanceof Error ? e.message : "تعذر حفظ الهدف.", true);
    }
  };
  const remove = (userId: string) => {
    try {
      removeEmployeeTarget(userId, month);
      flash("اتشال الهدف.");
    } catch (e) {
      flash(e instanceof Error ? e.message : "تعذر حذف الهدف.", true);
    }
  };

  const card = (p: Performance, achievedAmount: number, title: string, note?: string) => (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{note ?? monthLabel(month)}</p>
        </div>
        <span className={`status-pill ${stateClass[p.state]}`}>{targetStateNames[p.state]}</span>
      </div>
      <div className="metric-grid" style={{ margin: "0 16px 16px" }}>
        <div className="metric">
          <span className="metric-top">الهدف</span>
          <strong className="metric-value">{p.target ? formatMoney(p.target) : "—"}<small>ج.م</small></strong>
        </div>
        <div className="metric">
          <span className="metric-top">المُنجَز</span>
          <strong className="metric-value">{formatMoney(achievedAmount)}<small>ج.م</small></strong>
        </div>
        <div className="metric">
          <span className="metric-top">نسبة الإنجاز</span>
          <strong className="metric-value">{p.target ? pct(p.percent) : "—"}</strong>
        </div>
        <div className="metric">
          <span className="metric-top">المتبقي</span>
          <strong className="metric-value">{p.target ? formatMoney(p.remaining) : "—"}<small>ج.م</small></strong>
        </div>
      </div>
      {p.target > 0 && (
        <div style={{ padding: "0 20px 18px" }}>
          <Bar p={p} />
          {targetSettings.paceAware && p.expectedPercent > 0 && p.expectedPercent < 100 && (
            <p className="quiet-note" style={{ marginTop: 8 }}>
              الخط الأسود هو المكان المفروض توصله النهارده ({pct(p.expectedPercent)}) حسب اللي عدّى من الشهر.
            </p>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">الهدف الشهري والإنجاز الفعلي</span>
          <h1>الأهداف</h1>
          <p>{canView ? "حدد هدف كل موظف وتابع إنجازه من المبيعات المسجّلة فعلًا." : "هدفك الشهري وإنجازك لحد دلوقتي."}</p>
        </div>
        <div className="tab-filter" role="group" aria-label="الشهر">
          <button aria-label="الشهر السابق" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronRight size={16} />
          </button>
          <button aria-pressed style={{ minWidth: 130 }}>{monthLabel(month)}</button>
          <button aria-label="الشهر التالي" onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>
      {msg && (
        <p className={`notice ${msg.bad ? "warning" : ""}`} role={msg.bad ? "alert" : "status"}>
          {msg.text}
        </p>
      )}

      {sells && card(mine.p, mine.a.amount, "هدفي", mine.p.target ? `${monthLabel(month)} · ${mine.a.purchases} عملية بيع` : `${monthLabel(month)} · لسه ما اتحددلكش هدف للشهر ده`)}
      {sells && !canView && (
        <section className="panel" style={{ marginTop: 20 }}>
          <div className="panel-header">
            <div>
              <h2>آخر 3 شهور</h2>
              <p>للمقارنة بنفس القواعد</p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الشهر</th>
                  <th>الهدف</th>
                  <th>المُنجَز</th>
                  <th>النسبة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {lastMonths.map(({ m, p }) => (
                  <tr key={m}>
                    <td>{monthLabel(m)}</td>
                    <td>{p.target ? `${formatMoney(p.target)} ج.م` : "—"}</td>
                    <td>{formatMoney(p.achieved)} ج.م</td>
                    <td>{p.target ? pct(p.percent) : "—"}</td>
                    <td>
                      <span className={`status-pill ${stateClass[p.state]}`}>{targetStateNames[p.state]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {canView && (
        <>
          <section className="panel" style={{ marginTop: sells ? 20 : 0 }}>
            <div className="panel-header">
              <div>
                <h2>نظرة الإدارة</h2>
                <p>{data.rows.length ? `${data.rows.length} موظف داخل نطاقك` : "مفيش موظفين مبيعات داخل نطاقك."}</p>
              </div>
              {canConfigure && (
                <button className="btn-secondary" onClick={() => setShowRules(!showRules)} aria-expanded={showRules}>
                  <Settings2 size={15} />
                  قواعد الحساب
                </button>
              )}
            </div>
            <div className="metric-grid" style={{ margin: "0 16px 16px" }}>
              <div className="metric">
                <span className="metric-top">إجمالي الأهداف</span>
                <strong className="metric-value">{formatMoney(data.total.target)}<small>ج.م</small></strong>
              </div>
              <div className="metric">
                <span className="metric-top">إجمالي المُنجَز</span>
                <strong className="metric-value">{formatMoney(data.total.achieved)}<small>ج.م</small></strong>
              </div>
              <div className="metric">
                <span className="metric-top">النسبة</span>
                <strong className="metric-value">{data.total.target ? pct(data.total.percent) : "—"}</strong>
              </div>
              <div className="metric">
                <span className="metric-top">المتبقي</span>
                <strong className="metric-value">{formatMoney(data.total.remaining)}<small>ج.م</small></strong>
              </div>
            </div>
            {data.otherAchieved > 0 && (
              <p className="quiet-note" style={{ margin: "0 20px 12px" }}>
                فيه كمان مبيعات بقيمة {formatMoney(data.otherAchieved)} ج.م في الشهر ده باسم ناس مش في القايمة دي (موظف اتشال أو مش من فريق المبيعات)، وماتحسبتش في الإجماليات فوق.
              </p>
            )}

            {showRules && canConfigure && (
              <div className="panel" style={{ margin: "0 16px 16px", padding: 18 }}>
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>قواعد حساب الإنجاز</h3>
                <div className="field-grid">
                  <label className="field">
                    <span>«متأخر» لو إنجازه أقل من (٪ من المفروض لحد النهارده)</span>
                    <input type="number" min={1} max={targetSettings.achievedFrom} defaultValue={targetSettings.behindBelow} onBlur={(e) => updateTargetSettings({ behindBelow: Number(e.target.value) })} />
                  </label>
                  <label className="field">
                    <span>«حقّق الهدف» من (٪ من الهدف)</span>
                    <input type="number" min={1} max={1000} defaultValue={targetSettings.achievedFrom} onBlur={(e) => updateTargetSettings({ achievedFrom: Number(e.target.value) })} />
                  </label>
                  <label className="field">
                    <span>هدف افتراضي لمن ليس له هدف (ج.م، 0 = بدون)</span>
                    <input type="number" min={0} defaultValue={targetSettings.defaultAmount} onBlur={(e) => updateTargetSettings({ defaultAmount: Number(e.target.value) })} />
                  </label>
                </div>
                <label className="checkbox-line" style={{ marginBlock: 12 }}>
                  <input type="checkbox" checked={targetSettings.paceAware} onChange={(e) => updateTargetSettings({ paceAware: e.target.checked })} />
                  قارن بالمفروض لحد النهارده (حسب أيام الشهر اللي عدّت) بدل الهدف الكامل
                </label>
                <p className="quiet-note">الإنجاز = قيمة المبيعات المسجّلة للموظف في الشهر (من غير الملغي والمسترجع). كل عملية بتتحسب مرة واحدة لموظف واحد.</p>
              </div>
            )}

            <div className="tab-filter" role="group" aria-label="عرض" style={{ margin: "0 16px 10px" }}>
              {(
                [
                  ["all", "الكل"],
                  ["behind", `متأخرين (${data.rows.filter((r) => r.state === "behind" || r.state === "missed").length})`],
                  ["achieved", `حققوا الهدف (${data.rows.filter((r) => r.state === "achieved").length})`],
                ] as const
              ).map(([id, label]) => (
                <button key={id} aria-pressed={only === id} onClick={() => setOnly(id)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>الهدف (ج.م)</th>
                    <th>المُنجَز</th>
                    <th>النسبة</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.filter((r) => only === "all" || (only === "behind" ? r.state === "behind" || r.state === "missed" : r.state === "achieved")).map((r) => {
                    const a = achievedFor(r.user.id, month, bookings, targetSettings);
                    const stored = employeeTargets.find((t) => t.id === targetId(r.user.id, month));
                    const draft = drafts[r.user.id];
                    const canSet = canManage && (r.user.id !== effectiveUser.id || ["admin", "general_manager"].includes(effectiveUser.role));
                    return (
                      <Fragment key={r.user.id}>
                        <tr>
                          <td>
                            <button className="btn-text" onClick={() => setOpen(open === r.user.id ? "" : r.user.id)} aria-expanded={open === r.user.id}>
                              <strong>{r.user.name}</strong>
                            </button>
                            <br />
                            <small className="table-secondary">{branchName(r.user.branchId)}</small>
                          </td>
                          <td>
                            {canSet ? (
                              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  dir="ltr"
                                  aria-label={`هدف ${r.user.name}`}
                                  style={{ width: 110 }}
                                  value={draft ?? (r.hasRow ? String(stored!.amount) : r.target ? String(r.target) : "")}
                                  placeholder="0"
                                  onChange={(e) => setDrafts((d) => ({ ...d, [r.user.id]: e.target.value }))}
                                />
                                {draft !== undefined && (
                                  <>
                                    <button className="icon-button" aria-label="حفظ الهدف" onClick={() => save(r.user.id)}>
                                      <Check size={16} />
                                    </button>
                                    <button className="icon-button" aria-label="إلغاء التعديل" onClick={() => setDrafts(({ [r.user.id]: _x, ...rest }) => rest)}>
                                      <X size={16} />
                                    </button>
                                  </>
                                )}
                              </span>
                            ) : r.target ? (
                              `${formatMoney(r.target)}`
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{formatMoney(r.achieved)}</td>
                          <td style={{ minWidth: 130 }}>
                            {r.target ? pct(r.percent) : "—"}
                            {r.target > 0 && <Bar p={r} />}
                          </td>
                          <td>{r.target ? formatMoney(r.remaining) : "—"}</td>
                          <td>
                            <span className={`status-pill ${stateClass[r.state]}`}>{targetStateNames[r.state]}</span>
                          </td>
                          <td>
                            <button className="btn-secondary" onClick={() => setOpen(open === r.user.id ? "" : r.user.id)} aria-expanded={open === r.user.id} aria-label={`المزيد عن ${r.user.name}`}>
                              المزيد
                            </button>
                          </td>
                        </tr>
                        {open === r.user.id && (
                          <tr>
                            <td colSpan={7} style={{ background: "var(--surface-soft)" }}>
                              <div style={{ padding: 8 }}>
                                <p>
                                  باع بـ <strong>{formatMoney(a.amount)} ج.م</strong> في {monthLabel(month)} · {r.purchases} فاتورة
                                </p>
                                {(() => {
                                  const sold = bookings
                                    .filter((b) => b.agentId === r.user.id && monthOf(b.bookingDate) === month)
                                    .sort((x, y) => y.bookingDate.localeCompare(x.bookingDate));
                                  return sold.length ? (
                                    <div className="table-scroll" style={{ margin: "8px 0" }}>
                                      <table className="data-table">
                                        <thead>
                                          <tr>
                                            <th>التاريخ</th>
                                            <th>العميل</th>
                                            <th>الفاتورة</th>
                                            <th>المبلغ</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sold.map((b) => {
                                            const off = b.bookingStatus === "cancelled" || b.paymentStatus === "refunded";
                                            return (
                                              <tr key={b.id} style={off ? { opacity: 0.55 } : undefined}>
                                                <td>{b.bookingDate}</td>
                                                <td>{b.leadName}</td>
                                                <td>
                                                  {b.courseName}
                                                  {off && <span className="status-pill" style={{ marginInlineStart: 6 }}>{b.bookingStatus === "cancelled" ? "ملغاة" : "مرتجع"}</span>}
                                                </td>
                                                <td>{formatMoney(b.amount)} ج.م</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="table-secondary">مفيش فواتير في الشهر ده.</p>
                                  );
                                })()}
                                {(() => {
                                  const late = followUps
                                    .filter((f) => f.assignedAgentId === r.user.id && bucketOf(f, now) === "overdue")
                                    .sort((x, y) => x.scheduledAt.localeCompare(y.scheduledAt));
                                  const daysLate = (d: string) => Math.max(0, Math.round((Date.parse(now) - Date.parse(d.slice(0, 10))) / 86_400_000));
                                  return (
                                    <>
                                      <button className="btn-text" onClick={() => setShowLate(showLate === r.user.id ? "" : r.user.id)} aria-expanded={showLate === r.user.id}>
                                        التأخير في المتابعات ({late.length})
                                      </button>
                                      {showLate === r.user.id &&
                                        (late.length ? (
                                          <div className="table-scroll" style={{ margin: "8px 0" }}>
                                            <table className="data-table">
                                              <thead>
                                                <tr>
                                                  <th>العميل</th>
                                                  <th>كان المفروض</th>
                                                  <th>متأخر</th>
                                                  <th>اتأجلت</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {late.map((f) => (
                                                  <tr key={f.id}>
                                                    <td>
                                                      {f.leadName}
                                                      <div className="table-secondary">{f.reason}</div>
                                                    </td>
                                                    <td>{f.scheduledAt.replace("T", " ").slice(0, 16)}</td>
                                                    <td style={{ color: "var(--late)" }}>{daysLate(f.scheduledAt)} يوم</td>
                                                    <td>{f.rescheduleCount ? `${f.rescheduleCount} مرة` : "—"}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <p className="table-secondary">مفيش متابعات متأخرة. 👌</p>
                                        ))}
                                    </>
                                  );
                                })()}
                                {stored && (
                                  <p className="table-secondary">
                                    اتحدد بواسطة {stored.setByName}
                                    {stored.history?.length ? ` · اتعدل ${stored.history.length} مرة (آخرها من ${formatMoney(stored.history[stored.history.length - 1].from)} إلى ${formatMoney(stored.history[stored.history.length - 1].to)})` : ""}
                                    {stored.note ? ` · ${stored.note}` : ""}
                                  </p>
                                )}
                                {r.hasRow && canSet && (
                                  <button className="btn-text" onClick={() => remove(r.user.id)}>
                                    شيل الهدف ده
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!data.rows.length && (
              <div className="empty-state">
                <Target size={28} strokeWidth={1.3} />
                <h3>مفيش موظفين</h3>
                <p>الموظفين النشطين من فريق المبيعات بيظهروا هنا.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
