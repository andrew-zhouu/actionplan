"use server";

import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { taskPlans } from "@/lib/db/schema";
import { assertOwnsDocument } from "@/lib/auth/ownership";

// ─── types ────────────────────────────────────────────────────────────────────

export type PlanContext = {
  taskLabel:    string;
  taskDate?:    string;
  kind:         "action_item" | "deadline";
  documentType: string;
  summary:      string;
  risks:        string[];
};

/**
 * Canonical step shape used across action, page, and component.
 *
 * Backward compatibility: existing rows in `task_plans.steps` may contain
 * a legacy `string[]` payload. Callers must normalize via `normalizeRawStep`
 * (action-side) or the page's inline parse path (DB-side) before passing
 * `PlanStep[]` to the component.
 */
export type PlanStep = {
  title:      string;  // short imperative (5–12 words)
  detail:     string;  // 1–2 sentence elaboration; "" for legacy steps
  needsDraft: boolean; // true ⇢ step benefits from a generated draft artifact
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function isTableMissing(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("no such table") ||
      err.message.toLowerCase().includes("sqlite_error"))
  );
}

/**
 * Normalize a single raw step value into a PlanStep, or return null if it
 * cannot be coerced into something usable. Accepts:
 *   - a plain string (legacy shape)             ⇢ { title, detail:"", needsDraft:false }
 *   - an object with at least a string `title`  ⇢ canonical shape
 * Anything else is dropped.
 */
function normalizeRawStep(raw: unknown): PlanStep | null {
  if (typeof raw === "string") {
    const title = raw.trim();
    return title ? { title, detail: "", needsDraft: false } : null;
  }
  if (typeof raw === "object" && raw !== null) {
    const obj   = raw as Record<string, unknown>;
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    if (!title) return null;
    const detail     = typeof obj.detail === "string" ? obj.detail.trim() : "";
    const needsDraft = obj.needsDraft === true;
    return { title, detail, needsDraft };
  }
  return null;
}

function buildPlanPrompt(ctx: PlanContext): string {
  const lines: string[] = [
    `Document type: ${ctx.documentType}`,
    `Document summary: ${ctx.summary}`,
  ];

  if (ctx.risks.length > 0) {
    lines.push(`Key risks: ${ctx.risks.slice(0, 3).join("; ")}`);
  }

  lines.push("");
  lines.push(
    ctx.kind === "deadline"
      ? `Task: This is a deadline — "${ctx.taskLabel}"${ctx.taskDate ? ` (due ${ctx.taskDate})` : ""}.`
      : `Task: This is an action item — "${ctx.taskLabel}".`,
  );

  lines.push("");
  lines.push(
    "Generate 3 to 5 concrete steps someone should take to complete this task. " +
      "Each step is an object with these fields:\n" +
      "  - title: short imperative sentence (5-12 words)\n" +
      "  - detail: 1-2 sentences explaining how or why\n" +
      "  - needsDraft: boolean — true ONLY if this step requires composing written communication " +
      "(email, letter, or talking points) for an outside party; false otherwise\n" +
      "Steps must be specific to this document type and the task. " +
      "Output a JSON array of these objects ONLY — no explanation, no markdown fences, no wrapper object.\n" +
      'Example: [{"title":"Gather required forms","detail":"Collect signed copies before contacting the office.","needsDraft":false},' +
      '{"title":"Email the financial aid office","detail":"Confirm receipt and ask about next steps.","needsDraft":true}]',
  );

  return lines.join("\n");
}

// ─── server action ────────────────────────────────────────────────────────────

export async function generateTaskPlan(
  documentId: string,
  kind:        "action_item" | "deadline",
  taskIndex:   number,
  ctx:         PlanContext,
): Promise<{ steps: PlanStep[]; persisted: boolean }> {
  // 0. Ownership — fail fast before consuming an API key or model tokens.
  await assertOwnsDocument(documentId);

  // 1. Call the model ──────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const model  = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  const response = await client.messages.create({
    model,
    max_tokens: 768,
    system:
      "You are a practical assistant that helps people complete tasks from legal and financial documents. Be specific and actionable. Never include meta-commentary or explanations — only the requested output.",
    messages: [{ role: "user", content: buildPlanPrompt(ctx) }],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Model returned an unexpected response");
  }

  // 2. Parse and validate ──────────────────────────────────────────────────────
  let parsedRaw: unknown;
  try {
    // Strip markdown code fences if the model wraps output anyway
    const raw = block.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    parsedRaw = JSON.parse(raw);
  } catch {
    throw new Error("Model returned malformed plan output — please try again");
  }

  if (!Array.isArray(parsedRaw)) {
    throw new Error("Model returned malformed plan output — please try again");
  }

  const steps: PlanStep[] = [];
  for (const item of parsedRaw) {
    const normalized = normalizeRawStep(item);
    if (normalized) steps.push(normalized);
    if (steps.length === 5) break;
  }

  if (steps.length === 0) {
    throw new Error("Model returned no usable steps — please try again");
  }

  // 3. Persist — graceful degrade if task_plans table is missing ──────────────
  let persisted = false;
  try {
    await db
      .delete(taskPlans)
      .where(
        and(
          eq(taskPlans.documentId, documentId),
          eq(taskPlans.kind, kind),
          eq(taskPlans.taskIndex, taskIndex),
        ),
      );

    await db.insert(taskPlans).values({
      id:         crypto.randomUUID(),
      documentId,
      kind,
      taskIndex,
      steps:      JSON.stringify(steps),
      createdAt:  new Date(),
    });

    persisted = true;
  } catch (err) {
    if (!isTableMissing(err)) {
      // Unexpected error — log but don't surface to the user
      console.error("[generateTaskPlan] Failed to persist plan:", err);
    }
    // Table missing or other write error: we still return the steps in-memory
  }

  revalidatePath(`/app/tasks/${documentId}/${kind}/${taskIndex}`);

  return { steps, persisted };
}
