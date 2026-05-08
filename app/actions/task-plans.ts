"use server";

import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { taskPlans } from "@/lib/db/schema";

// ─── types ────────────────────────────────────────────────────────────────────

export type PlanContext = {
  taskLabel:    string;
  taskDate?:    string;
  kind:         "action_item" | "deadline";
  documentType: string;
  summary:      string;
  risks:        string[];
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function isTableMissing(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("no such table") ||
      err.message.toLowerCase().includes("sqlite_error"))
  );
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
    "Generate 3 to 5 concrete, practical steps someone should take to complete this task. " +
      "Steps must be specific to this document type and the task described. " +
      "Output a JSON array of strings ONLY — no explanation, no markdown fences, no wrapper object. " +
      'Example: ["Step one here", "Step two here", "Step three here"]',
  );

  return lines.join("\n");
}

// ─── server action ────────────────────────────────────────────────────────────

export async function generateTaskPlan(
  documentId: string,
  kind:        "action_item" | "deadline",
  taskIndex:   number,
  ctx:         PlanContext,
): Promise<{ steps: string[]; persisted: boolean }> {
  // 1. Call the model ──────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const model  = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  const response = await client.messages.create({
    model,
    max_tokens: 512,
    system:
      "You are a practical assistant that helps people complete tasks from legal and financial documents. Be specific and actionable. Never include meta-commentary or explanations — only the requested output.",
    messages: [{ role: "user", content: buildPlanPrompt(ctx) }],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Model returned an unexpected response");
  }

  // 2. Parse and validate ──────────────────────────────────────────────────────
  let steps: string[];
  try {
    // Strip markdown code fences if the model wraps output anyway
    const raw = block.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Not an array");

    steps = parsed
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 5);

    if (steps.length === 0) throw new Error("No valid steps");
  } catch {
    throw new Error("Model returned malformed plan output — please try again");
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

  revalidatePath(`/tasks/${documentId}/${kind}/${taskIndex}`);

  return { steps, persisted };
}
