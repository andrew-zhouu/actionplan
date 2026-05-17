import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * Gates all routes under `/app/`. Missing or invalid session → 307 redirect
 * to `/early-access?next=<original>` so the user can submit their email and
 * land back where they were going.
 *
 * Scope is intentionally narrow: this middleware ONLY guards page routes
 * under `/app/`. The analyze APIs (`/api/analyze`, `/api/upload-analyze`)
 * enforce session + trial limits inside their own handlers so they can
 * return structured JSON 401/403 responses for the UI to render — that
 * lives outside of middleware on purpose.
 *
 * Runs on Edge runtime. Uses only Web Crypto (no `node:crypto`, no DB).
 */
export async function middleware(request: NextRequest) {
  const token   = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (session) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/early-access";
  url.search   = "";

  // Preserve the original destination so we can route the user back after
  // they submit their email. Only round-trip `/app/...` paths — guard
  // against open-redirect by ignoring anything else.
  const original = request.nextUrl.pathname + request.nextUrl.search;
  if (original.startsWith("/app")) {
    url.searchParams.set("next", original);
  }

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/app", "/app/:path*"],
};
