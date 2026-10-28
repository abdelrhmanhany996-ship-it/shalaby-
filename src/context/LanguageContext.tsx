import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "ar" | "en";

interface LanguageContextType {
  language: Language;
  direction: "rtl" | "ltr";
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Brand & System
    "app.name": "شلبي CRM",
    "app.subtitle": "شلبي",
    "app.view_as_active": "أنت الآن في وضع المعاينة (View As)",
    "app.exit_view_as": "إنهاء وضع المعاينة",

    // Roles
    "role.admin": "مطوّر",
    "role.general_manager": "صاحب البيزنس",
    "role.regional_manager": "مدير المبيعات العام",
    "role.branch_manager": "مدير مبيعات الفرع",
    "role.supervisor": "مشرف مختص",
    "role.team_leader": "سيلز بالفرع",
    "role.sales_agent": "سيلز بالفرع",

    // Customer Categories
    "category.individual": "عميل فردي",
    "category.engineering_company": "شركة هندسية",
    "category.decor_company": "شركة تصميم وديكور",
    "category.contractor": "مقاول تنفيذ",
    "category.engineer": "مهندس استشاري / حر",
    "category.painter": "فني دهانات / نقاش",
    "category.technician": "فني / عامل",
    "category.broker_individual": "سمسار / وسيط فردي",
    "category.broker_company": "شركة وساطة عقارية",

    // Departments
    "dept.construction": "قسم الإنشائي والمقاولات",
    "dept.decor": "إدارة المبيعات",
    "dept.garden": "قسم البستان واللاندسكيب",
    "dept.general": "قسم المتنوع والخدمات",

    // Navigation - Admin
    "nav.dept_dashboard": "الرئيسية (الأقسام والمبيعات)",
    "nav.analytics_dashboard": "نظرة عامة والتحليلات العامة",
    "nav.dashboard": "الرئيسية",
    "nav.users_staff": "المستخدمون والموظفون",
    "nav.hierarchy": "الهيكل الإداري",
    "nav.branches": "إدارة الفروع والشركات والمخازن",
    "nav.teams": "فرق التنفيذ والتعاقدات",
    "nav.all_clients": "إدارة العملاء",
    "nav.my_clients": "عملائي",
    "nav.branch_clients": "عملاء الفرع",
    "nav.team_clients": "عملاء الفريق",
    "nav.visits_inquiries": "الزيارات والمعاينات",
    "nav.followups": "المتابعات",
    "nav.my_followups": "متابعاتي",
    "nav.due_followups": "المتابعات المستحقة",
    "nav.overdue_followups": "المتابعات المتأخرة",
    "nav.bookings": "المشتريات",
    "nav.invoices": "فواتير المشتريات والتصنيفات",
    "nav.brokers": "الوسطاء وجاهات الترشيح",
    "nav.reports": "التقارير والتحليلات",
    "nav.targets": "الأهداف والعمولات",
    "nav.audit_log": "سجل العمليات",
    "nav.settings": "إعدادات النظام",
    "nav.add_client": "إضافة عميل جديد",
    "nav.record_visit": "تسجيل معاينة / زيارة",
    "nav.my_performance": "أدائي الشخصي",
    "nav.staff_performance": "أداء الموظفين",

    // Lead Statuses
    "status.new": "طلب جديد",
    "status.uncontacted": "لم يتم التواصل",
    "status.contacted": "تم التواصل",
    "status.interested": "مهتم بالتعاقد",
    "status.prospect": "عميل محتمل",
    "status.needs_followup": "يحتاج متابعة",
    "status.not_interested": "غير مهتم",
    "status.booked": "اشترى",

    // FollowUp Statuses
    "followup.due": "مستحقة اليوم",
    "followup.upcoming": "قادمة",
    "followup.completed": "مكتملة",
    "followup.overdue": "متأخرة",
    "followup.cancelled": "ملغاة",

    // Actions & Common
    "action.search": "بحث...",
    "action.filter": "تصفية",
    "action.add": "إضافة",
    "action.edit": "تعديل",
    "action.delete": "حذف",
    "action.save": "حفظ التغييرات",
    "action.cancel": "إلغاء",
    "action.confirm": "تأكيد",
    "action.view": "عرض التفاصيل",
    "action.reassign": "تغيير المسؤول",
    "action.log_interaction": "تسجيل تواصل",
    "action.add_followup": "جدولة متابعة",
    "action.add_booking": "إتمام التعاقد",
    "action.view_as": "معاينة كـ",
    "action.export_csv": "تصدير CSV",
    "action.reset_data": "إعادة ضبط البيانات",

    // Table headers
    "th.name": "الاسم",
    "th.phone": "رقم الهاتف",
    "th.whatsapp": "رقم الواتس",
    "th.department": "القسم المطلوبة",
    "th.status": "الحالة",
    "th.branch": "الفرع",
    "th.assigned_to": "المسؤول",
    "th.source": "المصدر",
    "th.next_followup": "المتابعة القادمة",
    "th.ratings": "التقييمات",
    "th.created_at": "تاريخ التسجيل",
    "th.actions": "الإجراءات",

    // Ratings
    "rating.location": "تقييم المكان والفرع",
    "rating.treatment": "تقييم المعاملة والاستقبال",
    "rating.price": "تقييم الأسعار والتكلفة",

    // Duplicate Modal
    "duplicate.title": "تنبيه: يوجد عميل مسجل بنفس رقم الهاتف أو الواتس!",
    "duplicate.message":
      "تم العثور على سجل سابق لهذا الرقم. يرجى إضافة التفاعل للسجل الموجود بدلاً من التكرار.",
    "duplicate.view_existing": "فتح سجل العميل الحالي",
    "duplicate.add_as_interaction": "إضافة التفاعل لسجله الحالي",
  },
  en: {
    // Brand & System
    "app.name": "Shalaby CRM",
    "app.subtitle": "Shalaby Sales Management",
    "app.view_as_active": "You are currently in View As Mode",
    "app.exit_view_as": "Exit View As",

    // Roles
    "role.admin": "General Manager (Admin)",
    "role.branch_manager": "Branch Manager",
    "role.supervisor": "Department Supervisor",
    "role.team_leader": "Team Leader",
    "role.sales_agent": "Sales Agent",

    // Departments
    "dept.construction": "Construction & Contracting",
    "dept.decor": "Sales Management",
    "dept.garden": "Garden & Landscaping",
    "dept.general": "General & Supplies",

    // Navigation
    "nav.dept_dashboard": "Main (Departments & Sales)",
    "nav.analytics_dashboard": "General Analytics & Follow-ups",
    "nav.dashboard": "Main Overview",
    "nav.users_staff": "Users & Staff",
    "nav.hierarchy": "Admin Hierarchy",
    "nav.branches": "Branch Management",
    "nav.teams": "Execution & Sales Teams",
    "nav.all_clients": "Client Management",
    "nav.my_clients": "My Clients",
    "nav.branch_clients": "Branch Clients",
    "nav.team_clients": "Team Clients",
    "nav.visits_inquiries": "Visits & Surveys",
    "nav.followups": "Follow-ups",
    "nav.my_followups": "My Follow-ups",
    "nav.due_followups": "Due Follow-ups",
    "nav.overdue_followups": "Overdue Follow-ups",
    "nav.bookings": "Orders & Contracts",
    "nav.reports": "Reports & Analytics",
    "nav.targets": "Targets & Commissions",
    "nav.audit_log": "Audit Log",
    "nav.settings": "System Settings",
    "nav.add_client": "Add New Client",
    "nav.record_visit": "Record Visit / Survey",
    "nav.my_performance": "My Performance",
    "nav.staff_performance": "Staff Performance",

    // Lead Statuses
    "status.new": "New Lead",
    "status.uncontacted": "Uncontacted",
    "status.contacted": "Contacted",
    "status.interested": "Interested",
    "status.prospect": "Prospect",
    "status.needs_followup": "Needs Follow-up",
    "status.not_interested": "Not Interested",
    "status.booked": "Contracted & Closed",

    // FollowUp Statuses
    "followup.due": "Due Today",
    "followup.upcoming": "Upcoming",
    "followup.completed": "Completed",
    "followup.overdue": "Overdue",
    "followup.cancelled": "Cancelled",

    // Actions & Common
    "action.search": "Search...",
    "action.filter": "Filter",
    "action.add": "Add",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.save": "Save Changes",
    "action.cancel": "Cancel",
    "action.confirm": "Confirm",
    "action.view": "View Details",
    "action.reassign": "Reassign",
    "action.log_interaction": "Log Interaction",
    "action.add_followup": "Schedule Follow-up",
    "action.add_booking": "Close Order / Contract",
    "action.view_as": "View As",
    "action.export_csv": "Export CSV",
    "action.reset_data": "Reset Data",

    // Table headers
    "th.name": "Name",
    "th.phone": "Phone Number",
    "th.whatsapp": "WhatsApp Number",
    "th.department": "Department",
    "th.status": "Status",
    "th.branch": "Branch",
    "th.assigned_to": "Assigned To",
    "th.source": "Source",
    "th.next_followup": "Next Follow-up",
    "th.ratings": "Ratings",
    "th.created_at": "Registered",
    "th.actions": "Actions",

    // Ratings
    "rating.location": "Location Rating",
    "rating.treatment": "Service Rating",
    "rating.price": "Price Rating",

    // Duplicate Modal
    "duplicate.title": "Alert: Existing Client Found with Same Phone/WhatsApp!",
    "duplicate.message":
      "A record already exists for this number. Avoid creating duplicate entries.",
    "duplicate.view_existing": "Open Existing Record",
    "duplicate.add_as_interaction": "Add Interaction to Existing Timeline",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("almasar_crm_lang") as Language) || "ar";
  });

  const direction = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    localStorage.setItem("almasar_crm_lang", language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations["ar"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
