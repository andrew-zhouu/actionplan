"use server";

import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { taskDrafts } from "@/lib/db/schema";
import { assertOwnsDocument } from "@/lib/auth/ownership";

// ─── types ────────────────────────────────────────────────────────────────────

export type DraftType = "email" | "letter" | "note";

export type DraftContext = {
  taskLabel:    string;
  taskDate?:    string;
  kind:         "action_item" | "deadline";
  documentType: string;
  summary:      string;
  risks:        string[];
};

/**
 * Plain shape passed between server and client. Dates are ISO strings so
 * the prop crosses the server→client boundary without serialization quirks.
 */
export type TaskDraft = {
  draftType:  DraftType;
  subject:    string | null;
  body:       string;
  approved:   boolean;
  approvedAt: string | null;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function isTableMissing(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("no such table") ||
      err.message.toLowerCase().includes("sqlite_error"))
  );
}

function isValidDraftType(v: unknown): v is DraftType {
  return v === "email" || v === "letter" || v === "note";
}

const TYPE_INSTRUCTIONS: Record<DraftType, string> = {
  email:
    "Generate a professional email. Include a focused subject line (5-10 words), a polite salutation, " +
    "a clear body (2-4 short paragraphs), and a sign-off. " +
    "Use [Your name] as the signature placeholder, and use [bracketed placeholders] for any specific " +
    "facts you do not know (account numbers, addresses, dates not in context, etc). " +
    'Output JSON exactly in this shape: {"subject": "...", "body": "Dear ...\\n\\n...\\n\\nSincerely,\\n[Your name]"}',
  letter:
    "Generate a formal written letter. Include a salutation, an opening that states the purpose, " +
    "2-3 supporting paragraphs, a closing paragraph, and a sign-off. " +
    "Use [Your name] as the signature placeholder, and use [bracketed placeholders] for any specific " +
    "facts you do not know. " +
    'Output JSON exactly in this shape: {"body": "Dear ...\\n\\n...\\n\\nSincerely,\\n[Your name]"} — no subject field.',
  note:
    "Generate concise talking points or a brief informal message suitable for a phone call or in-person " +
    "conversation. 4-7 bullet points or short paragraphs separated by blank lines. " +
    "Use [bracketed placeholders] for any specific facts you do not know. " +
    'Output JSON exactly in this shape: {"body": "- Point one\\n- Point two\\n..."} — no subject field.',
};

function buildDraftPrompt(ctx: DraftContext, draftType: DraftType): string {
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
  lines.push(TYPE_INSTRUCTIONS[draftType]);
  lines.push("");
  lines.push("Return JSON only — no explanation, no markdown fences, no wrapper object.");

  return lines.join("\n");
}

// ─── generate ─────────────────────────────────────────────────────────────────

export async function generateTaskDraft(
  documentId: string,
  kind:        "action_item" | "deadline",
  taskIndex:   number,
  draftType:   DraftType,
  ctx:         DraftContext,
): Promise<{ draft: TaskDraft; persisted: boolean }> {
  // Ownership — fail fast before consuming API key or model tokens.
  await assertOwnsDocument(documentId);

  if (!isValidDraftType(draftType)) {
    throw new Error("Invalid draft type");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const model  = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  // 1. Call the model ──────────────────────────────────────────────────────────
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system:
      "You are drafting written communication on behalf of a person acting on a task from a legal or " +
      "financial document. Be specific to the document type and the task. Use a natural, human tone — " +
      "neither robotic nor overly casual. Never include meta-commentary or explanations outside the JSON.",
    messages: [{ role: "user", content: buildDraftPrompt(ctx, draftType) }],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Model returned an unexpected response");
  }

  // 2. Parse and validate ──────────────────────────────────────────────────────
  let parsed: { subject?: unknown; body?: unknown };
  try {
    const raw = block.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model returned malformed draft output — please try again");
  }

  if (typeof parsed.body !== "string" || parsed.body.trim().length === 0) {
    throw new Error("Draft is missing a body — please try again");
  }
  const body = parsed.body.trim().slice(0, 8000);

  let subject: string | null = null;
  if (draftType === "email") {
    if (typeof parsed.subject !== "string" || parsed.subject.trim().length === 0) {
      throw new Error("Email draft is missing a subject — please try again");
    }
    subject = parsed.subject.trim().slice(0, 200);
  }

  // 3. Persist — graceful degrade if task_drafts table is missing ─────────────
  let persisted = false;
  const now = new Date();
  try {
    await db
      .delete(taskDrafts)
      .where(
        and(
          eq(taskDrafts.documentId, documentId),
          eq(taskDrafts.kind, kind),
          eq(taskDrafts.taskIndex, taskIndex),
        ),
      );

    await db.insert(taskDrafts).values({
      id:         crypto.randomUUID(),
      documentId,
      kind,
      taskIndex,
      draftType,
      subject,
      body,
      approved:   false,
      createdAt:  now,
      approvedAt: null,
    });

    persisted = true;
  } catch (err) {
    if (!isTableMissing(err)) {
      console.error("[generateTaskDraft] Failed to persist draft:", err);
    }
    // Table missing or other write error: still return the draft in-memory
  }

  revalidatePath(`/app/tasks/${documentId}/${kind}/${taskIndex}`);

  return {
    draft: {
      draftType,
      subject,
      body,
      approved:   false,
      approvedAt: null,
    },
    persisted,
  };
}

// ─── approve ──────────────────────────────────────────────────────────────────

export async function approveTaskDraft(
  documentId: string,
  kind:        "action_item" | "deadline",
  taskIndex:   number,
): Promise<{ approvedAt: string; persisted: boolean }> {
  await assertOwnsDocument(documentId);

  const now = new Date();
  let persisted = false;
  try {
    await db
      .update(taskDrafts)
      .set({ approved: true, approvedAt: now })
      .where(
        and(
          eq(taskDrafts.documentId, documentId),
          eq(taskDrafts.kind, kind),
          eq(taskDrafts.taskIndex, taskIndex),
        ),
      );
    persisted = true;
  } catch (err) {
    if (!isTableMissing(err)) {
      console.error("[approveTaskDraft] Failed to update draft:", err);
      throw new Error("Failed to mark draft as approved");
    }
    // Missing table: approval is in-memory only on the client this session
  }

  revalidatePath(`/app/tasks/${documentId}/${kind}/${taskIndex}`);

  return { approvedAt: now.toISOString(), persisted };
}

// ─── unapprove ────────────────────────────────────────────────────────────────
//
// Inverse of approveTaskDraft — preserves content, flips approval flags back.
// One-click action (no confirmation): the draft just returns to pending review.

export async function unapproveTaskDraft(
  documentId: string,
  kind:        "action_item" | "deadline",
  taskIndex:   number,
): Promise<{ persisted: boolean }> {
  await assertOwnsDocument(documentId);

  let persisted = false;
  try {
    await db
      .update(taskDrafts)
      .set({ approved: false, approvedAt: null })
      .where(
        and(
          eq(taskDrafts.documentId, documentId),
          eq(taskDrafts.kind, kind),
          eq(taskDrafts.taskIndex, taskIndex),
        ),
      );
    persisted = true;
  } catch (err) {
    if (!isTableMissing(err)) {
      console.error("[unapproveTaskDraft] Failed to update draft:", err);
      throw new Error("Failed to unapprove draft");
    }
    // Missing table: state change is in-memory only this session
  }

  revalidatePath(`/app/tasks/${documentId}/${kind}/${taskIndex}`);

  return { persisted };
}

// ─── save edits ───────────────────────────────────────────────────────────────
//
// Persists user-edited subject/body. Always resets approval to false because
// approval is a statement about a specific text — editing invalidates it.

export async function saveTaskDraftEdits(
  documentId: string,
  kind:        "action_item" | "deadline",
  taskIndex:   number,
  edits:       { subject: string | null; body: string },
): Promise<{ persisted: boolean }> {
  await assertOwnsDocument(documentId);

  if (typeof edits.body !== "string" || edits.body.trim().length === 0) {
    throw new Error("Draft body cannot be empty");
  }

  const body    = edits.body.trim().slice(0, 8000);
  const subject = edits.subject !== null
    ? edits.subject.trim().slice(0, 200) || null
    : null;

  let persisted = false;
  try {
    await db
      .update(taskDrafts)
      .set({
        subject,
        body,
        approved:   false,
        approvedAt: null,
      })
      .where(
        and(
          eq(taskDrafts.documentId, documentId),
          eq(taskDrafts.kind, kind),
          eq(taskDrafts.taskIndex, taskIndex),
        ),
      );
    persisted = true;
  } catch (err) {
    if (!isTableMissing(err)) {
      console.error("[saveTaskDraftEdits] Failed to save:", err);
      throw new Error("Failed to save changes");
    }
    // Missing table: edits stay in-memory only this session
  }

  revalidatePath(`/app/tasks/${documentId}/${kind}/${taskIndex}`);

  return { persisted };
}

// ─── discard ──────────────────────────────────────────────────────────────────
//
// Removes the row entirely. Missing-table case is a silent success since
// there's nothing to remove.

export async function discardTaskDraft(
  documentId: string,
  kind:        "action_item" | "deadline",
  taskIndex:   number,
): Promise<void> {
  await assertOwnsDocument(documentId);

  try {
    await db
      .delete(taskDrafts)
      .where(
        and(
          eq(taskDrafts.documentId, documentId),
          eq(taskDrafts.kind, kind),
          eq(taskDrafts.taskIndex, taskIndex),
        ),
      );
  } catch (err) {
    if (!isTableMissing(err)) {
      console.error("[discardTaskDraft] Failed to delete:", err);
      throw new Error("Failed to discard draft");
    }
    // Missing table: nothing to delete, succeed silently
  }

  revalidatePath(`/app/tasks/${documentId}/${kind}/${taskIndex}`);
}
