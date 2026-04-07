export type DocumentType =
  | "admissions_email"
  | "scholarship_text"
  | "housing_document"
  | "school_policy"
  | "admin_notice"
  | "other";

// Human-readable labels for use in prompts and UI
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  admissions_email: "Admissions Email",
  scholarship_text: "Scholarship or Financial Aid Document",
  housing_document: "Housing or Lease Document",
  school_policy: "School Policy",
  admin_notice: "Administrative Notice",
  other: "Document",
};

const KEYWORD_MAP: Record<Exclude<DocumentType, "other">, string[]> = {
  admissions_email: [
    "admission", "admit", "accepted", "waitlist", "deferred",
    "rejection", "application", "enroll", "enrollment", "offer of admission",
  ],
  scholarship_text: [
    "scholarship", "award", "grant", "merit", "financial aid",
    "stipend", "fellowship", "bursary", "tuition waiver", "disbursement",
  ],
  housing_document: [
    "lease", "rent", "tenant", "landlord", "deposit", "security deposit",
    "eviction", "unit", "apartment", "sublease", "occupant", "premises",
  ],
  school_policy: [
    "policy", "academic integrity", "honor code", "conduct", "discipline",
    "probation", "expulsion", "suspension", "violation", "regulation",
  ],
  admin_notice: [
    "registration", "transcript", "bursar", "hold", "tuition",
    "financial hold", "account balance", "office of", "deadline",
  ],
};

export function classifyDocument(text: string): DocumentType {
  const normalized = text.toLowerCase();

  const scores = (
    Object.entries(KEYWORD_MAP) as [Exclude<DocumentType, "other">, string[]][]
  ).map(([type, keywords]) => ({
    type,
    score: keywords.filter((kw) => normalized.includes(kw)).length,
  }));

  const best = scores.reduce((a, b) => (b.score > a.score ? b : a));

  return best.score > 0 ? best.type : "other";
}
