import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  signAdminToken,
  adminSecretEquals,
  ADMIN_COOKIE_NAME,
  ADMIN_MAX_AGE_SECONDS,
} from "@/lib/auth/admin";

/**
 * Exchange the admin secret for a signed 1-hour admin cookie.
 *
 * Three gates (in order):
 *   1. ADMIN_ACCESS_SECRET env var configured (≥ 8 chars). If not,
 *      this route returns 404 — internal tool is off on this deploy.
 *   2. A signed-in trial-user session must already exist. The internal
 *      tool lives under /app/* and we want unauthenticated strangers
 *      bounced earlier by middleware; this re-check defends against
 *      anyone hitting the API directly from outside the browser.
 *   3. Submitted `secret` matches the env value via constant-time compare.
 *
 * On success: signs a fresh admin token, sets it as a HttpOnly Secure
 * cookie, returns { ok: true }. The page calling this then router.refresh()s
 * to re-render with the cookie present.
 */
export async function POST(request: NextRequest) {
  // Gate 1 — env configured
  if (!process.env.ADMIN_ACCESS_SECRET || process.env.ADMIN_ACCESS_SECRET.length < 8) {
    return NextResponse.json({ error: "not_configured" }, { status: 404 });
  }

  // Gate 2 — must have a trial-user session
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "not_signed_in", message: "Please sign in at /early-access first." },
      { status: 401 },
    );
  }

  // Parse + Gate 3 — secret matches
  let body: { secret?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const submitted = typeof body.secret === "string" ? body.secret : "";
  if (!adminSecretEquals(submitted)) {
    return NextResponse.json(
      { error: "invalid_secret", message: "Invalid admin secret." },
      { status: 401 },
    );
  }

  // Sign + set cookie
  let token: string;
  try {
    token = await signAdminToken();
  } catch (err) {
    console.error("[/api/internal/admin-auth] signAdminToken failed:", err);
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name:     ADMIN_COOKIE_NAME,
    value:    token,
    maxAge:   ADMIN_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    path:     "/",
  });
  return response;
}
