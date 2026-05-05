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
 * Coerces common model-drift nulls and type mismatches before schema
 * validation so a single bad field does not kill the whole analysis.
 *
 * Top-level:
 *   - documentType, summary: null → ""
 *   - actionItems, risks, questionsToAsk: null → [];
 *     non-string elements (nulls, numbers, objects) filtered out entirely
 *   - deadlines: null → [];
 *     non-object elements filtered out;
 *     each object: description null/missing → "", date null → deleted
 *     (z.string().optional() accepts undefined but rejects null)
 *
 * The schema itself stays strict — normalization only absorbs the gap
 * between what the model returns and what the schema expects.
 */
function normalizeModelOutput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  // ── top-level string fields ──────────────────────────────────────────────
  for (const field of ["documentType", "summary"] as const) {
    if (obj[field] === null) {
      console.warn(`[analyzeDocument] null coerced to "" for field "${field}"`);
      obj[field] = "";
    }
  }

  // ── flat string arrays ───────────────────────────────────────────────────
  // Keep only actual strings — drops nulls, numbers, nested objects silently
  for (const field of ["actionItems", "risks", "questionsToAsk"] as const) {
    if (obj[field] === null) {
      console.warn(`[analyzeDocument] null coerced to [] for field "${field}"`);
      obj[field] = [];
    } else if (Array.isArray(obj[field])) {
      const before = (obj[field] as unknown[]).length;
      obj[field]   = (obj[field] as unknown[]).filter((el) => typeof el === "string");
      const after  = (obj[field] as unknown[]).length;
      if (after < before) {
        console.warn(
          `[analyzeDocument] ${before - after} non-string element(s) dropped from "${field}"`
        );
      }
    }
  }

  // ── deadlines (structured array) ─────────────────────────────────────────
  if (obj["deadlines"] === null) {
    console.warn(`[analyzeDocument] null coerced to [] for field "deadlines"`);
    obj["deadlines"] = [];
  } else if (Array.isArray(obj["deadlines"])) {
    obj["deadlines"] = (obj["deadlines"] as unknown[])
      // Drop null elements and any element that is not an object
      .filter((el) => {
        if (el === null || typeof el !== "object") {
          console.warn(`[analyzeDocument] Non-object deadline element dropped`);
          return false;
        }
        return true;
      })
      // Normalize fields inside each deadline object
      .map((el) => {
        const d = { ...(el as Record<string, unknown>) };

        // description: null or missing → "" (z.string() requires a string)
        if (d.description === null || typeof d.description !== "string") {
          console.warn(`[analyzeDocument] deadline.description coerced to ""`);
          d.description = "";
        }

        // date: null → delete (z.string().optional() accepts undefined, not null)
        if (d.date === null) {
          console.warn(`[analyzeDocument] deadline.date null removed (treated as absent)`);
          delete d.date;
        }

        return d;
      });
  }

  return obj;
}

// Maximum number of model call + parse + validate attempts before giving up.
const MAX_ATTEMPTS = 2;

export async function analyzeDocument(text: string): Promise<AnalysisResult> {
  // Steps 1–4 are deterministic — run once and reuse across any retries.

  // Step 1: Readability score and complexity level
  const { readabilityScore, complexityLevel } = computeReadability(text);

  // Step 2: Document type classification
  const documentType = classifyDocument(text);
  const documentTypeLabel = DOCUMENT_TYPE_LABELS[documentType];

  // Step 3: Date extraction
  const extractedDates = extractDates(text);

  // Step 4: Build prompt
  const userPrompt = buildActionPlanPrompt({
    text,
    documentTypeLabel,
    extractedDates,
    readabilityScore,
    complexityLevel,
  });

  // Steps 5–9 involve the model and are retried on parse/validation failure.
  // Non-model errors (network, auth, etc.) propagate immediately without retry.
  let lastError: ModelOutputError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.warn(`[analyzeDocument] Attempt ${attempt - 1} failed — retrying model call...`);
    }

    // Step 5: Call model
    let raw: string;
    try {
      raw = await callModel(SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      if (err instanceof ModelOutputError) {
        // Bad model response (empty, wrong type) — worth retrying
        lastError = err;
        console.warn(`[analyzeDocument] Model call issue (attempt ${attempt}): ${err.message}`);
        continue;
      }
      // Network / auth / rate-limit errors — rethrow immediately, no retry
      throw err;
    }

    // Step 6: Extract and parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJSON(raw));
    } catch {
      lastError = new ModelOutputError(
        `[attempt ${attempt}] Model output could not be parsed as JSON. Raw: ${raw.slice(0, 200)}`
      );
      console.warn(`[analyzeDocument] ${lastError.message}`);
      continue;
    }

    // Step 7: Normalize null/malformed fields before validation
    const normalized = normalizeModelOutput(parsed);

    // Step 8: Validate against schema
    //   Per-issue path logging always runs — critical for production debugging.
    const validation = AIOutputSchema.safeParse(normalized);
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        console.error("[analyzeDocument] Validation issue:", {
          attempt,
          path:    issue.path.length ? issue.path.join(".") : "(root)",
          message: issue.message,
          code:    issue.code,
        });
      }
      const detail = validation.error.issues
        .map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`)
        .join("; ");
      lastError = new ModelOutputError(
        `[attempt ${attempt}] Model output failed schema validation: ${detail}`
      );
      continue;
    }

    // Step 9: Merge deterministic fields into the final result
    return {
      ...validation.data,
      readabilityScore,
      complexityLevel,
    };
  }

  // All attempts exhausted — surface the last known failure reason
  throw lastError ?? new ModelOutputError("Analysis failed after all attempts");
}
