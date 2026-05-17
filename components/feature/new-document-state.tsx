"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const POLL_INTERVAL_MS = 2000;

export type NewDocumentStateProps =
  | { kind: "processing"; id: string }
  | { kind: "ready";      id: string; documentType: string }
  | { kind: "failed";     id: string };

/**
 * Persistent-state surface above the compose form on /app/new.
 *
 * - "processing": shows a spinner card and polls /api/document-status
 *   every 2s; when status changes, calls router.refresh() so the parent
 *   server component re-derives the appropriate next state.
 * - "ready": shows a compact "Latest analysis ready" card with
 *   Open result / Start another (dismiss). Dismissed state is local
 *   to the current session — re-shows on full navigation back.
 * - "failed": small amber notice with View / Start another.
 */
export function NewDocumentState(state: NewDocumentStateProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // Poll only on the processing branch. Effect re-runs if the id changes
  // (e.g. a new analysis was started in another tab and the user refreshed).
  useEffect(() => {
    if (state.kind !== "processing") return;

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    async function pollOnce() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/document-status?id=${encodeURIComponent(state.id)}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { status?: string };
          if (data.status === "complete" || data.status === "failed") {
            router.refresh();
            return;
          }
        }
      } catch {
        // Network error — retry on the next tick
      }
      if (!cancelled) {
        timerId = setTimeout(pollOnce, POLL_INTERVAL_MS);
      }
    }

    timerId = setTimeout(pollOnce, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [state, router]);

  if (dismissed) return null;

  if (state.kind === "processing") {
    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-zinc-800">
              Analyzing your latest document…
            </p>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              This usually takes 10&ndash;30 seconds. You can wait, navigate away, or start another below.
            </p>
          </div>
        </div>
        <Link
          href={`/app/docs/${state.id}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
        >
          Open
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  if (state.kind === "ready") {
    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.25"
            strokeLinecap="round" strokeLinejoin="round"
            className="shrink-0 text-emerald-600"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-emerald-900">
              Latest analysis ready
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-emerald-700">
              {state.documentType}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/app/docs/${state.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            Open result
            <span aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            Start another
          </button>
        </div>
      </div>
    );
  }

  // state.kind === "failed"
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.25"
          strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 text-amber-600"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8"  x2="12" y2="13" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-amber-900">
            Latest analysis failed
          </p>
          <p className="mt-0.5 text-[11.5px] text-amber-700">
            Try starting another below.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/app/docs/${state.id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-800 transition-colors hover:border-amber-400 hover:bg-amber-50"
        >
          View
          <span aria-hidden="true">→</span>
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-amber-800 transition-colors hover:bg-amber-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
