/**
 * Returns true when the string contains a plausible 4-digit year (1900–2099).
 * Used as a guard before calling `new Date()` to prevent JavaScript's
 * year-guessing behaviour (e.g. "May 1" → year 2001).
 */
export function hasYear(str: string): boolean {
  return /\b(19|20)\d{2}\b/.test(str);
}

/**
 * Parse a date string into a Date, returning null for:
 * - undefined / empty input
 * - strings that lack a 4-digit year (avoids JS year-guessing)
 * - strings that don't parse to a valid date
 */
export function parseDate(str: string | undefined): Date | null {
  if (!str) return null;

  // Strip ordinal suffixes before parsing so "7th", "1st", "2nd", "3rd" don't
  // produce Invalid Date (e.g. "April 7th" → "April 7").
  const normalized = str.replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");

  if (hasYear(normalized)) {
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }

  // No 4-digit year: append the current year before parsing.
  // "April 7 2026" is unambiguous; avoids JS default-year behaviour
  // (e.g. new Date("May 1") silently produces year 2001).
  const withYear = `${normalized} ${new Date().getFullYear()}`;
  const d = new Date(withYear);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date as "Dec 25, 2026" — used by the tasks list. */
export function formatDeadlineDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}
