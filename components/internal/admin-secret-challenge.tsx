"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * Page-level admin authentication challenge for the internal access-code
 * tool. Renders a single password input — no other internals leak.
 *
 * On successful submission, the server sets a 1-hour admin cookie and
 * we call router.refresh() so the parent server component re-renders
 * and reveals the actual create-code form (which it only does when
 * `getAdminSession()` returns a valid token).
 */
export function AdminSecretChallenge() {
  const router = useRouter();
  const [secret, setSecret]         = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!secret) {
      setError("Please enter the admin secret.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/internal/admin-auth", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ secret }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Authentication failed.");
        setSubmitting(false);
        return;
      }

      // Cookie set — re-render the parent server component, which will
      // see the admin session and render the actual form.
      setSecret("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="admin-secret" className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Admin secret
        </label>
        <input
          id="admin-secret"
          type="password"
          required
          autoComplete="off"
          autoFocus
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          disabled={submitting}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
        />
        <p className="mt-1.5 text-[11.5px] text-zinc-500">
          Required to access internal tooling. Session lasts 1 hour after entry.
        </p>
      </div>

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
        {submitting ? "Verifying…" : "Continue →"}
      </button>
    </form>
  );
}
