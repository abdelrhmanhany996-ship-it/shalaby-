const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const DOMAIN = "staff.shalaby.local";

/**
 * Staff sign in with a mobile number (or a username) instead of an e-mail. Firebase
 * Auth needs an e-mail-shaped id, so the number becomes `<id>@staff.shalaby.local`.
 * Nothing is ever sent to that address.
 */
export function normalizeLoginId(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d))).replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
  const digitsOnly = s.replace(/[\s\-()+.]/g, "");
  if (/^\d+$/.test(digitsOnly)) {
    // +20 10 1234 5678 / 0020 10... -> 010...
    if (digitsOnly.startsWith("0020")) return `0${digitsOnly.slice(4)}`;
    if (digitsOnly.startsWith("20") && digitsOnly.length === 12) return `0${digitsOnly.slice(2)}`;
    return digitsOnly;
  }
  return s.replace(/[^a-z0-9._-]/g, "");
}

export function isValidLoginId(input: string): boolean {
  if (input.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
  const id = normalizeLoginId(input);
  return /^\d{8,15}$/.test(id) || /^[a-z][a-z0-9._-]{2,30}$/.test(id);
}

/** The Firebase e-mail for what the person typed (a real e-mail is kept as is). */
export function toAuthEmail(input: string): string {
  const t = input.trim();
  if (t.includes("@")) return t.toLowerCase();
  return `${normalizeLoginId(t)}@${DOMAIN}`;
}

/** What to show a person for their own sign-in id. */
export function displayLoginId(email: string | null | undefined): string {
  if (!email) return "";
  return email.endsWith(`@${DOMAIN}`) ? email.slice(0, -(DOMAIN.length + 1)) : email;
}
