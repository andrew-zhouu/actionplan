/**
 * Admin authorization for the internal access-code tool.
 *
 * After the admin enters the correct `ADMIN_ACCESS_SECRET`, the server
 * signs a short-lived admin token and sets it as a cookie. Subsequent
 * page renders and API calls verify the cookie; the secret itself is
 * never stored anywhere and isn't sent on every request.
 *
 *   Cookie name : actionplan_admin
 *   Cookie body : <base64url(JSON payload)>.<base64url(HMAC sig)>
 *   Payload     : { aud: "admin", iat: <seconds-since-epoch> }
 *   Signed with : process.env.SESSION_SECRET (shared infra)
 *   Lifetime    : 1 hour
 *
 * The `aud: "admin"` field cryptographically distinguishes this token
 * from regular trial-user session tokens — a trial-user session token
 * cannot be repurposed as an admin token, and vice versa.
 *
 * Edge-runtime compatible (Web Crypto only, no node:crypto / Buffer).
 */

export const ADMIN_COOKIE_NAME       = "actionplan_admin";
export const ADMIN_MAX_AGE_SECONDS   = 60 * 60; // 1 hour

type AdminPayload = { aud: "admin"; iat: number };

// ─── secret access ──────────────────────────────────────────────────────────

function getHmacSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is not set or too short. Add a value (≥ 16 chars) to .env.local and your deploy environment.",
    );
  }
  return secret;
}

// ─── constant-time comparison ───────────────────────────────────────────────

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Constant-time check of a submitted secret against `ADMIN_ACCESS_SECRET`.
 * Returns false if the env var is unset or too short — the internal tool
 * is treated as not configured in that case.
 */
export function adminSecretEquals(provided: string): boolean {
  const expected = process.env.ADMIN_ACCESS_SECRET;
  if (!expected || expected.length < 8) return false;
  if (typeof provided !== "string") return false;
  return constantTimeEqual(provided, expected);
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
    new TextEncoder().encode(getHmacSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadStr));
  return bufferToBase64Url(sig);
}

// ─── sign / verify ──────────────────────────────────────────────────────────

export async function signAdminToken(): Promise<string> {
  const payload: AdminPayload = { aud: "admin", iat: Math.floor(Date.now() / 1000) };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = bufferToBase64Url(new TextEncoder().encode(payloadStr).buffer);
  const sig        = await hmacSign(payloadStr);
  return `${payloadB64}.${sig}`;
}

export async function verifyAdminToken(token: string | undefined | null): Promise<AdminPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  try {
    const payloadStr  = base64UrlToString(payloadB64);
    const expectedSig = await hmacSign(payloadStr);
    if (!constantTimeEqual(sig, expectedSig)) return null;

    const payload = JSON.parse(payloadStr) as AdminPayload;
    // Must be an admin-audience token — refuses trial-user session tokens
    // even if their signature happened to match.
    if (payload.aud !== "admin" || typeof payload.iat !== "number") return null;

    const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
    if (ageSeconds < 0 || ageSeconds > ADMIN_MAX_AGE_SECONDS) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Read and verify the admin cookie from incoming request headers.
 * For use in server components and route handlers — anywhere
 * `next/headers`' `cookies()` is available.
 */
export async function getAdminSession(): Promise<AdminPayload | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token       = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminToken(token);
}
