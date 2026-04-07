import Anthropic from "@anthropic-ai/sdk";
import { computeReadability } from "@/lib/analysis/readability";
import { classifyDocument, DOCUMENT_TYPE_LABELS } from "@/lib/analysis/classify-document";
import { extractDates } from "@/lib/analysis/extract-dates";
import { SYSTEM_PROMPT } from "@/prompts/system";
import { buildActionPlanPrompt } from "@/prompts/action-plan";
import { AIOutputSchema } from "@/lib/validations/analysis-schema";
import type { AnalysisResult } from "@/types/analysis";

// All provider-specific logic is isolated to this file.
// To swap providers: replace getClient() and callModel() only.

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your .env.local file."
    );
  }
  return new Anthropic({ apiKey });
}

async function callModel(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected non-text response from model");
  }
  return block.text;
}

export async function analyzeDocument(text: string): Promise<AnalysisResult> {
  // Step 1: Readability score and complexity level (deterministic)
  const { readabilityScore, complexityLevel } = computeReadability(text);

  // Step 2: Document type classification (deterministic)
  const documentType = classifyDocument(text);
  const documentTypeLabel = DOCUMENT_TYPE_LABELS[documentType];

  // Step 3: Date extraction (deterministic)
  const extractedDates = extractDates(text);

  // Step 4: Build prompt from pre-processed context
  const userPrompt = buildActionPlanPrompt({
    text,
    documentTypeLabel,
    extractedDates,
    readabilityScore,
    complexityLevel,
  });

  // Step 5: Call model
  const raw = await callModel(SYSTEM_PROMPT, userPrompt);

  // Step 6: Parse and validate model output against zod schema
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  const aiOutput = AIOutputSchema.parse(parsed);

  // Step 7: Merge deterministic fields into final result
  return {
    ...aiOutput,
    readabilityScore,
    complexityLevel,
  };
}
