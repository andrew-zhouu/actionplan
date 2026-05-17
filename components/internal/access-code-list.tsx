"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AccessCodeRow = {
  code:           string;
  description:    string;
  documentLimit:  number;
  usesRemaining:  number | null;
  expiresAt:      string | null;  // ISO
  revokedAt:      string | null;  // ISO
  createdAt:      string;         // ISO
};

type Props = { codes: AccessCodeRow[] };

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day:   "numeric",
      year:  "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Lists all access codes (active + revoked) and exposes a Revoke button
 * on active rows. Revoked rows are visually muted but retained so the
 * admin can see audit history. Revoke uses a native confirm() — internal
 * tool, single-step is fine.
 */
export function AccessCodeList({ codes }: Props) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  async function handleRevoke(code: string) {
    if (!confirm(`Revoke access code "${code}"?\n\nThe code will be rejected on future redemption attempts. Existing redeemed users keep their sessions. This can be reversed only by editing the database directly.`)) {
      return;
    }

    setError(null);
    setRevoking(code);
    try {
      const res = await fetch("/api/internal/access-codes/revoke", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Admin cookie expired mid-session — bounce back to the challenge.
        if (data.error === "admin_required") {
          setRevoking(null);
          router.refresh();
          return;
        }
        setError(typeof data.error === "string" ? data.error : "Failed to revoke code.");
        setRevoking(null);
        return;
      }

      // Success — re-render the page so the row shows as revoked
      router.refresh();
      // Keep `revoking` set until the refresh re-renders us; this prevents
      // a flicker where the button reappears as "Revoke" before disappearing.
    } catch {
      setError("Network error. Please try again.");
      setRevoking(null);
    }
  }

  if (codes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 px-5 py-8 text-center">
        <p className="text-[12.5px] text-zinc-500">No codes yet. Create the first one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-3">
          <h2 className="text-[13px] font-semibold text-zinc-800">
            {codes.length} code{codes.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Active and revoked codes. Revoked codes stay visible for audit.
          </p>
        </div>

        <ul className="divide-y divide-zinc-100">
          {codes.map((c) => {
            const isRevoked = c.revokedAt !== null;
            const isExpired = !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
            const isExhausted = c.usesRemaining !== null && c.usesRemaining <= 0;

            return (
              <li
                key={c.code}
                className={`flex flex-wrap items-start justify-between gap-4 px-5 py-4 ${
                  isRevoked ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-mono text-[13px] font-semibold ${
                      isRevoked ? "text-zinc-500 line-through decoration-zinc-400" : "text-zinc-900"
                    }`}>
                      {c.code}
                    </span>

                    {isRevoked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-red-700">
                        Revoked
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700">
                        Expired
                      </span>
                    ) : isExhausted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700">
                        Exhausted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-emerald-700">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[12.5px] text-zinc-600">{c.description}</p>

                  <p className="mt-1.5 font-mono text-[10.5px] text-zinc-500">
                    {c.documentLimit} doc{c.documentLimit === 1 ? "" : "s"} per user
                    {" · "}
                    {c.usesRemaining === null ? "∞ uses" : `${c.usesRemaining} uses left`}
                    {c.expiresAt && (
                      <>
                        {" · "}
                        expires {formatDate(c.expiresAt)}
                      </>
                    )}
                    {" · "}
                    created {formatDate(c.createdAt)}
                  </p>

                  {isRevoked && c.revokedAt && (
                    <p className="mt-0.5 font-mono text-[10.5px] text-red-600">
                      Revoked {formatDate(c.revokedAt)}
                    </p>
                  )}
                </div>

                {!isRevoked && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(c.code)}
                    disabled={revoking !== null}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-[11.5px] font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {revoking === c.code ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
