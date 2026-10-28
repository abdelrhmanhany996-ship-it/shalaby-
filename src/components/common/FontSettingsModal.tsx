import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  Type,
  X,
  Sliders,
  RotateCcw,
  Check,
  Sparkles,
  Bold,
  Eye,
} from 'lucide-react';

interface FontSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface FontPreference {
  fontSize: number; // in px, e.g. 14 to 22
  fontFamily: string; // Google font name
  isBold: boolean;
  fontWeight: '400' | '500' | '600' | '700' | '800';
}

export const FONT_OPTIONS = [
  { id: 'Readex Pro', name: 'Readex Pro', desc: 'افتراضي - عصري، متوازن وواضح جداً', family: "'Readex Pro', sans-serif" },
  { id: 'Tajawal', name: 'تجوال (Tajawal)', desc: 'أنيق وخفيف، ممتاز للواجهات العربية', family: "'Tajawal', sans-serif" },
  { id: 'Cairo', name: 'كايرو (Cairo)', desc: 'خط هندسي عربي عريض ومقروء لمختلف الأعمار', family: "'Cairo', sans-serif" },
  { id: 'Almarai', name: 'المرعي (Almarai)', desc: 'خط شاشة رقمي دقيق ومتزن', family: "'Almarai', sans-serif" },
  { id: 'Alexandria', name: 'الإسكندرية (Alexandria)', desc: 'خط عصري فاخر ذو حضور قوي', family: "'Alexandria', sans-serif" },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', desc: 'خط حديث باللغة اللاتينية والأرقام', family: "'Plus Jakarta Sans', sans-serif" },
];

export const DEFAULT_FONT_PREFERENCE: FontPreference = {
  fontSize: 16.5,
  fontFamily: "'Readex Pro', sans-serif",
  isBold: false,
  fontWeight: '400',
};

export const FontSettingsModal: React.FC<FontSettingsModalProps> = ({ isOpen, onClose }) => {
  const { effectiveUser } = useCRM();
  const storageKey = `shalaby_font_prefs_${effectiveUser.id || 'default'}`;

  const [prefs, setPrefs] = useState<FontPreference>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_FONT_PREFERENCE;
  });

  // Apply CSS Variables and Class overrides whenever prefs change
  useEffect(() => {
    applyFontPreferences(prefs);
  }, [prefs]);

  const applyFontPreferences = (p: FontPreference) => {
    const root = document.documentElement;
    root.style.setProperty('--app-font-size', `${p.fontSize}px`);
    root.style.setProperty('--app-font-family', p.fontFamily);
    root.style.setProperty('--app-font-weight', p.fontWeight);

    if (p.isBold || parseInt(p.fontWeight) >= 600) {
      root.classList.add('bold-mode');
    } else {
      root.classList.remove('bold-mode');
    }
  };

  const handleSave = (updated: FontPreference) => {
    setPrefs(updated);
    applyFontPreferences(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    handleSave(DEFAULT_FONT_PREFERENCE);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                إعدادات الخط والنصوص للمستخدم
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  {effectiveUser.name}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                خصص نوع الخط، الحجم الدقيق، وسمك الخط (بولد) لراحة عينك في النظام
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200">
          {/* 1. Font Size Control */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                حجم الخط ( Font Size ):
              </label>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-indigo-600 text-white rounded-lg shadow-sm">
                {prefs.fontSize}px
              </span>
            </div>

            {/* Slider */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-slate-400 font-bold">14px</span>
              <input
                type="range"
                min="14"
                max="22"
                step="0.5"
                value={prefs.fontSize}
                onChange={(e) => handleSave({ ...prefs, fontSize: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-xs text-slate-400 font-bold">22px</span>
            </div>

            {/* Fast Presets */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {[
                { label: 'صغير', size: 14.5 },
                { label: 'متناسق', size: 16.5 },
                { label: 'كبير', size: 18 },
                { label: 'كبير جداً', size: 19.5 },
                { label: 'ضخم', size: 21 },
              ].map((preset) => (
                <button
                  key={preset.size}
                  type="button"
                  onClick={() => handleSave({ ...prefs, fontSize: preset.size })}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                    prefs.fontSize === preset.size
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Bold Mode & Font Weight */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Bold className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  نمط الخط العريض ( Bold Mode ):
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تسميك الخط والنصوص عبر كافة الجداول والبطاقات لزيادة وضوح الرؤية
                </p>
              </div>

              {/* Bold Toggle Switch */}
              <button
                type="button"
                onClick={() =>
                  handleSave({
                    ...prefs,
                    isBold: !prefs.isBold,
                    fontWeight: !prefs.isBold ? '700' : '400',
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  prefs.isBold || parseInt(prefs.fontWeight) >= 600
                    ? 'bg-indigo-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    prefs.isBold || parseInt(prefs.fontWeight) >= 600 ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>

            {/* Font Weight Options */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { label: 'عادي (Normal)', weight: '400' as const },
                { label: 'متوسط (Medium)', weight: '500' as const },
                { label: 'عريض (Bold)', weight: '700' as const },
                { label: 'عريض جداً (Heavy)', weight: '800' as const },
              ].map((w) => (
                <button
                  key={w.weight}
                  type="button"
                  onClick={() =>
                    handleSave({
                      ...prefs,
                      fontWeight: w.weight,
                      isBold: parseInt(w.weight) >= 600,
                    })
                  }
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                    prefs.fontWeight === w.weight
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Font Family Selection */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Type className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              اختر عائلة نوع الخط ( Font Family ):
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FONT_OPTIONS.map((f) => {
                const isSelected = prefs.fontFamily === f.family;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSave({ ...prefs, fontFamily: f.family })}
                    className={`p-3 rounded-2xl text-right dir-rtl border transition-all cursor-pointer flex items-start justify-between ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/30'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div
                        className="font-bold text-sm text-slate-900 dark:text-slate-100"
                        style={{ fontFamily: f.family }}
                      >
                        {f.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.desc}</div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              معاينة حية لشكل النصوص والحجم الحالي ({prefs.fontSize}px):
            </label>
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 space-y-2">
              <div
                className="text-slate-900 dark:text-slate-100 leading-relaxed transition-all"
                style={{
                  fontSize: `${prefs.fontSize}px`,
                  fontFamily: prefs.fontFamily,
                  fontWeight: prefs.fontWeight,
                }}
              >
                نظام SHALABY المتكامل لإدارة العملاء والمبيعات والفروع والموظفين
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 border-t border-indigo-100 dark:border-indigo-900/40 pt-2 font-mono">
                <span>الحجم: {prefs.fontSize}px</span>
                <span>•</span>
                <span>السمك: {prefs.fontWeight}</span>
                <span>•</span>
                <span>عريض: {prefs.isBold ? 'نعم (Bold)' : 'عادي'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إعادة الضبط للافتراضي
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            اعتماد التفضيلات والإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
