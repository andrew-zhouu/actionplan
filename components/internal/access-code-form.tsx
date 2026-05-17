"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type SuccessRecord = {
  code:           string;
  description:    string;
  documentLimit:  number;
  usesRemaining:  number | null;
  expiresAt:      string | null;
};

/**
 * Access-code creation form. Only rendered after the admin secret has
 * been exchanged for an admin cookie at /api/internal/admin-auth — the
 * cookie is what authorizes /api/internal/access-codes on submit.
 *
 * The form itself no longer carries an admin-secret field; the secret
 * only ever lives in the AdminSecretChallenge component (which sets
 * the cookie and then unmounts).
 */
export function AccessCodeForm() {
  const router = useRouter();

  const [code, setCode]                   = useState("");
  const [description, setDescription]     = useState("");
  const [documentLimit, setDocumentLimit] = useState("");
  const [usesRemaining, setUsesRemaining] = useState("");
  const [expiresAt, setExpiresAt]         = useState("");

  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<SuccessRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const codeValue = code.trim().toLowerCase();
    if (!codeValue) {
      setError("Code is required.");
      return;
    }

    const descriptionValue = description.trim();
    if (!descriptionValue) {
      setError("Description is required.");
      return;
    }

    const documentLimitInt = parseInt(documentLimit, 10);
    if (!Number.isInteger(documentLimitInt) || documentLimitInt <= 0) {
      setError("Document limit must be a positive integer.");
      return;
    }

    const body: Record<string, unknown> = {
      code:          codeValue,
      description:   descriptionValue,
      documentLimit: documentLimitInt,
    };

    if (usesRemaining.trim()) {
      const usesInt = parseInt(usesRemaining, 10);
      if (!Number.isInteger(usesInt) || usesInt <= 0) {
        setError("Uses remaining must be a positive integer, or leave blank.");
        return;
      }
      body.usesRemaining = usesInt;
    }

    if (expiresAt.trim()) {
      body.expiresAt = expiresAt;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/internal/access-codes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Admin cookie expired (or never present) — bounce back to the
        // challenge by refreshing the parent server component, which
        // will see no admin session and render AdminSecretChallenge.
        if (data.error === "admin_required") {
          setSubmitting(false);
          router.refresh();
          return;
        }
        setError(typeof data.error === "string" ? data.error : "Failed to create code.");
        setSubmitting(false);
        return;
      }

      setSuccess({
        code:          data.code,
        description:   data.description,
        documentLimit: data.documentLimit,
        usesRemaining: data.usesRemaining ?? null,
        expiresAt:     data.expiresAt ?? null,
      });
      // Clear fields so another code can be created immediately.
      setCode("");
      setDescription("");
      setDocumentLimit("");
      setUsesRemaining("");
      setExpiresAt("");
      setSubmitting(false);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Code */}
      <div>
        <label htmlFor="code" className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Code
        </label>
        <input
          id="code"
          type="text"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={submitting}
          placeholder="acme-2026q2"
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
        />
        <p className="mt-1.5 text-[11.5px] text-zinc-500">
          Lowercase, letters/numbers/dashes/underscores. This is what the org will enter on the access page.
        </p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Description
        </label>
        <input
          id="description"
          type="text"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          placeholder="Acme Inc pilot Q2 2026"
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
        />
        <p className="mt-1.5 text-[11.5px] text-zinc-500">
          Internal label for tracking. Not shown to org users.
        </p>
      </div>

      {/* Document limit */}
      <div>
        <label htmlFor="documentLimit" className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Document limit
        </label>
        <input
          id="documentLimit"
          type="number"
          required
          min={1}
          value={documentLimit}
          onChange={(e) => setDocumentLimit(e.target.value)}
          disabled={submitting}
          placeholder="25"
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
        />
        <p className="mt-1.5 text-[11.5px] text-zinc-500">
          Per-user trial limit for anyone who redeems this code.
        </p>
      </div>

      {/* Uses remaining (optional) */}
      <div>
        <label htmlFor="usesRemaining" className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Uses remaining <span className="font-sans text-zinc-400 normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="usesRemaining"
          type="number"
          min={1}
          value={usesRemaining}
          onChange={(e) => setUsesRemaining(e.target.value)}
          disabled={submitting}
          placeholder="Leave blank for unlimited redemptions"
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
        />
        <p className="mt-1.5 text-[11.5px] text-zinc-500">
          Total number of times the code can be redeemed across all users.
        </p>
      </div>

      {/* Expires at (optional) */}
      <div>
        <label htmlFor="expiresAt" className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Expires at <span className="font-sans text-zinc-400 normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="expiresAt"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          disabled={submitting}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </p>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12.5px] text-emerald-900">
          <p className="font-semibold">Code created.</p>
          <p className="mt-1">
            <span className="font-mono">{success.code}</span>
            <span className="text-emerald-700"> · {success.description}</span>
          </p>
          <p className="mt-0.5 text-[11.5px] text-emerald-700">
            {success.documentLimit} documents per user
            {success.usesRemaining !== null && ` · ${success.usesRemaining} uses remaining`}
            {success.expiresAt && ` · expires ${new Date(success.expiresAt).toLocaleDateString()}`}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create code"}
      </button>
    </form>
  );
}
