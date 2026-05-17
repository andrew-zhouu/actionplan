"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { taskCompletions } from "@/lib/db/schema";

export async function toggleTaskCompletion(
  documentId: string,
  kind: "action_item" | "deadline",
  taskIndex: number,
  currentlyDone: boolean,
) {
  if (currentlyDone) {
    await db
      .delete(taskCompletions)
      .where(
        and(
          eq(taskCompletions.documentId, documentId),
          eq(taskCompletions.kind, kind),
          eq(taskCompletions.taskIndex, taskIndex),
        ),
      );
  } else {
    await db.insert(taskCompletions).values({
      id:          crypto.randomUUID(),
      documentId,
      kind,
      taskIndex,
      completedAt: new Date(),
    });
  }
  revalidatePath("/app/tasks");
  // Keep the Start Here card on /app/docs/[id] in sync with completion state
  revalidatePath(`/app/docs/${documentId}`);
  // Keep the day-cell indicators on /app/calendar in sync (all-done check,
  // overdue red dot, count) — calendar reads from the same taskCompletions.
  revalidatePath("/app/calendar");
}
