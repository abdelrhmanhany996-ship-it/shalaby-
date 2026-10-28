import { useState } from "react";
import { Check, Download, RefreshCw, WifiOff, X } from "lucide-react";
import { usePWA } from "./PWAContext";
import { useDialog } from "../components/common/useDialog";

function InstallInstructions() {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!window.isSecureContext)
    return <p>للتثبيت، افتح الموقع من رابط HTTPS.</p>;
  if (import.meta.env.DEV)
    return <p>تثبيت التطبيق متاح بعد نشر نسخة الإنتاج على رابط HTTPS.</p>;
  return ios ? (
    <p>
      افتح الموقع في Safari، واضغط «مشاركة»، ثم «إضافة إلى الشاشة الرئيسية»،
      وبعدها «إضافة».
    </p>
  ) : (
    <p>
      في Chrome أو Edge، افتح قائمة المتصفح واختر «تثبيت شلبي CRM» أو «تثبيت
      هذا الموقع كتطبيق» لو الخيار ظاهر. على Safari في الماك، اختر «ملف» ثم
      «إضافة إلى Dock» لو متاح.
    </p>
  );
}
export function InstallAppButton() {
  const { installed, canInstall, requestInstall } = usePWA();
  const [help, setHelp] = useState(false);
  const dialog = useDialog(help, () => setHelp(false));
  if (installed) return null;
  return (
    <>
      <button
        className="icon-button"
        title="تثبيت التطبيق"
        aria-label="تثبيت التطبيق"
        onClick={() => (canInstall ? void requestInstall() : setHelp(true))}
      >
        <Download size={19} />
      </button>
      {help && (
        <div
          className="dialog-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setHelp(false);
          }}
        >
          <div
            ref={dialog}
            className="panel pwa-install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
          >
            <div className="panel-header">
              <h2 id="pwa-install-title">ثبّت شلبي على جهازك</h2>
              <button
                className="icon-button"
                onClick={() => setHelp(false)}
                aria-label="إغلاق تعليمات التثبيت"
              >
                <X size={19} />
              </button>
            </div>
            <div className="pwa-instructions">
              <InstallInstructions />
              <p>
                هيظهر بأيقونة مستقلة ويفتح في نافذته الخاصة. اتصال الإنترنت
                مطلوب عند فتح مساحة العمل.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export function PWAInstallCard() {
  const { installed, canInstall, requestInstall } = usePWA();
  return (
    <section
      className="panel pwa-install-card"
      aria-labelledby="pwa-settings-title"
    >
      <div>
        <h2 id="pwa-settings-title">شلبي على جهازك</h2>
        <p>
          {installed
            ? "التطبيق مفتوح كنسخة مثبتة على جهازك."
            : "ثبّت التطبيق على الموبايل أو اللاب وافتحه مباشرة من أيقونته."}
        </p>
      </div>
      {installed ? (
        <span className="status-pill is-success">
          <Check size={16} />
          مثبّت
        </span>
      ) : canInstall ? (
        <button className="btn-primary" onClick={() => void requestInstall()}>
          <Download size={17} />
          تثبيت التطبيق
        </button>
      ) : (
        <div className="pwa-instructions">
          <InstallInstructions />
        </div>
      )}
    </section>
  );
}
export function PWAStatus() {
  const { online, updateAvailable, updating, activateUpdate } = usePWA();
  const [later, setLater] = useState(false);
  if (!online)
    return (
      <div className="pwa-status" role="status">
        <WifiOff size={18} />
        <span>الاتصال بالإنترنت مقطوع.</span>
      </div>
    );
  if (!updateAvailable || later) return null;
  return (
    <section className="pwa-status" role="status" aria-label="تحديث التطبيق">
      <RefreshCw size={18} />
      <span>نسخة جديدة متاحة. احفظ شغلك قبل التحديث.</span>
      <button
        className="btn-primary"
        onClick={activateUpdate}
        disabled={updating}
      >
        {updating ? "جاري التحديث…" : "تحديث الآن"}
      </button>
      <button
        className="btn-text"
        onClick={() => setLater(true)}
        disabled={updating}
      >
        لاحقًا
      </button>
    </section>
  );
}
