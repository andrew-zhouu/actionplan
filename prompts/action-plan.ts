import type { ComplexityLevel } from "@/types/analysis";

type ActionPlanPromptContext = {
  text: string;
  documentTypeLabel: string;
  extractedDates: string[];
  readabilityScore: number;
  complexityLevel: ComplexityLevel;
};

export function buildActionPlanPrompt(context: ActionPlanPromptContext): string {
  const { text, documentTypeLabel, extractedDates, readabilityScore, complexityLevel } = context;

  const dateContext =
    extractedDates.length > 0
      ? `Dates detected in this document: ${extractedDates.join(", ")}.`
      : "No specific dates were detected in this document.";

  return `Document type (pre-classified): ${documentTypeLabel}
Readability: Grade level ${readabilityScore} (${complexityLevel} complexity) — calibrate your language accordingly.
${dateContext}

Document text:
---
${text}
---

Analyze the document above and return a JSON object following the format in your instructions.`;
}
