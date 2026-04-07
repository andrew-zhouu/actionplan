// Matches written month names (full and abbreviated) followed by a day and optional year.
// Handles: "April 10, 2026" | "Apr 10" | "May 2nd" | "January 1, 2025"
const WRITTEN_DATE_PATTERN =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi;

// Matches numeric dates with optional year.
// Handles: "4/10/2026" | "04/10/26" | "4/10"
const NUMERIC_DATE_PATTERN = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g;

const PATTERNS = [WRITTEN_DATE_PATTERN, NUMERIC_DATE_PATTERN];

export function extractDates(text: string): string[] {
  const found = new Set<string>();

  for (const pattern of PATTERNS) {
    const matches = text.match(pattern) ?? [];
    for (const match of matches) {
      found.add(match.trim());
    }
  }

  return Array.from(found);
}
