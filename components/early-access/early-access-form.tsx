"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "email" | "email-code";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EarlyAccessForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextRaw = params.get("next");
  const next    = nextRaw && nextRaw.startsWith("/app") ? nextRaw : undefined;

  const [mode, setMode]               = useState<Mode>("email");
  const [email, setEmail]             = useState("");
  const [code, setCode]               = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const body: { email: string; code?: string; next?: string } = { email: trimmedEmail };
      if (mode === "email-code") {
        const trimmedCode = code.trim().toLowerCase();
        if (!trimmedCode) {
          setError("Please enter your access code, or switch back to email-only.");
          setSubmitting(false);
          return;
        }
        body.code = trimmedCode;
      }
      if (next) body.next = next;

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

      // Successful: cookie was set server-side, navigate into the app
      router.push(typeof json.next === "string" ? json.next : "/app");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email field */}
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

      {/* Optional code field — only when toggled on */}
      {mode === "email-code" && (
        <div>
          <label htmlFor="code" className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Access code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={submitting}
            placeholder="Provided by your organization"
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </p>
      )}

      {/* Primary CTA */}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {submitting ? "Continuing…" : "Continue →"}
      </button>

      {/* Secondary toggle — visually quiet, below the primary button */}
      <div className="text-center">
        {mode === "email" ? (
          <button
            type="button"
            onClick={() => setMode("email-code")}
            className="text-[12px] text-zinc-500 transition-colors hover:text-zinc-900"
          >
            Have an organization access code?{" "}
            <span className="font-medium text-zinc-700">Use a code →</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setMode("email"); setCode(""); setError(null); }}
            className="text-[12px] text-zinc-500 transition-colors hover:text-zinc-900"
          >
            ← Use email only
          </button>
        )}
      </div>
    </form>
  );
}
