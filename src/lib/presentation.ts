import type { Booking, FollowUp, Lead, User, Branch } from "../types/crm";

export const departmentNames = {
  construction: "الإنشائي والمقاولات",
  decor: "إدارة المبيعات",
  garden: "البستان واللاندسكيب",
  general: "خدمات أخرى",
};
export const statusNames: Record<Lead["status"], string> = {
  new: "جديد",
  uncontacted: "لم نتواصل بعد",
  contacted: "تم التواصل",
  interested: "مهتم",
  prospect: "فرصة بيع",
  needs_followup: "يحتاج متابعة",
  not_interested: "غير مهتم",
  booked: "اشترى",
};
export const followUpTypeNames: Record<string, string> = {
  call: "اتصال",
  whatsapp: "واتساب",
  branch_visit: "زيارة فرع",
  email: "بريد",
  meeting: "اجتماع",
};
export const sourceNames: Record<Lead["source"], string> = {
  facebook: "فيسبوك",
  instagram: "إنستجرام",
  google: "جوجل",
  walk_in: "زيارة الفرع",
  referral: "ترشيح",
  phone_inquiry: "اتصال هاتفي",
  whatsapp: "واتساب",
  exhibition: "معرض",
  other: "مصدر آخر",
};
export { positionNames as roleNames } from "./permissions";
export { canSeeBranch } from "./access";
export const isManagement = (user: User) =>
  !["sales_agent", "team_leader"].includes(user.role);
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const followUpStatus = (item: FollowUp): FollowUp["status"] => {
  if (item.status === "completed" || item.status === "cancelled")
    return item.status;
  const date = item.scheduledAt.slice(0, 10);
  return date < today() ? "overdue" : date === today() ? "due" : "upcoming";
};
export const phoneNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  return digits.startsWith("01") && digits.length === 11
    ? `2${digits}`
    : digits;
};
export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(amount);
