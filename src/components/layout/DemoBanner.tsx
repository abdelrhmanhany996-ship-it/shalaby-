import { FlaskConical } from "lucide-react";
import { useCRM } from "../../context/CRMContext";

/** Reminder for whoever loaded the sample data: what is on screen is not real until it is removed. */
export function DemoBanner({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { demoSummary, currentUser } = useCRM();
  if (!demoSummary.any || currentUser.role !== "admin") return null;
  return (
    <div className="notice" role="status" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <FlaskConical size={17} />
      <span style={{ flex: 1, minWidth: 200 }}>
        <strong>بيانات تجريبية محمّلة</strong> ({demoSummary.customers} عميل · {demoSummary.branches} فرع · {demoSummary.staff} موظف). الأرقام اللي قدامك فيها بيانات وهمية.
      </span>
      <button onClick={onOpenSettings}>الإعدادات</button>
    </div>
  );
}
