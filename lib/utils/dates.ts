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
  if (!str || !hasYear(str)) return null;
  const d = new Date(str);
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
