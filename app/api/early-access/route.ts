import { type NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { trialUsers, accessCodes } from "@/lib/db/schema";
import {
  signSession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

const EMAIL_REGEX         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_TRIAL_LIMIT = Number(process.env.DEFAULT_TRIAL_LIMIT) || 3;

/**
 * Create or resume a trial user, then issue a session cookie.
 *
 * Two entry modes share this endpoint:
 *
 *   1. EMAIL mode  — `{ email, code?, next? }`
 *      Default early-access. Email is case-insensitive. Existing emails
 *      resume the same userId; new emails create a fresh trial user at
 *      DEFAULT_TRIAL_LIMIT (or the code's tier if a code is supplied).
 *      A code submitted alongside an existing email upgrades that user
 *      to max(currentLimit, codeLimit) — never downgrades.
 *
 *   2. CODE-ONLY mode — `{ code, next? }`
 *      Org/pilot path. No email required. Creates a fresh trial_users
 *      row with email=null, accessCodeUsed=code, documentLimit from the
 *      code's tier. Subsequent visits without the cookie are treated
 *      as a new user (resumption is cookie-only since there's no email
 *      to look up by).
 *
 * Both paths return `{ ok: true, next }` with a Set-Cookie header.
 * Code validation surfaces specific 400 errors for invalid / expired /
 * exhausted codes regardless of which mode triggered it.
 */
export async function POST(request: NextRequest) {
  // 1. Parse body ────────────────────────────────────────────────────────────
  let body: { email?: unknown; code?: unknown; next?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }

  const email     = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const codeInput = typeof body.code  === "string" ? body.code.trim().toLowerCase()  : "";

  // 2. Determine mode ────────────────────────────────────────────────────────
  if (!email && !codeInput) {
    return NextResponse.json(
      { message: "Please provide an email or an access code." },
      { status: 400 },
    );
  }

  // 3. Validate code if present (both modes) ────────────────────────────────
  type CodeRow = typeof accessCodes.$inferSelect;
  let codeRow: CodeRow | null = null;
  if (codeInput) {
    const rows = await db.select().from(accessCodes).where(eq(accessCodes.code, codeInput)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ message: "That access code isn't recognized." }, { status: 400 });
    }
    const r = rows[0];
    if (r.revokedAt !== null) {
      return NextResponse.json({ message: "That access code is no longer active." }, { status: 400 });
    }
    if (r.expiresAt && r.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ message: "That access code has expired." }, { status: 400 });
    }
    if (r.usesRemaining !== null && r.usesRemaining <= 0) {
      return NextResponse.json({ message: "That access code has no uses left." }, { status: 400 });
    }
    codeRow = r;
  }

  // 4. Create/resume user → userId ───────────────────────────────────────────
  const now = new Date();
  let userId: string;

  if (email) {
    // ── EMAIL mode (with optional code upgrade) ────────────────────────────
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 });
    }

    const existing = await db.select().from(trialUsers).where(eq(trialUsers.email, email)).limit(1);

    if (existing.length > 0) {
      const u  = existing[0];
      userId   = u.id;
      // Resume: refresh activity. If a code was supplied and grants a higher
      // limit than the user currently has, upgrade. Never downgrade.
      const newLimit = codeRow ? Math.max(u.documentLimit, codeRow.documentLimit) : u.documentLimit;
      const newCode  = codeRow ? codeRow.code : u.accessCodeUsed;
      await db
        .update(trialUsers)
        .set({
          documentLimit:  newLimit,
          accessCodeUsed: newCode,
          lastActiveAt:   now,
        })
        .where(eq(trialUsers.id, userId));
    } else {
      userId = crypto.randomUUID();
      await db.insert(trialUsers).values({
        id:             userId,
        email,
        documentsUsed:  0,
        documentLimit:  codeRow ? codeRow.documentLimit : DEFAULT_TRIAL_LIMIT,
        accessCodeUsed: codeRow ? codeRow.code : null,
        createdAt:      now,
        lastActiveAt:   now,
      });
    }
  } else {
    // ── CODE-ONLY mode ────────────────────────────────────────────────────
    // codeRow is guaranteed non-null here: !email && codeInput && validation
    // above either returned 400 or populated codeRow.
    if (!codeRow) {
      return NextResponse.json({ message: "That access code isn't recognized." }, { status: 400 });
    }

    userId = crypto.randomUUID();
    await db.insert(trialUsers).values({
      id:             userId,
      email:          null,
      documentsUsed:  0,
      documentLimit:  codeRow.documentLimit,
      accessCodeUsed: codeRow.code,
      createdAt:      now,
      lastActiveAt:   now,
    });
  }

  // 5. Decrement code usage if applicable ───────────────────────────────────
  if (codeRow && codeRow.usesRemaining !== null) {
    await db
      .update(accessCodes)
      .set({ usesRemaining: sql`uses_remaining - 1` })
      .where(eq(accessCodes.code, codeRow.code));
  }

  // 6. Sign session cookie ──────────────────────────────────────────────────
  let token: string;
  try {
    token = await signSession(userId);
  } catch (err) {
    console.error("[/api/early-access] signSession failed:", err);
    return NextResponse.json(
      { message: "Server is missing SESSION_SECRET. Contact support." },
      { status: 500 },
    );
  }

  // 7. Sanitize the `next` redirect ─────────────────────────────────────────
  const nextRaw = typeof body.next === "string" ? body.next : "";
  const next    = nextRaw.startsWith("/app") ? nextRaw : "/app";

  const response = NextResponse.json({ ok: true, next });
  response.cookies.set({
    name:     SESSION_COOKIE_NAME,
    value:    token,
    maxAge:   SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    path:     "/",
  });

  return response;
}
