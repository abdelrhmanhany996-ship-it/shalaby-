export type NotBoughtReasonId =
  | "price"
  | "comparing"
  | "competitor"
  | "unavailable"
  | "postponed"
  | "needs_approval"
  | "service"
  | "just_asking"
  | "other"
  | "unknown";

export const notBoughtReasons: { id: NotBoughtReasonId; label: string }[] = [
  { id: "price", label: "السعر أعلى من المتوقع" },
  { id: "comparing", label: "بيقارن بمحلات تانية" },
  { id: "competitor", label: "اشترى من منافس" },
  { id: "unavailable", label: "المنتج أو اللون مش متوفر" },
  { id: "postponed", label: "مؤجل، مش وقت التنفيذ" },
  { id: "needs_approval", label: "محتاج موافقة (شريك / مهندس / أهل)" },
  { id: "service", label: "الفرع بعيد أو الخدمة ما عجبتوش" },
  { id: "just_asking", label: "مجرد استفسار، مش جاد" },
  { id: "other", label: "أخرى" },
  { id: "unknown", label: "مش عارف / العميل ما قالش" },
];

export const reasonLabel = (id: NotBoughtReasonId) =>
  notBoughtReasons.find((r) => r.id === id)?.label ?? id;

/** A salesperson may pick at most two reasons; "unknown" is exclusive. */
export function toggleReason(
  current: NotBoughtReasonId[],
  id: NotBoughtReasonId,
): NotBoughtReasonId[] {
  if (id === "unknown") return current.includes("unknown") ? [] : ["unknown"];
  const without = current.filter((r) => r !== "unknown");
  if (without.includes(id)) return without.filter((r) => r !== id);
  return [...without, id].slice(-2);
}

/** Follow-up scheduled when the salesperson does not know why the customer did not buy. */
export const unknownReasonQuestion =
  "اسأل العميل بلطف: إيه اللي خلاك ما كملتش الشراء؟ (السعر؟ منافس؟ مش وقته؟)";
export const unknownReasonFollowUpDays = 2;
