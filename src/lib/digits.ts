/** Arabic-Indic (٠-٩) and Persian (۰-۹) digits as plain 0-9, so a number typed on an Arabic keyboard is still a number. */
export const toLatinDigits = (s: string): string =>
  s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
