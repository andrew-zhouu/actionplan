"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { documents, taskCompletions } from "@/lib/db/schema";
import { assertOwnsDocument } from "@/lib/auth/ownership";

export async function deleteDocument(id: string) {
  // Ownership — throws "Document not found." for both missing and unowned cases.
  const { userId } = await assertOwnsDocument(id);

  // Completions first, then the document — correct cascade order.
  // The documents delete re-asserts userId in the WHERE clause as defense-
  // in-depth: even if assertOwnsDocument were ever bypassed, we'd never
  // delete another user's row.
  await db.delete(taskCompletions).where(eq(taskCompletions.documentId, id));
  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)));

  revalidatePath("/app");
  revalidatePath("/app/tasks");
}
