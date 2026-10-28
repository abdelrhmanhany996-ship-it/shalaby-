import { PWAInstallCard } from "../pwa/PWAControls";
import { isDirector } from "../lib/permissions";
import React, { useState, useEffect } from "react";
import { useCRM } from "../context/CRMContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import {
  Settings,
  RefreshCw,
  Save,
  ShieldAlert,
  BookOpen,
  CheckCircle2,
  Type,
  Sliders,
  Bold,
  Eye,
  RotateCcw,
  Check,
  Sparkles,
  Sun,
  Moon,
  Globe,
  Palette,
  Languages,
} from "lucide-react";

export interface FontPreference {
  fontSize: number;
  fontFamily: string;
  isBold: boolean;
  fontWeight: "400" | "500" | "600" | "700" | "800";
}

export const FONT_OPTIONS = [
  {
    id: "IBM Plex Sans Arabic",
    name: "خط شلبي",
    desc: "الخط الأساسي، محمّل محليًا",
    family: "'IBM Plex Sans Arabic', Arial, sans-serif",
  },
  {
    id: "Arial",
    name: "خط الجهاز",
    desc: "خط بسيط من خطوط جهازك",
    family: "Arial, sans-serif",
  },
];

export const DEFAULT_FONT_PREFERENCE: FontPreference = {
  fontSize: 16,
  fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif",
  isBold: false,
  fontWeight: "400",
};

export const SettingsPage: React.FC = () => {
  const { resetAllData, effectiveUser, currentUser, loadDemoData, removeDemoData, previewDemoRemoval, demoSummary } = useCRM();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [fontSavedSuccess, setFontSavedSuccess] = useState(false);

  // Font settings state
  const storageKey = `shalaby_font_prefs_${effectiveUser.id || "default"}`;
  const [fontPrefs, setFontPrefs] = useState<FontPreference>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_FONT_PREFERENCE;
  });

  const applyFontPreferences = (p: FontPreference) => {
    const root = document.documentElement;
    root.style.setProperty("--app-font-size", `${p.fontSize}px`);
    root.style.setProperty("--app-font-family", p.fontFamily);
    root.style.setProperty("--app-font-weight", p.fontWeight);

    if (p.isBold || parseInt(p.fontWeight) >= 600) {
      root.classList.add("bold-mode");
    } else {
      root.classList.remove("bold-mode");
    }
  };

  useEffect(() => {
    applyFontPreferences(fontPrefs);
  }, [fontPrefs]);

  const handleSaveFontPrefs = (updated: FontPreference) => {
    setFontPrefs(updated);
    applyFontPreferences(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setFontSavedSuccess(true);
    setTimeout(() => setFontSavedSuccess(false), 2500);
  };

  const handleResetFontPrefs = () => {
    handleSaveFontPrefs(DEFAULT_FONT_PREFERENCE);
  };

  const handleReset = () => {
    if (
      window.confirm("سيتم مسح الذاكرة المؤقتة وجلسة هذا المتصفح فقط (بيانات النظام على السيرفر لن تتأثر). متابعة؟")
    ) {
      resetAllData();
      alert("تم مسح الذاكرة المؤقتة بنجاح!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>إعدادات النظام، الثيم، اللغة والخطوط</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          إدارة تفضيلات المظهر والوضع الداكن، لغة العرض، ونوع وحجم الخط
        </p>
      </div>

      <PWAInstallCard />
      {/* 1. Theme & Language Settings Section */}
      <div className="glass-card p-6 rounded-2xl shadow-xs space-y-5">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#dc424b]" />
            <span>مظهر النظام والوضع الداكن واللغة (Theme & Language)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            تخصيص ثيم النظام والوضع الليلي/الفاتح وتغيير لغة الواجهة
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Theme Selector */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>وضع الألوان والمظهر (Theme Mode):</span>
            </label>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                  theme === "light"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>الوضع الفاتح</span>
                </div>
                {theme === "light" && (
                  <Check className="w-4 h-4 text-amber-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-600 text-slate-100 ring-2 ring-slate-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-[#dc424b]" />
                  <span>الوضع الداكن / الليلي</span>
                </div>
                {theme === "dark" && (
                  <Check className="w-4 h-4 text-[#dc424b]" />
                )}
              </button>
            </div>
          </div>

          {/* Language Selector */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#dc424b]" />
              <span>لغة الواجهة (Interface Language):</span>
            </label>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLanguage("ar")}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                  language === "ar"
                    ? "bg-slate-100 dark:bg-slate-800 border-slate-600 dark:border-slate-500 text-slate-900 dark:text-slate-100 ring-2 ring-slate-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#dc424b]" />
                  <span>العربية (Arabic)</span>
                </div>
                {language === "ar" && (
                  <Check className="w-4 h-4 text-[#dc424b]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                  language === "en"
                    ? "bg-slate-100 dark:bg-slate-800 border-slate-600 dark:border-slate-500 text-slate-900 dark:text-slate-100 ring-2 ring-slate-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#dc424b]" />
                  <span>English (الإنجليزية)</span>
                </div>
                {language === "en" && (
                  <Check className="w-4 h-4 text-[#dc424b]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Font & Typography Settings Section */}
      <div className="glass-card p-6 rounded-2xl shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
            <Type className="w-5 h-5 text-[#dc424b]" />
            <span>
              تخصيص الخطوط وحجم النصوص للمستخدم ({effectiveUser.name})
            </span>
          </h3>
          {fontSavedSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> تم تطبيق الإعدادات وحفظها!
            </span>
          )}
        </div>

        {/* 1. Font Size Slider */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#dc424b]" />
              حجم الخط والنصوص ( Font Size ):
            </label>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-800 dark:bg-slate-700 text-white rounded-lg shadow-xs">
              {fontPrefs.fontSize}px
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-slate-400 font-bold">14px</span>
            <input
              type="range"
              min="14"
              max="22"
              step="0.5"
              value={fontPrefs.fontSize}
              onChange={(e) =>
                handleSaveFontPrefs({
                  ...fontPrefs,
                  fontSize: parseFloat(e.target.value),
                })
              }
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-700"
            />
            <span className="text-xs text-slate-400 font-bold">22px</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {[
              { label: "صغير", size: 14.5 },
              { label: "متناسق", size: 16.5 },
              { label: "كبير", size: 18 },
              { label: "كبير جداً", size: 19.5 },
              { label: "ضخم", size: 21 },
            ].map((preset) => (
              <button
                key={preset.size}
                type="button"
                onClick={() =>
                  handleSaveFontPrefs({ ...fontPrefs, fontSize: preset.size })
                }
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  fontPrefs.fontSize === preset.size
                    ? "bg-slate-800 text-white border-slate-700 dark:bg-slate-700 dark:border-slate-600 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
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
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bold className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                تفعيل الخط العريض ( Bold Mode ):
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                تسميك كافة النصوص والجداول لتسهيل القراءة وتوضيح بيانات العملاء
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                handleSaveFontPrefs({
                  ...fontPrefs,
                  isBold: !fontPrefs.isBold,
                  fontWeight: !fontPrefs.isBold ? "700" : "400",
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                fontPrefs.isBold || parseInt(fontPrefs.fontWeight) >= 600
                  ? "bg-indigo-600"
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  fontPrefs.isBold || parseInt(fontPrefs.fontWeight) >= 600
                    ? "translate-x-1"
                    : "translate-x-6"
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { label: "عادي (Normal)", weight: "400" as const },
              { label: "متوسط (Medium)", weight: "500" as const },
              { label: "عريض (Bold)", weight: "700" as const },
              { label: "عريض جداً (Heavy)", weight: "800" as const },
            ].map((w) => (
              <button
                key={w.weight}
                type="button"
                onClick={() =>
                  handleSaveFontPrefs({
                    ...fontPrefs,
                    fontWeight: w.weight,
                    isBold: parseInt(w.weight) >= 600,
                  })
                }
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  fontPrefs.fontWeight === w.weight
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Font Family Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Type className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            نوع الخط المفضل ( Font Family ):
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {FONT_OPTIONS.map((f) => {
              const isSelected = fontPrefs.fontFamily === f.family;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    handleSaveFontPrefs({ ...fontPrefs, fontFamily: f.family })
                  }
                  className={`p-3 rounded-2xl text-right dir-rtl border transition-all cursor-pointer flex items-start justify-between ${
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/30"
                      : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div>
                    <div
                      className="font-bold text-xs text-slate-900 dark:text-slate-100"
                      style={{ fontFamily: f.family }}
                    >
                      {f.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {f.desc}
                    </div>
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
        <div className="space-y-2 pt-1">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
            معاينة فورية لشكل الخط والنصوص المحددة ({fontPrefs.fontSize}px):
          </label>
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 space-y-2">
            <div
              className="text-slate-900 dark:text-slate-100 leading-relaxed transition-all"
              style={{
                fontSize: `${fontPrefs.fontSize}px`,
                fontFamily: fontPrefs.fontFamily,
                fontWeight: fontPrefs.fontWeight,
              }}
            >
              نظام SHALABY المتكامل لإدارة العملاء والمبيعات والفروع والموظفين
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-indigo-100 dark:border-indigo-900/40 pt-2 font-mono">
              <div className="flex items-center gap-3">
                <span>الحجم: {fontPrefs.fontSize}px</span>
                <span>•</span>
                <span>السمك: {fontPrefs.fontWeight}</span>
                <span>•</span>
                <span>عريض: {fontPrefs.isBold ? "نعم (Bold)" : "عادي"}</span>
              </div>
              <button
                type="button"
                onClick={handleResetFontPrefs}
                className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                إعادة للوضع الافتراضي
              </button>
            </div>
          </div>
        </div>
      </div>

      {isDirector(effectiveUser) && (
        <>
          {" "}
          {currentUser.role === "admin" && (
            <div className="bg-sky-50/60 dark:bg-sky-950/20 p-6 rounded-2xl border border-sky-200 dark:border-sky-900 shadow-xs space-y-3">
              <div className="font-bold text-sm text-sky-900 dark:text-sky-300">
                بيانات تجريبية لاستكشاف الأدوار
              </div>
              <p className="text-xs text-sky-800 dark:text-sky-300 leading-6">
                تحمّل فروعًا وموظفين وعملاء ووسطاء وزيارات ومشتريات وتقييمات وهمية، عشان تجرّب النظام بعين كل دور.
                كل حاجة بتتحمّل بعلامة «تجريبي»، فتقدر تحمّلها في أي وقت وتحذفها بضغطة من غير ما تلمس أي بيانات حقيقية
                سجّلتها. الحذف بيشيل كمان أي حاجة اتسجلت على عملاء تجريبيين (زيارات، متابعات، مشتريات، تقييمات، سجل التعاملات).
              </p>
              <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
                {demoSummary.any
                  ? `محمّل حاليًا: ${demoSummary.customers} عميل · ${demoSummary.branches} فرع · ${demoSummary.staff} موظف · ${demoSummary.brokers} وسيط`
                  : "مفيش بيانات تجريبية محمّلة دلوقتي."}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    await loadDemoData();
                    alert("تم تحميل البيانات التجريبية");
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  تحميل البيانات التجريبية
                </button>
                <button
                  onClick={async () => {
                    const { total, realLinked } = await previewDemoRemoval();
                    if (!total) {
                      alert("مفيش بيانات تجريبية لحذفها.");
                      return;
                    }
                    const warn = realLinked
                      ? `\n\nتنبيه: ${realLinked} عميل حقيقي مربوط بفرع أو موظف تجريبي. هيفضلوا زي ما هم، بس هيبقى مسؤولهم أو فرعهم محذوف.`
                      : "";
                    if (window.confirm(`هيتحذف ${total} سجل تجريبي (فروع وموظفين وعملاء وكل اللي اتسجل عليهم). بياناتك الحقيقية مش هتتأثر.${warn}\n\nمتأكد؟`)) {
                      await removeDemoData();
                      alert("اتحذفت البيانات التجريبية.");
                    }
                  }}
                  className="px-4 py-2 border border-sky-600 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  حذف البيانات التجريبية
                </button>
              </div>
            </div>
          )}

          {/* Browser cache only: the system's data is on the server and is not touched. */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <RefreshCw className="w-4 h-4" />
              <span>مسح ذاكرة المتصفح</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              بيمسح الإعدادات المحفوظة على الجهاز ده بس (زي المظهر والخط). بيانات النظام نفسها (العملاء والزيارات والمشتريات) على
              السيرفر ومش بتتأثر.
            </p>
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold cursor-pointer"
            >
              مسح ذاكرة المتصفح
            </button>
          </div>
        </>
      )}
    </div>
  );
};
