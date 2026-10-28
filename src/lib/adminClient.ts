import { auth } from "./firebase";

const ENDPOINT = "/api/admin.php";

export async function adminStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT}?ping=1`, { cache: "no-store" });
    return !!(await res.json())?.configured;
  } catch {
    return false;
  }
}

/** Asks the server to set a fresh RANDOM password for a staff member (it also forces a change at next sign-in). */
export async function resetStaffPassword(userId: string): Promise<{ password: string; loginId: string | null }> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action: "reset_password", userId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.error as string | undefined;
    const msg: Record<string, string> = {
      not_configured: "إعادة التعيين لسه مش متفعّلة على السيرفر (محتاجة مفتاح Firebase Admin).",
      no_login: "الموظف ده ملوش حساب دخول لسه.",
      forbidden: "مش مسموح لك تعيد تعيين كلمة مرور الشخص ده.",
      rate_limited: "محاولات كتير، جرّب بعد شوية.",
      unauthorized: "سجّل الدخول من جديد وحاول تاني.",
    };
    throw new Error(`${(code && msg[code]) || "تعذر إعادة التعيين، حاول تاني."}${data?.detail ? ` (${data.detail})` : ""}`);
  }
  return { password: data.password, loginId: data.loginId ?? null };
}

/**
 * Creates a staff member's sign-in on the server (the browser never creates accounts, so self sign-up can stay off).
 * Returns null when the server is not set up yet, so the caller can fall back.
 */
export async function createLoginOnServer(userId: string, loginId: string, password: string): Promise<string | null> {
  const token = await auth.currentUser?.getIdToken();
  // The staff record may still be on its way to the database: retry briefly if the server can't see it yet.
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action: "create_login", userId, loginId, password }),
    }).catch(() => null);
    if (!res) return null;
    const data = await res.json().catch(() => ({}));
    if (res.ok) return String(data.uid);
    if (res.status === 503 || res.status === 404 && data?.error !== "user_not_found") return null;
    if (data?.error === "user_not_found" && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1200));
      continue;
    }
    const msg: Record<string, string> = {
      login_taken: "رقم الدخول ده مستخدم لحساب تاني.",
      forbidden: "مش مسموح لك تعمل حساب للشخص ده.",
      already_has_login: "الموظف ده عنده حساب دخول بالفعل.",
      bad_login_id: "رقم الدخول لازم يكون رقم موبايل أو اسم مستخدم إنجليزي.",
      weak_password: "كلمة المرور لازم تكون 8 حروف على الأقل.",
      rate_limited: "محاولات كتير، جرّب بعد شوية.",
    };
    throw new Error(msg[data?.error] || "تعذر إنشاء حساب الدخول، حاول تاني.");
  }
  return null;
}

/** Removes a person's sign-in account on the server (developer only). Returns false when the server is not set up. */
export async function deleteLoginOnServer(userId: string): Promise<boolean> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action: "delete_login", userId }),
  }).catch(() => null);
  if (!res) return false;
  if (res.status === 503) return false;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error === "forbidden" ? "مش مسموح لك تمسح حساب الدخول ده." : "تعذر مسح حساب الدخول من السيرفر، حاول تاني.");
  return true;
}

async function adminPost(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.error as string | undefined;
    const msg: Record<string, string> = {
      not_configured: "السيرفر لسه مش متوصّل بمفتاح Firebase Admin (crm-firebase-admin.json).",
      no_permission: "حساب السيرفر ما عندوش صلاحية: لازم دور «Cloud Datastore Import Export Admin» وصلاحية الكتابة على الـ bucket.",
      bucket_missing: "الـ bucket مش موجود. اعمله في Cloud Storage بالاسم المعروض.",
      forbidden: "الإجراء ده للمطوّر بس.",
      rate_limited: "محاولات كتير، جرّب بعد شوية.",
      unauthorized: "سجّل الدخول من جديد وحاول تاني.",
    };
    throw new Error(`${(code && msg[code]) || "تعذر تنفيذ الطلب، حاول تاني."}${data?.detail ? ` (${data.detail})` : ""}`);
  }
  return data;
}

/** Developer only: starts a full export of the database into the backup bucket (a restore point). */
export const startBackup = () => adminPost({ action: "backup_now" }) as Promise<{ operation: string; point: string; bucket: string }>;
export const backupStatus = (operation: string) => adminPost({ action: "backup_status", operation }) as Promise<{ done: boolean; error: string | null }>;
export const listBackups = () => adminPost({ action: "list_backups" }) as Promise<{ bucket: string; points: string[] }>;
