import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessCodes } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getAdminSession } from "@/lib/auth/admin";

/**
 * Internal admin endpoint for creating organization access codes.
 *
 * Three independent gates protect this route:
 *
 *   1. ADMIN_ACCESS_SECRET env var must be configured on the deploy.
 *      If unset, the endpoint returns 404 — the route effectively
 *      doesn't exist.
 *   2. A signed-in trial-user session must exist (via the regular
 *      session cookie). Otherwise 401.
 *   3. A valid admin cookie must be present (signed via the admin
 *      session helper after the secret was verified at /api/internal/
 *      admin-auth). Otherwise 401 `admin_required` — the caller
 *      should redirect to the secret challenge.
 *
 * The admin secret itself is NEVER submitted to this endpoint — it's
 * exchanged once for the cookie at /api/internal/admin-auth, and only
 * the signed cookie travels on subsequent requests.
 *
 * Not linked from any public UI. Admin types the URL manually.
 */
export async function POST(request: NextRequest) {
  // Gate 1: env var must be configured
  if (!process.env.ADMIN_ACCESS_SECRET || process.env.ADMIN_ACCESS_SECRET.length < 8) {
    return NextResponse.json({ error: "not_configured" }, { status: 404 });
  }

  // Gate 2: must have a trial-user session
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "not_signed_in", message: "Please sign in at /early-access first." },
      { status: 401 },
    );
  }

  // Gate 3: must have a valid admin cookie
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { error: "admin_required", message: "Admin authorization required. Please re-enter the admin secret." },
      { status: 401 },
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  // ── Validate fields ──────────────────────────────────────────────────────
  const code = typeof body.code === "string" ? body.code.trim().toLowerCase() : "";
  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(code)) {
    return NextResponse.json(
      { error: "Code may only contain letters, numbers, dashes, and underscores." },
      { status: 400 },
    );
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  const documentLimitRaw = body.documentLimit;
  const documentLimit =
    typeof documentLimitRaw === "number" && Number.isInteger(documentLimitRaw) && documentLimitRaw > 0
      ? documentLimitRaw
      : null;
  if (documentLimit === null) {
    return NextResponse.json(
      { error: "Document limit must be a positive integer." },
      { status: 400 },
    );
  }

  let usesRemaining: number | null = null;
  if (body.usesRemaining !== null && body.usesRemaining !== undefined && body.usesRemaining !== "") {
    if (
      typeof body.usesRemaining === "number" &&
      Number.isInteger(body.usesRemaining) &&
      body.usesRemaining > 0
    ) {
      usesRemaining = body.usesRemaining;
    } else {
      return NextResponse.json(
        { error: "Uses remaining must be a positive integer, or leave blank for unlimited." },
        { status: 400 },
      );
    }
  }

  let expiresAt: Date | null = null;
  if (body.expiresAt !== null && body.expiresAt !== undefined && body.expiresAt !== "") {
    if (typeof body.expiresAt !== "string") {
      return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
    }
    const parsed = new Date(body.expiresAt);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
    }
    expiresAt = parsed;
  }

  // ── Duplicate guard ──────────────────────────────────────────────────────
  const existing = await db
    .select({ code: accessCodes.code })
    .from(accessCodes)
    .where(eq(accessCodes.code, code))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An access code with that value already exists." },
      { status: 409 },
    );
  }

  // ── Insert ───────────────────────────────────────────────────────────────
  try {
    await db.insert(accessCodes).values({
      code,
      description,
      documentLimit,
      usesRemaining,
      expiresAt,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[/api/internal/access-codes] Insert failed:", err);
    return NextResponse.json({ error: "Failed to create code. Check server logs." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    code,
    description,
    documentLimit,
    usesRemaining,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  });
}
