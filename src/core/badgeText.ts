/**
 * Characters the badge's JetBrains Mono build renders: printable ASCII, Spanish
 * Latin-1, and a few symbols. Shared by the badge (to validate server text before
 * drawing it) and the backend (to validate model output before sending it).
 */
export const BADGE_TEXT = /^[\x20-\x7E¡¿áéíóúÁÉÍÓÚñÑüÜ·→←▲▼]*$/;

/** Max length of a Guardián line, in code points. */
export const GUARDIAN_LINE_MAX = 140;

export function isBadgeLine(s: unknown, max = GUARDIAN_LINE_MAX): s is string {
  if (typeof s !== "string") return false;
  const n = Array.from(s).length;
  return n > 0 && n <= max && BADGE_TEXT.test(s) && s.trim().length > 0;
}
