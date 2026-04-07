import type { ComplexityLevel } from "@/types/analysis";

export type ReadabilityResult = {
  readabilityScore: number; // Flesch-Kincaid grade level, rounded to 1 decimal
  complexityLevel: ComplexityLevel;
};

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length === 0) return 0;

  // Remove silent trailing 'e' before counting vowel groups
  const normalized = cleaned.replace(/e$/, "");
  const matches = normalized.match(/[aeiou]+/g);
  return Math.max(1, matches?.length ?? 1);
}

function countSentences(text: string): number {
  const matches = text.match(/[.!?]+/g);
  return Math.max(1, matches?.length ?? 1);
}

function deriveComplexityLevel(gradeLevel: number): ComplexityLevel {
  if (gradeLevel < 8) return "Low";
  if (gradeLevel <= 12) return "Medium";
  return "High";
}

export function computeReadability(text: string): ReadabilityResult {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 10) {
    return { readabilityScore: 0, complexityLevel: "Low" };
  }

  const sentenceCount = countSentences(text);
  const syllableCount = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0
  );

  // Flesch-Kincaid Grade Level formula
  const raw =
    0.39 * (wordCount / sentenceCount) +
    11.8 * (syllableCount / wordCount) -
    15.59;

  const readabilityScore = Math.max(0, Math.round(raw * 10) / 10);

  return {
    readabilityScore,
    complexityLevel: deriveComplexityLevel(readabilityScore),
  };
}
