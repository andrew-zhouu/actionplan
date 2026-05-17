"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "email" | "code";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Two-mode early-access form.
 *
 *   - "email" (default, primary): single email input. Resumes existing
 *     trial users or creates a new one at the default tier.
 *   - "code" (secondary, toggled): single access-code input, no email.
 *     Creates a new code-tier trial user — session identity comes from
 *     the cookie alone, so re-entering the same code after cookie expiry
 *     starts a fresh user (documented trade-off for not requiring email).
 *
 * The toggle link is visually quiet so the email path stays the primary
 * surface. Both modes hit POST /api/early-access; the server branches
 * on which field is present.
 */
export function EarlyAccessForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextRaw = params.get("next");
  const next    = nextRaw && nextRaw.startsWith("/app") ? nextRaw : undefined;

  const [mode, setMode]             = useState<Mode>("email");
  const [email, setEmail]           = useState("");
  const [code, setCode]             = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Build the request body for the active mode. The server validates
    // the shape and rejects with a specific message if needed.
    const body: { email?: string; code?: string; next?: string } = {};

    if (mode === "email") {
      const trimmedEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }
      body.email = trimmedEmail;
    } else {
      const trimmedCode = code.trim().toLowerCase();
      if (!trimmedCode) {
        setError("Please enter your access code.");
        return;
      }
      body.code = trimmedCode;
    }

    if (next) body.next = next;

    setSubmitting(true);
    try {
      const res = await fetch("/api/early-access", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof json.message === "string"
            ? json.message
            : "Something went wrong. Please try again.",
        );
        setSubmitting(false);
        return;
      }

      router.push(typeof json.next === "string" ? json.next : "/app");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "email" ? (
        <div>
          <label htmlFor="email" className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          />
        </div>
      ) : (
        <div>
          <label htmlFor="code" className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Access code
          </label>
          <input
            id="code"
            type="text"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={submitting}
            placeholder="Provided by your organization"
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          />
          <p className="mt-2 text-[11.5px] text-zinc-500">
            No email required — your access is tied to this browser session.
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {submitting
          ? "Continuing…"
          : mode === "email"
          ? "Continue →"
          : "Continue with code →"}
      </button>

      {/* Quiet secondary toggle — keeps the org code path discoverable
          without competing with the primary email CTA above. */}
      <div className="text-center">
        {mode === "email" ? (
          <button
            type="button"
            onClick={() => switchMode("code")}
            className="text-[12px] text-zinc-500 transition-colors hover:text-zinc-900"
          >
            Have an organization access code?{" "}
            <span className="font-medium text-zinc-700">Use a code →</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode("email")}
            className="text-[12px] text-zinc-500 transition-colors hover:text-zinc-900"
          >
            ← Use email instead
          </button>
        )}
      </div>
    </form>
  );
}
