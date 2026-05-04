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

// Thrown when the model returns output that cannot be parsed or validated.
// Caught by the route to return a 502 rather than a generic 500.
export class ModelOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelOutputError";
  }
}

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
  if (!block) {
    throw new ModelOutputError("Model returned an empty response");
  }
  if (block.type !== "text") {
    throw new ModelOutputError(`Unexpected response block type: "${block.type}"`);
  }
  return block.text;
}

// Strips markdown code fences that models sometimes add despite instructions.
// Handles: ```json\n...\n``` and ```\n...\n```
function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// Attempts to extract a JSON object from model output that may contain
// surrounding prose or code fences. Returns the best candidate string;
// JSON.parse in the caller will surface any remaining parse errors.
function extractJSON(raw: string): string {
  const trimmed = raw.trim();

  // Happy path: response is already a bare JSON object
  if (trimmed.startsWith("{")) return trimmed;

  // Strip code fences and try again
  const stripped = stripCodeFences(trimmed);
  if (stripped.startsWith("{")) return stripped;

  // Last resort: find the first {...} block in mixed-content output
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) return match[0];

  // Nothing found — return trimmed original and let JSON.parse fail clearly
  return trimmed;
}

/**
 * Coerces common model-drift nulls before schema validation so a single
 * null field does not kill the whole analysis response.
 *
 * Rules:
 *   - String fields expected by the schema (documentType, summary) → ""
 *   - Array fields (actionItems, risks, questionsToAsk, deadlines) → []
 *   - Null elements inside those arrays are filtered out
 *
 * The schema itself stays strict — this normalization only covers the case
 * where the model omits a field by returning null instead of the right type.
 */
function normalizeModelOutput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  // Null string fields → ""
  for (const field of ["documentType", "summary"] as const) {
    if (obj[field] === null) {
      console.warn(`[analyzeDocument] null coerced to "" for field "${field}"`);
      obj[field] = "";
    }
  }

  // Null array fields → []; null elements within arrays are filtered out
  for (const field of ["actionItems", "risks", "questionsToAsk"] as const) {
    if (obj[field] === null) {
      console.warn(`[analyzeDocument] null coerced to [] for field "${field}"`);
      obj[field] = [];
    } else if (Array.isArray(obj[field])) {
      obj[field] = (obj[field] as unknown[]).filter((el) => el !== null);
    }
  }
  if (obj["deadlines"] === null) {
    console.warn(`[analyzeDocument] null coerced to [] for field "deadlines"`);
    obj["deadlines"] = [];
  } else if (Array.isArray(obj["deadlines"])) {
    obj["deadlines"] = (obj["deadlines"] as unknown[]).filter((el) => el !== null);
  }

  return obj;
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

  // Step 6: Extract and parse JSON from model output
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJSON(raw));
  } catch {
    throw new ModelOutputError(
      `Model output could not be parsed as JSON. Raw response: ${raw.slice(0, 200)}`
    );
  }

  // Step 7: Normalize null fields before validation to absorb common model drift
  const normalized = normalizeModelOutput(parsed);

  // Step 8: Validate against schema — surface field paths in the error for easier debugging
  const validation = AIOutputSchema.safeParse(normalized);
  if (!validation.success) {
    // Structured per-issue logging in development so the exact failing field is visible
    if (process.env.NODE_ENV !== "production") {
      for (const issue of validation.error.issues) {
        console.error("[analyzeDocument] Validation issue:", {
          path:    issue.path.length ? issue.path.join(".") : "(root)",
          message: issue.message,
          code:    issue.code,
        });
      }
    }
    const detail = validation.error.issues
      .map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`)
      .join("; ");
    throw new ModelOutputError(`Model output failed schema validation: ${detail}`);
  }

  // Step 9: Merge deterministic fields into final result
  return {
    ...validation.data,
    readabilityScore,
    complexityLevel,
  };
}
