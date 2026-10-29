import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Download, FileText, Printer, CheckCircle2, X, FileSpreadsheet, Sparkles, Building2 } from 'lucide-react';
import { Subscription } from '../../types';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataTitle?: string;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  dataTitle = 'تقرير الاشتراكات والمصروفات'
}) => {
  const { subscriptions, users, addToast } = useApp();
  const [exportFilter, setExportFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING'>('ALL');
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter subscriptions according to selection
  const exportData = subscriptions.filter((sub) => {
    if (exportFilter === 'ACTIVE') return sub.status === 'Active';
    if (exportFilter === 'EXPIRING') return sub.status === 'Expiring Soon' || sub.status === 'Expired';
    return sub.status !== 'Archived';
  });

  const totalMonthly = exportData.reduce((sum, s) => sum + s.cost, 0);
  const totalYearly = totalMonthly * 12;

  // CSV Export function with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = [
      'اسم الأداة (Tool)',
      'الخطة (Plan)',
      'المالك (Owner)',
      'البريد (Owner Email)',
      'الفريق (Team)',
      'دورة الفوترة (Billing Cycle)',
      'التكلفة الشهرية ($)',
      'تاريخ التجديد (Renewal Date)',
      'الحالة (Status)',
      'كود الترخيص (License Code)'
    ];

    const rows = exportData.map((s) => [
      `"${s.toolName}"`,
      `"${s.planName}"`,
      `"${s.ownerName}"`,
      `"${s.ownerEmail || ''}"`,
      `"${s.teamName}"`,
      `"${s.billingCycle}"`,
      s.cost,
      `"${s.renewalDate}"`,
      `"${s.status}"`,
      `"${s.licenseCode}"`
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Saber_Group_Subscriptions_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast(
      'تم تصدير ملف CSV بنجاح 📊',
      `تم استخراج ${exportData.length} اشتراكاً بصيغة CSV متوافقة مع Excel.`,
      'success'
    );
    onClose();
  };

  // PDF Print Action
  const handlePrintPdf = () => {
    window.print();
    addToast(
      'تم إرسال التقرير للطباعة / PDF 📄',
      'جاري حفظ التقرير بصيغة PDF عبر خيارات الطباعة.',
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      {/* PDF PRINT PREVIEW MODE */}
      {showPdfPreview ? (
        <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
          {/* Top Bar for Preview Window */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-bold">معاينة التقرير الرسمي PDF (Saber Group Report)</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintPdf}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / حفظ كـ PDF</span>
              </button>

              <button
                onClick={() => setShowPdfPreview(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Report Document View */}
          <div className="p-8 overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100 print:p-0 print:bg-white print:text-black">
            {/* Header Stamp */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm">
                    SG
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">Saber Group Subscriptions</h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">منصة إدارة واستهلاك الذكاء الاصطناعي للمؤسسة</span>
                  </div>
                </div>
              </div>

              <div className="text-end text-xs font-mono">
                <span className="text-slate-400 block">تاريخ الإصدار:</span>
                <span className="font-bold text-slate-900 dark:text-white">{new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">إجمالي الاشتراكات</span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">{exportData.length} أداة</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">الإنفاق الشهري الإجمالي</span>
                <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">${totalMonthly}</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">التوقع السنوي</span>
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">${totalYearly}</span>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="p-3 text-start">الأداة / الخطة</th>
                    <th className="p-3 text-start">المالك / الفريق</th>
                    <th className="p-3 text-center">دورة الفوترة</th>
                    <th className="p-3 text-start">التكلفة</th>
                    <th className="p-3 text-start">تاريخ التجديد</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {exportData.map((sub) => (
                    <tr key={sub.id}>
                      <td className="p-3">
                        <span className="font-bold block text-slate-900 dark:text-white">{sub.toolName}</span>
                        <span className="text-[10px] text-slate-500">{sub.planName}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold block">{sub.ownerName}</span>
                        <span className="text-[10px] text-slate-500">{sub.teamName}</span>
                      </td>
                      <td className="p-3 text-center font-mono">{sub.billingCycle}</td>
                      <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">${sub.cost}/mo</td>
                      <td className="p-3 font-mono">{sub.renewalDate}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Footer */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs text-slate-400">
              <span>تم استخراج هذا التقرير آلياً بواسطة نظام Saber Group Subscriptions</span>
              <span>الصفحة 1 من 1</span>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD EXPORT SELECTION MODAL */
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/30">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  تصدير بيانات الاشتراكات والمصروفات
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تنزيل التقرير لمراجعته خارج المنصة أو مشاركته مع الإدارة.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scope Filter Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              نطاق البيانات المراد تصديرها:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ALL', label: 'كافة الاشتراكات' },
                { id: 'ACTIVE', label: 'الاشتراكات النشطة' },
                { id: 'EXPIRING', label: 'الينتهي قريباً' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setExportFilter(f.id as any)}
                  className={`p-2.5 text-xs font-bold rounded-xl border transition-all text-center ${
                    exportFilter === f.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export Format Cards */}
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              اختر صيغة التصدير المطلوبة:
            </label>

            {/* CSV Option Card */}
            <div
              onClick={handleExportCSV}
              className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    تصدير إلى جدول CSV (Excel Ready)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ملف جداول بيانات معرم بخاصية UTF-BOM يدعم اللغة العربية الكاملة.
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
            </div>

            {/* PDF Option Card */}
            <div
              onClick={() => setShowPdfPreview(true)}
              className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    تصدير تقرير PDF رسمي (Print Ready)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    تقرير مطبوع موثق يحتوي على الإحصائيات، الشعار وتوزيع التكاليف.
                  </p>
                </div>
              </div>
              <Printer className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
