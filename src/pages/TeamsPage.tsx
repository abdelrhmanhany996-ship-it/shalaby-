import { canManageTeams } from "../lib/access";
import React, { useState } from "react";
import { useCRM } from "../context/CRMContext";
import { useLanguage } from "../context/LanguageContext";
import { Team, User, Branch } from "../types/crm";
import {
  GitBranch,
  Plus,
  Users,
  UserCheck,
  Building2,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface TeamsPageProps {
  onOpenLead?: (leadId: string) => void;
}

export const TeamsPage: React.FC<TeamsPageProps> = ({ onOpenLead }) => {
  const { effectiveUser, teams, branches, users, bookings, leads, addTeam } =
    useCRM();
  const { t } = useLanguage();

  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamBranchId, setTeamBranchId] = useState(branches[0]?.id || "");
  const [supervisorId, setSupervisorId] = useState("");
  const [leaderId, setLeaderId] = useState("");

  const supervisorsList = users.filter(
    (u) =>
      u.active &&
      u.branchId === teamBranchId &&
      ["supervisor", "branch_manager"].includes(u.role),
  );
  const leadersList = users.filter(
    (u) => u.active && u.branchId === teamBranchId && u.role === "sales_agent",
  );

  const handleTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const branchObj = branches.find((b) => b.id === teamBranchId);
    const supObj = users.find((u) => u.id === supervisorId);
    const leaderObj = users.find((u) => u.id === leaderId);

    addTeam({
      name: teamName,
      branchId: teamBranchId,
      branchName: branchObj?.name,
      supervisorId: supervisorId || undefined,
      supervisorName: supObj?.name,
      leaderId: leaderId || undefined,
      leaderName: leaderObj?.name,
      memberIds: leaderId ? [leaderId] : [],
    });

    setTeamName("");
    setShowAddTeam(false);
  };

  const totalMembersCount = teams.reduce(
    (sum, tm) => sum + tm.memberIds.length,
    0,
  );
  const totalTeamBookings = bookings
    .filter(
      (b) =>
        b.bookingStatus !== "cancelled" &&
        teams.some((t) => t.memberIds.includes(b.agentId)),
    )
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1d1d1c] text-slate-900 dark:text-[#f0efea] p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c8232b]/15 text-[#af2028] dark:text-[#c8232b] border border-[#c8232b]/30">
              قسم مستقل للفرق الإدارية والميدانية
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1 text-slate-900 dark:text-[#f0efea] tracking-tight flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-[#c8232b]" />
            <span>فرق التنفيذ والتعاقدات والميدان</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#a6a59f] mt-1 max-w-2xl leading-relaxed">
            صفحة مستقلة بالكامل لإدارة فرق التنفيذ الميداني، تحديد المشرفين
            وقادة الفرق، وتوزيع مسؤولي المبيعات والتعاقدات.
          </p>
        </div>

        {canManageTeams(effectiveUser) && (
          <button
            onClick={() => setShowAddTeam(true)}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-[#292928] dark:hover:bg-[#343431] text-white rounded-xl text-xs font-bold transition-all border border-slate-600/30 dark:border-white/10 shadow-md cursor-pointer flex items-center gap-2 shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4 text-[#c8232b]" />
            <span>+ إنشاء فريق تنفيذ وتمرير جديد</span>
          </button>
        )}
      </div>

      {/* Team KPI Quick Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              عدد الفرق المعتمدة:
            </span>
            <strong className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono-numbers mt-1 block">
              {teams.length} فريق
            </strong>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#c8232b]/15 text-[#c8232b] border border-[#c8232b]/30 flex items-center justify-center font-bold">
            <GitBranch className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              إجمالي أعضاء الفرق بالميدان:
            </span>
            <strong className="text-2xl font-bold text-slate-900 dark:text-[#c8232b] font-mono-numbers mt-1 block">
              {totalMembersCount} موظف ومسؤول
            </strong>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#232322] text-slate-700 dark:text-[#c8232b] border border-slate-200 dark:border-white/10 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              إجمالي تعاقدات الفرق:
            </span>
            <strong className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers mt-1 block">
              {totalTeamBookings.toLocaleString("ar-EG")} ج.م
            </strong>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[#c8232b]" />
          <span>
            دليل فرق التنفيذ والتعاقدات المعتمدة بالمؤسسة ({teams.length}):
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((tm) => {
            const teamMembers = users.filter(
              (u) => u.teamId === tm.id || tm.memberIds.includes(u.id),
            );
            const teamBookings = bookings.filter((b) =>
              teamMembers.some((m) => m.id === b.agentId),
            );
            const teamRev = teamBookings.reduce((sum, b) => sum + b.amount, 0);

            return (
              <div
                key={tm.id}
                className="glass-card rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {tm.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      الفرع التابع: {tm.branchName || "فرع عام"}
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#c8232b]/15 text-[#af2028] dark:text-[#c8232b] border border-[#c8232b]/30">
                    فريق تنفيذ معتمد
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-[#121620] rounded-xl border border-slate-200/60 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                      المشرف المسؤول:
                    </span>
                    <strong className="text-slate-900 dark:text-slate-100 font-semibold mt-0.5 block">
                      {tm.supervisorName || "غير عين"}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-[#121620] rounded-xl border border-slate-200/60 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                      قائد الفريق:
                    </span>
                    <strong className="text-slate-900 dark:text-[#c8232b] font-semibold mt-0.5 block">
                      {tm.leaderName || "غير عين"}
                    </strong>
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                    <span>أعضاء ومسؤولو الفريق ({teamMembers.length}):</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono-numbers">
                      مبيعات: {teamRev.toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {teamMembers.length === 0 ? (
                      <span className="text-slate-400 text-xs">
                        لا يوجد أعضاء في هذا الفريق بعد
                      </span>
                    ) : (
                      teamMembers.map((m) => (
                        <span
                          key={m.id}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-[#232322] text-slate-800 dark:text-[#f0efea] rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 flex items-center gap-1"
                        >
                          <UserCheck className="w-3 h-3 text-[#c8232b]" />
                          <span>{m.name}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Team Modal */}
      {showAddTeam && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
              إنشاء فريق تنفيذ وتمرير جديد
            </h3>

            <form onSubmit={handleTeamSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  اسم الفريق *
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="مثال: فريق الصقور للإنشاءات"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  الفرع التابع له *
                </label>
                <select
                  value={teamBranchId}
                  onChange={(e) => {
                    setTeamBranchId(e.target.value);
                    setSupervisorId("");
                    setLeaderId("");
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-semibold"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  المشرف المسؤول
                </label>
                <select
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                >
                  <option value="">اختر المشرف المسؤول...</option>
                  {supervisorsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.branchName || "عام"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  قائد الفريق
                </label>
                <select
                  value={leaderId}
                  onChange={(e) => setLeaderId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                >
                  <option value="">اختر قائد الفريق...</option>
                  {leadersList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.branchName || "عام"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeam(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xs"
                >
                  إنشاء الفريق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
