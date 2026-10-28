import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { FilterBar, inDateRange } from '../components/common/FilterBar';
import { roleNames } from '../lib/presentation';

export const AuditLogPage: React.FC = () => {
  const { auditLogs } = useCRM();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [fUser, setFUser] = useState('all');
  const [fRole, setFRole] = useState('all');
  const [fAction, setFAction] = useState('all');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const uniq = (list: string[]) => [...new Set(list.filter(Boolean))];

  const filteredLogs = auditLogs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.details.toLowerCase().includes(searchQuery.toLowerCase());
    return (
      matchesSearch &&
      (fUser === 'all' || l.userName === fUser) &&
      (fRole === 'all' || l.userRole === fRole) &&
      (fAction === 'all' || l.action === fAction) &&
      inDateRange(l.timestamp, fFrom, fTo)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
      <div className="page-heading">
        <div>
          <span className="eyebrow">للإدارة العليا</span>
          <h1>سجل العمليات</h1>
          <p>كل إضافة وتعديل في النظام: مين عمله وإمتى. السجل ده مش بيتعدّل ولا بيتمسح.</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <FilterBar
            search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'ابحث بالعملية أو اسم المستخدم أو التفاصيل…' }}
            selects={[
              { id: 'user', label: 'المستخدم', value: fUser, onChange: setFUser, allLabel: 'كل المستخدمين', primary: true, options: uniq(auditLogs.map((l) => l.userName)).map((u) => ({ value: u, label: u })) },
              { id: 'action', label: 'العملية', value: fAction, onChange: setFAction, allLabel: 'كل العمليات', primary: true, options: uniq(auditLogs.map((l) => l.action)).map((a) => ({ value: a, label: a })) },
              { id: 'role', label: 'الدور', value: fRole, onChange: setFRole, allLabel: 'كل الأدوار', options: uniq(auditLogs.map((l) => l.userRole)).map((r) => ({ value: r, label: (roleNames as Record<string, string>)[r] || r })) },
            ]}
            dates={{ from: fFrom, to: fTo, onFrom: setFFrom, onTo: setFTo, label: 'التاريخ' }}
            count={{ shown: filteredLogs.length, noun: 'عملية' }}
            onReset={() => {
              setSearchQuery('');
              setFUser('all');
              setFRole('all');
              setFAction('all');
              setFFrom('');
              setFTo('');
            }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right dir-ltr:text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">الوقت والتاريخ</th>
                <th className="p-3.5">المستخدم</th>
                <th className="p-3.5">الدور الوظيفي</th>
                <th className="p-3.5">العملية المنفذة</th>
                <th className="p-3.5">تفاصيل الإجراء</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                    لا توجد سجلات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono-numbers text-indigo-700 dark:text-indigo-400 font-semibold">
                      {new Date(log.timestamp).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">{log.userName}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{t(`role.${log.userRole}`)}</td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{log.action}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-md truncate">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
