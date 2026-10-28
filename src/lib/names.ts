/** Honorifics a customer may prefer. The title is stored as a prefix of the name ("م. أحمد"), so it shows everywhere. */
export const customerTitles = ["م.", "د.", "أ.", "الحاج", "الحاجة", "السيد", "السيدة", "المستشار", "الكابتن"] as const;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const titleRe = new RegExp(`^(${[...customerTitles, "المهندس", "المهندسة", "الدكتور", "الدكتورة", "الأستاذ", "الأستاذة", "أستاذ", "أ", "م", "د"].map(escapeRe).join("|")})(?=\\s|\\.)\\.?\\s*`, "u");

export function splitTitle(full: string): { title: string; name: string } {
  const text = (full || "").trim();
  const m = text.match(titleRe);
  if (!m) return { title: "", name: text };
  const raw = m[1];
  // Keep the spelling the user chose when it is one of the offered titles, otherwise show it as typed.
  const known = customerTitles.find((t) => t.replace(/\.$/, "") === raw.replace(/\.$/, ""));
  return { title: known ?? raw, name: text.slice(m[0].length).trim() };
}

export function withTitle(title: string, name: string): string {
  const n = name.trim();
  const t = title.trim();
  return t && n ? `${t} ${n}` : n;
}

/** What to call the customer in a message: their title and first name ("م. أحمد"). */
export function greetingName(full: string): string {
  const { title, name } = splitTitle(full);
  const first = name.split(/\s+/)[0] || name;
  return withTitle(title, first);
}
