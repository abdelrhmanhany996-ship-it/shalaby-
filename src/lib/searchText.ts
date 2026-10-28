/** Arabic-friendly text for matching: no diacritics or tatweel, أ/إ/آ as ا, ى as ي, ة as ه. */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

/** Does a name or phone match what was typed? Digits need at least 3 to count as a phone search. */
export function matchesPerson(person: { name: string; phone?: string }, typed: string): boolean {
  const t = norm(typed);
  if (!t) return false;
  const digits = typed.replace(/\D/g, "");
  return norm(person.name).includes(t) || (digits.length >= 3 && (person.phone || "").replace(/\D/g, "").includes(digits));
}
