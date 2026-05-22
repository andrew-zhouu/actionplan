"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  documents,
  taskCompletions,
  taskPlans,
  taskDrafts,
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
    await tx.delete(taskCompletions).where(eq(taskCompletions.documentId, id));
    await tx.delete(taskPlans).where(eq(taskPlans.documentId, id));
    await tx.delete(taskDrafts).where(eq(taskDrafts.documentId, id));
    await tx
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
  });

  revalidatePath("/app");
  revalidatePath("/app/tasks");
}
