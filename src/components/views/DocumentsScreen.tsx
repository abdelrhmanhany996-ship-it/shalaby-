import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FileText, Download, Trash2, Plus, Upload, Search, X } from 'lucide-react';

export const DocumentsScreen: React.FC = () => {
  const { documents, addDocument, deleteDocument, subscriptions, t } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<'invoice' | 'receipt' | 'contract' | 'license_agreement'>('invoice');
  const [subId, setSubId] = useState(subscriptions[0]?.id || '');
  const [amount, setAmount] = useState(20);
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-001');

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (title) {
      const sub = subscriptions.find(s => s.id === subId);
      addDocument({
        title,
        type: docType,
        subscriptionId: subId,
        toolName: sub?.toolName || 'General AI',
        fileName: `${title.replace(/\s+/g, '_')}.pdf`,
        fileSize: '1.5 MB',
        amount: Number(amount),
        currency: 'USD',
        invoiceNumber,
        expirationDate: '2027-09-29'
      });
      setIsModalOpen(false);
      setTitle('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            إدارة الفواتير والعقود (Invoices & Document Management)
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            أرشيف المستندات والوصولات والعقود الضريبية المرتبطة باشتراكات ومصروفات الذكاء الاصطناعي.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs lg:text-sm rounded-xl shadow-xs transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>رفع مستند / فاتورة جديدة</span>
        </button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 hover:border-indigo-400 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{doc.title}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">{doc.fileName} ({doc.fileSize})</span>
                </div>
              </div>

              <button
                onClick={() => deleteDocument(doc.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                title="حذف المستند"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">رقم الفاتورة:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{doc.invoiceNumber || 'INV-N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المبلغ:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">${doc.amount || 0} {doc.currency}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">تاريخ الرفع:</span>
                <span className="text-slate-500">{doc.uploadDate}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {doc.type}
              </span>

              <a
                href="#"
                onClick={(e) => { e.preventDefault(); alert(`تحميل المستند: ${doc.fileName}`); }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل PDF</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">رفع مستند/فاتورة جديدة</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">عنوان المستند *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: فاتورة ChatGPT سبتمبر 2026"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1">نوع المستند</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-semibold"
                  >
                    <option value="invoice">فاتورة (Invoice)</option>
                    <option value="receipt">إيصال دفع (Receipt)</option>
                    <option value="contract">عقد ترخيص (Contract)</option>
                    <option value="license_agreement">اتفاقية ترخيص</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1">الاشتراك المرتبط</label>
                  <select
                    value={subId}
                    onChange={(e) => setSubId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-semibold"
                  >
                    {subscriptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.toolName} ({s.planName})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1">المبلغ ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1">رقم الفاتورة</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-indigo-700"
                >
                  رفع وبدء الأرشفة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
