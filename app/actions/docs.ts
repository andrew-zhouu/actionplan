"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { documents, taskCompletions } from "@/lib/db/schema";

export async function deleteDocument(id: string) {
  // Completions first, then the document — correct cascade order
  await db.delete(taskCompletions).where(eq(taskCompletions.documentId, id));
  await db.delete(documents).where(eq(documents.id, id));
  revalidatePath("/");
  revalidatePath("/tasks");
}
