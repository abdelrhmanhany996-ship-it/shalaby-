import { Eye, X } from "lucide-react";
import { useCRM } from "../../context/CRMContext";
export function ViewAsBar() {
  const { viewAsUser, setViewAsUser } = useCRM();
  if (!viewAsUser) return null;
  return (
    <div className="preview-bar">
      <span>
        <Eye size={15} />
        أنت بتشوف النظام كـ: {viewAsUser.name}
      </span>
      <button onClick={() => setViewAsUser(null)}>
        إنهاء المعاينة
        <X size={14} />
      </button>
    </div>
  );
}
