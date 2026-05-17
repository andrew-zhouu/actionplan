import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessCodes } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getAdminSession } from "@/lib/auth/admin";

/**
 * Revoke an access code so it can no longer be redeemed at /api/early-access.
 *
 * Soft-disable: sets `revoked_at = now()` on the row. The row stays in the
 * database — preserves audit trail and (rare) allows manual un-revoke via
 * direct SQL if needed. The early-access redemption path rejects any code
 * with `revoked_at != null` before checking expiry/uses.
 *
 * Protected by the same three gates as the create endpoint:
 *   1. ADMIN_ACCESS_SECRET env var set            → else 404
 *   2. Signed-in trial-user session               → else 401 not_signed_in
 *   3. Valid admin cookie (from /admin-auth)      → else 401 admin_required
 */
export async function POST(request: NextRequest) {
  // Gate 1
  if (!process.env.ADMIN_ACCESS_SECRET || process.env.ADMIN_ACCESS_SECRET.length < 8) {
    return NextResponse.json({ error: "not_configured" }, { status: 404 });
  }

  // Gate 2
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "not_signed_in", message: "Please sign in at /early-access first." },
      { status: 401 },
    );
  }

  // Gate 3
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { error: "admin_required", message: "Admin authorization required. Please re-enter the admin secret." },
      { status: 401 },
    );
  }

  // Parse + validate
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().toLowerCase() : "";
  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  // Look up existing row — explicit check so we can return useful 404/409
  const existing = await db
    .select({ code: accessCodes.code, revokedAt: accessCodes.revokedAt })
    .from(accessCodes)
    .where(eq(accessCodes.code, code))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Code not found." }, { status: 404 });
  }
  if (existing[0].revokedAt !== null) {
    return NextResponse.json({ error: "Code is already revoked." }, { status: 409 });
  }

  // Soft-disable
  try {
    await db
      .update(accessCodes)
      .set({ revokedAt: new Date() })
      .where(eq(accessCodes.code, code));
  } catch (err) {
    console.error("[/api/internal/access-codes/revoke] Update failed:", err);
    return NextResponse.json({ error: "Failed to revoke code. Check server logs." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, code });
}
