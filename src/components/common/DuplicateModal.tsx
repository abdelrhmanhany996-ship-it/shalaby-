import React, { useEffect, useState } from 'react';
import { Lead } from '../../types/crm';
import { useLanguage } from '../../context/LanguageContext';
import { useCRM } from '../../context/CRMContext';
import { AlertTriangle, User, Phone, Eye, X, Edit3, MapPin, PhoneCall } from 'lucide-react';
import type { LeadQuickAction } from './LeadDetailsModal';

interface DuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: Lead[];
  onOpenExisting: (lead: Lead, action?: LeadQuickAction) => void;
}

export const DuplicateModal: React.FC<DuplicateModalProps> = ({
  isOpen,
  onClose,
  duplicates,
  onOpenExisting,
}) => {
  const { t } = useLanguage();
  const { visits, followUps } = useCRM();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setSelectedId(duplicates[0]?.id ?? null);
  }, [isOpen, duplicates]);

  if (!isOpen || duplicates.length === 0) return null;

  const selectedLead = duplicates.find((d) => d.id === selectedId) || duplicates[0];

  const runAction = (action: LeadQuickAction) => {
    onClose();
    onOpenExisting(selectedLead, action);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 dark:border-amber-900">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('duplicate.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('duplicate.message')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Leads List */}
        <div className="space-y-3 max-h-60 overflow-y-auto my-4 pr-1">
          {duplicates.map((lead) => {
            const isSelected = (selectedLead?.id ?? null) === lead.id;
            const visitCount = visits.filter((v) => v.linkedLeadId === lead.id || (v.phone && v.phone === lead.phone)).length;
            const followUpCount = followUps.filter((f) => f.leadId === lead.id).length;
            return (
            <div
              key={lead.id}
              onClick={() => setSelectedId(lead.id)}
              className={`p-3.5 rounded-xl border bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                isSelected && duplicates.length > 1
                  ? 'border-amber-500 ring-2 ring-amber-400/50'
                  : 'border-amber-200 dark:border-amber-900'
              }`}
            >
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>{lead.name}</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="font-mono-numbers">{lead.phone}</span>
                  </span>
                  <span>· {lead.branchName}</span>
                  <span>· {lead.assignedAgentName || 'غير مخصص'}</span>
                </div>
                <div className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold mt-1">
                  الحالة الحالية: {t(`status.${lead.status}`)}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/70 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800">
                    زيارات: <span className="font-mono-numbers">{visitCount}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    متابعة: <span className="font-mono-numbers">{followUpCount}</span>
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onOpenExisting(lead);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>فتح السجل</span>
              </button>
            </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
          {selectedLead && (
            <>
              <button
                onClick={() => runAction('edit')}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل البيانات</span>
              </button>
              <button
                onClick={() => runAction('visit')}
                className="px-3.5 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>إضافة زيارة</span>
              </button>
              <button
                onClick={() => runAction('followup')}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>متابعة</span>
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            إغلاق التنبيه
          </button>
        </div>
      </div>
    </div>
  );
};
