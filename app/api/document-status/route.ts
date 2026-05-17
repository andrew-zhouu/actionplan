import { type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

/**
 * Polling endpoint for persistent-processing UIs (the /app/new state card
 * and the /app/docs/[id] processing page). Returns the current status of
 * a document the signed-in user owns.
 *
 * Ownership-checked the same way as the rest of Stage 2: scope the SELECT
 * by both id AND user_id. Missing or unowned rows both return 404 with
 * the same body so we don't leak document existence to non-owners.
 *
 * Designed for short-lived polling (2 s interval, client stops on terminal
 * status), so the response is intentionally minimal.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "missing_id" }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "not_signed_in" }, { status: 401 });
  }

  const rows = await db
    .select({
      id:           documents.id,
      status:       documents.status,
      documentType: documents.documentType,
    })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, session.userId)))
    .limit(1);

  if (rows.length === 0) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(rows[0]);
}
