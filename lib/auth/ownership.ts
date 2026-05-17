import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

/**
 * Assert that the signed-in user owns the given document.
 *
 * Throws on:
 *   - missing or invalid session
 *   - document doesn't exist
 *   - document exists but belongs to another user
 *
 * The "doesn't exist" and "belongs to someone else" cases throw the same
 * "Document not found." message so we don't leak document existence to
 * non-owners by error-message-distinguishability.
 *
 * Returns the verified userId on success so callers can reuse it for
 * scoped queries or revalidation paths without re-fetching the session.
 *
 * Use this at the TOP of any server action that accepts a documentId,
 * before any DB writes or model calls — so unauthorized requests fail
 * fast and don't consume model tokens or mutate persisted state.
 */
export async function assertOwnsDocument(documentId: string): Promise<{ userId: string }> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");

  const owned = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, session.userId)))
    .limit(1);

  if (owned.length === 0) {
    throw new Error("Document not found.");
  }

  return { userId: session.userId };
}
