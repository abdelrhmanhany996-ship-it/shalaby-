import type { User, UserRole } from "../types/crm";

// Existing stored role IDs are retained so saved prototype records remain compatible.
// admin = المطوّر (فوق كل المناصب، كل الصلاحيات + أدوات المطورين)
// general_manager = صاحب البيزنس (تحت المطوّر، ينشئه المطوّر)
// regional_manager = مدير المبيعات العام (كل الفروع، وبيتعامل كسيلز كمان)
// branch_manager = مدير مبيعات الفرع (هو سيلز الفرع، والعملاء بيتسجلوا باسمه)
// supervisor و sales_agent أدوار قديمة لسه شغالة لو موجودة، بس مش متاحة للإضافة.
export const positionRoles: UserRole[] = [
  "admin",
  "general_manager",
  "regional_manager",
  "branch_manager",
  "sales_agent",
];
export const positionNames: Record<UserRole, string> = {
  admin: "مطوّر",
  general_manager: "صاحب البيزنس",
  regional_manager: "مدير المبيعات العام",
  supervisor: "مشرف مختص",
  branch_manager: "مدير مبيعات الفرع",
  sales_agent: "سيلز",
  team_leader: "سيلز",
};
/** Roles that talk to customers and carry their own customers and ratings. */
export const salesCapableRoles: UserRole[] = ["sales_agent", "team_leader", "branch_manager", "regional_manager"];
export const isSalesCapable = (user: Pick<User, "role">) => salesCapableRoles.includes(user.role);
export const specialties = {
  sales: "المبيعات",
  accounts: "الحسابات",
  operations: "تشغيل الفروع",
};
export type Specialty = keyof typeof specialties;
export const permissionDefinitions = [
  ["customers.view", "عرض العملاء"],
  ["customers.create", "إضافة عملاء وزيارات"],
  ["customers.edit", "تعديل ملفات العملاء"],
  ["customers.contact", "التواصل مع العملاء المسندين للموظف"],
  ["customers.assign", "توزيع العملاء داخل نطاق العمل"],
  ["visits.view", "عرض سجل الزيارات"],
  ["followups.view", "عرض المتابعات"],
  ["followups.create", "جدولة المتابعات"],
  ["followups.complete", "تسجيل نتيجة المتابعات المسندة للموظف"],
  ["bookings.view", "عرض التعاقدات"],
  ["bookings.create", "تسجيل تعاقد"],
  ["invoices.view", "عرض الفواتير"],
  ["invoices.manage", "إنشاء وتحديث الفواتير"],
  ["reports.view", "عرض تقارير نطاق العمل"],
  ["staff.view", "عرض الموظفين"],
  ["staff.manage", "إضافة وإدارة الموظفين الأقل صلاحية"],
  ["teams.view", "عرض فرق العمل"],
  ["teams.manage", "إدارة فرق العمل"],
  ["branches.view", "عرض الفروع والأقسام"],
  ["organization.manage", "إدارة الهيكل والمسميات الوظيفية"],
  ["brokers.view", "عرض الوسطاء"],
  ["catalog.manage", "إدارة تصنيفات الفواتير والوسطاء"],
  ["audit.view", "عرض سجل العمليات"],
] as const;
export type Permission = (typeof permissionDefinitions)[number][0];
export type PermissionProfile =
  | "director"
  | "general"
  | "specialist_sales"
  | "specialist_accounts"
  | "specialist_operations"
  | "branch"
  | "employee";
export type PermissionMatrix = Record<PermissionProfile, Permission[]>;
export const profileNames: Record<PermissionProfile, string> = {
  director: "صاحب البيزنس",
  general: "مدير المبيعات العام",
  specialist_sales: "مشرف مختص · مبيعات",
  specialist_accounts: "مشرف مختص · حسابات",
  specialist_operations: "مشرف مختص · تشغيل الفروع",
  branch: "مدير مبيعات الفرع",
  employee: "سيلز",
};
const oversight: Permission[] = [
  "customers.view",
  "visits.view",
  "followups.view",
  "bookings.view",
  "invoices.view",
  "reports.view",
  "staff.view",
  "teams.view",
  "branches.view",
  "brokers.view",
];
const daily: Permission[] = [
  "customers.view",
  "customers.create",
  "customers.edit",
  "customers.contact",
  "visits.view",
  "followups.view",
  "followups.create",
  "followups.complete",
  "bookings.view",
  "bookings.create",
  "invoices.view",
  "invoices.manage",
  "reports.view",
];
export const defaultPermissionMatrix: PermissionMatrix = {
  director: [
    ...oversight,
    "staff.manage",
    "teams.manage",
    "organization.manage",
    "catalog.manage",
    "audit.view",
  ],
  // Also sells: registers customers, follows up and records purchases, besides seeing every branch.
  general: [
    ...oversight,
    "customers.create",
    "customers.edit",
    "customers.contact",
    "followups.create",
    "followups.complete",
    "bookings.create",
    "invoices.manage",
    "customers.assign",
    "staff.manage",
  ],
  specialist_sales: [
    "customers.view",
    "visits.view",
    "followups.view",
    "followups.create",
    "customers.edit",
    "customers.assign",
    "bookings.view",
    "reports.view",
    "staff.view",
    "teams.view",
  ],
  specialist_accounts: [
    "invoices.view",
    "invoices.manage",
    "bookings.view",
    "reports.view",
    "branches.view",
    "brokers.view",
  ],
  specialist_operations: [
    "visits.view",
    "followups.view",
    "reports.view",
    "staff.view",
    "teams.view",
    "branches.view",
  ],
  // The branch sales manager is the branch's salesperson: customers, visits, follow-ups, purchases, reviews.
  // Staff and structure screens come back when salespeople are added under them.
  branch: [...daily, "brokers.view"],
  employee: daily,
};
export const normalizeUser = (user: User): User => ({
  ...user,
  role: user.role === "team_leader" ? "sales_agent" : user.role,
});
export function permissionProfile(user: User): PermissionProfile {
  switch (user.role) {
    case "admin":
    case "general_manager":
      return "director";
    case "regional_manager":
      return "general";
    case "supervisor":
      return `specialist_${user.specialty || "sales"}`;
    case "branch_manager":
      return "branch";
    default:
      return "employee";
  }
}
export function sanitizeMatrix(
  value: Partial<PermissionMatrix> | null,
): PermissionMatrix {
  const result = {} as PermissionMatrix;
  for (const profile of Object.keys(
    defaultPermissionMatrix,
  ) as PermissionProfile[]) {
    result[profile] = Array.isArray(value?.[profile])
      ? [
          ...new Set(
            value![profile]!.filter((p) =>
              permissionDefinitions.some(([key]) => key === p),
            ),
          ),
        ]
      : [...defaultPermissionMatrix[profile]];
  }
  // The general sales manager always manages people below the owner: it cannot be switched off.
  result.general = [...new Set([...result.general, "staff.view", "staff.manage"])] as Permission[];
  return result;
}
export const withPermissions = (
  user: User,
  matrix: PermissionMatrix,
): User => ({
  ...normalizeUser(user),
  permissions: matrix[permissionProfile(user)],
});
// The developer (role "admin") always has every permission.
// TEMPORARY: while the per-role permissions are being reviewed, the general
// manager also has every permission. Set to false (or delete) once the matrix is final.
export const tempOverrides = { directorAllPermissions: true };

export const isDeveloper = (user: User) => user.role === "admin";

export const hasPermission = (user: User, permission: Permission): boolean =>
  user.role === "admin" ||
  (tempOverrides.directorAllPermissions && user.role === "general_manager") ||
  (
    user.permissions || defaultPermissionMatrix[permissionProfile(user)]
  ).includes(permission) &&
  (permissionDependencies[permission] || []).every((dep) =>
    hasPermission(user, dep),
  );
export const isDirector = (user: User) =>
  ["admin", "general_manager"].includes(user.role);

export const permissionDependencies: Partial<Record<Permission, Permission[]>> =
  {
    "customers.create": ["customers.view"],
    "customers.edit": ["customers.view"],
    "customers.contact": ["customers.view"],
    "customers.assign": ["customers.view", "staff.view"],
    "followups.create": ["followups.view", "customers.view"],
    "followups.complete": ["followups.view"],
    "bookings.create": ["bookings.view", "customers.view"],
    "invoices.manage": ["invoices.view"],
    "staff.manage": ["staff.view"],
    "teams.manage": ["teams.view", "staff.view"],
    "organization.manage": ["branches.view"],
    "catalog.manage": ["invoices.view", "brokers.view"],
  };
export function togglePermission(
  permissions: Permission[],
  key: Permission,
  enabled: boolean,
): Permission[] {
  const next = new Set(permissions);
  const add = (p: Permission) => {
    next.add(p);
    (permissionDependencies[p] || []).forEach(add);
  };
  if (enabled) add(key);
  else {
    next.delete(key);
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of next)
        if ((permissionDependencies[p] || []).some((dep) => !next.has(dep))) {
          next.delete(p);
          changed = true;
        }
    }
  }
  return [...next];
}
