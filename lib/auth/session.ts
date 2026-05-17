/**
 * Minimal signed-cookie session for Stage 2 early access. No JWT library,
 * no auth framework — just an HMAC-SHA256 signature over JSON `{userId, iat}`
 * encoded base64url. Edge-runtime compatible (Web Crypto API only, no
 * `node:crypto`, no `Buffer`).
 *
 *   Cookie name : actionplan_session
 *   Cookie body : <base64url(JSON payload)>.<base64url(hmac signature)>
 *   Signed with : process.env.SESSION_SECRET
 *   Lifetime    : 30 days
 */

export const SESSION_COOKIE_NAME       = "actionplan_session";
export const SESSION_MAX_AGE_SECONDS   = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  userId: string;
  iat:    number; // seconds since epoch
};

// ─── secret ─────────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is not set or too short. Add a value (≥ 16 chars) to .env.local and your deploy environment.",
    );
  }
  return secret;
}

// ─── base64url helpers ──────────────────────────────────────────────────────

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToString(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return atob(b64);
}

// ─── HMAC ───────────────────────────────────────────────────────────────────

async function hmacSign(payloadStr: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadStr));
  return bufferToBase64Url(sig);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ─── sign / verify ──────────────────────────────────────────────────────────

export async function signSession(userId: string): Promise<string> {
  const payload: SessionPayload = { userId, iat: Math.floor(Date.now() / 1000) };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = bufferToBase64Url(new TextEncoder().encode(payloadStr).buffer);
  const sig        = await hmacSign(payloadStr);
  return `${payloadB64}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  try {
    const payloadStr  = base64UrlToString(payloadB64);
    const expectedSig = await hmacSign(payloadStr);
    if (!constantTimeEqual(sig, expectedSig)) return null;

    const payload = JSON.parse(payloadStr) as SessionPayload;
    if (typeof payload.userId !== "string" || typeof payload.iat !== "number") return null;

    // Expiry check
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
    if (ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE_SECONDS) return null;

    return payload;
  } catch {
    return null;
  }
}

// ─── server-component / route-handler helper ────────────────────────────────

/**
 * Read and verify the session cookie from incoming request headers.
 * Returns null if missing, malformed, expired, or signature mismatch.
 * For use in server components and Node-runtime route handlers (anywhere
 * `next/headers`' `cookies()` is available).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token       = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySession(token);
}
