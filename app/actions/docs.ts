"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  documents,
  taskCompletions,
  taskPlans,
  taskDrafts,
  documentChunks,
  documentIndexes,
} from "@/lib/db/schema";
import { assertOwnsDocument } from "@/lib/auth/ownership";

/**
 * Delete a document the signed-in user owns, cascading to every child
 * table that references it.
 *
 * Children (all keyed on `document_id`):
 *   - `task_completions` — per-task done state
 *   - `task_plans`       — per-task step lists
 *   - `task_drafts`      — per-task generated emails / letters / notes
 *
 * Wrapped in a single `db.transaction()` so the cascade is atomic. If
 * any DELETE inside the transaction fails, every other DELETE rolls back
 * — we never end up in a state where the parent `documents` row is gone
 * but its task plans/drafts are still in the database, or vice versa.
 *
 * The final `documents` delete re-asserts `userId` in the WHERE clause
 * as defense-in-depth — even if `assertOwnsDocument` were bypassed,
 * we'd still refuse to delete another user's row.
 */
export async function deleteDocument(id: string) {
  // Ownership — throws "Document not found." for both missing and unowned
  // cases (same message to avoid leaking existence to non-owners).
  const { userId } = await assertOwnsDocument(id);

  await db.transaction(async (tx) => {
    // Keep existing deletion working during rollout, before the additive RAG migration.
    const ragTables = new Set((await tx.all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('document_chunks', 'document_indexes')`)).map(r => r.name));
    if (ragTables.has("document_chunks")) await tx.delete(documentChunks).where(and(eq(documentChunks.documentId, id), eq(documentChunks.userId, userId)));
    if (ragTables.has("document_indexes")) await tx.delete(documentIndexes).where(and(eq(documentIndexes.documentId, id), eq(documentIndexes.userId, userId)));
    await tx.delete(taskCompletions).where(eq(taskCompletions.documentId, id));
    await tx.delete(taskPlans).where(eq(taskPlans.documentId, id));
    await tx.delete(taskDrafts).where(eq(taskDrafts.documentId, id));
    await tx
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
  });

  revalidatePath("/app");
  revalidatePath("/app/tasks");
  revalidatePath("/app/ask");
}
