import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, History, Laptop, Lock, AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';

export const AuditSecurityScreen: React.FC = () => {
  const { auditLogs, securitySessions, currentUser, t } = useApp();
  const [activeTab, setActiveTab] = useState<'audit' | 'security'>('audit');

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div>
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          سجل المراجعة والأمان (Audit Log & Security Dashboard)
        </h1>
        <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
          تسجيل وتتبع كافة الإجراءات الحساسة، التعديلات، الجلسات النشطة، وتأمين المفاتيح البرمجية.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'audit' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل المراجعة (Audit Log)</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'security' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>مركز الأمان والجلسات (Security Dashboard)</span>
        </button>
      </div>

      {/* Audit Log View */}
      {activeTab === 'audit' && (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden hover:shadow-[0_0_25px_rgba(99,102,241,0.22)] hover:scale-[1.01] transition-all duration-300 ease-out">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">سجل العمليات الإدارية والإنشائية</h3>
            <span className="text-xs text-slate-400 font-mono">{auditLogs.length} عملية مسجلة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-3 text-start">المستخدم</th>
                  <th className="p-3 text-start">الإجراء</th>
                  <th className="p-3 text-start">المورد (Resource)</th>
                  <th className="p-3 text-center">التاريخ/الوقت</th>
                  <th className="p-3 text-center">عنوان IP والجهاز</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img src={log.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} alt={log.userName} className="w-6 h-6 rounded-full object-cover" />
                        <span className="font-bold text-slate-900 dark:text-white">{log.userName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{log.action}</td>
                    <td className="p-3 text-slate-800 dark:text-slate-200">{log.resource}</td>
                    <td className="p-3 text-center font-mono text-[11px]">{log.timestamp}</td>
                    <td className="p-3 text-center font-mono text-[11px] text-slate-400">{log.ipAddress} ({log.device})</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security View */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Active Sessions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">الجلسات النشطة (Active Sessions)</h3>

            <div className="space-y-3">
              {securitySessions.map((ses) => (
                <div key={ses.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{ses.device}</span>
                        {ses.isCurrent && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                            الجلسة الحالية
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        الموقع: {ses.location} · IP: {ses.ipAddress} · آخر نشاط: {ses.lastActive}
                      </p>
                    </div>
                  </div>

                  {!ses.isCurrent && (
                    <button className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl hover:bg-rose-100 transition-colors">
                      إنهاء الجلسة
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Secrets Protection Notice */}
          <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">حماية البيانات الحساسة والمفاتيح البرمجية (Secret Protection)</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              تلتزم المنصة بحماية كافة كلمات المرور، رموز الوصول API Keys، والمفاتيح السرية. لا يتم إظهار المفاتيح الحقيقية أبداً في الواجهة للعامة.
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs font-mono text-emerald-300">
              <span>GEMINI_API_KEY: •••••••••••••••••</span>
              <span>OPENAI_ORG_KEY: •••••••••••••••••</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
