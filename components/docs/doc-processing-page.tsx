"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const POLL_INTERVAL_MS = 2000;

/**
 * Slim processing state for /app/docs/[id]. Polls /api/document-status
 * every 2s; when the doc flips to "complete" or "failed", calls
 * router.refresh() to let the server-side page re-render into the
 * appropriate next state (full workspace or failed view).
 */
export function DocProcessingPage({ id }: { id: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    async function pollOnce() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/document-status?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { status?: string };
          if (data.status === "complete" || data.status === "failed") {
            router.refresh();
            return; // stop polling — refresh will re-render the page
          }
        }
        // Non-OK responses: stop polling silently (auth lost, 404, etc.)
      } catch {
        // Network error — fall through to retry on the next tick
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
  }, [id, router]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-50">
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-zinc-200 bg-white px-8 py-12 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center">
            <span className="size-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700" />
          </div>
          <h2 className="font-display text-[22px] font-normal tracking-tight text-zinc-900">
            Analyzing your document
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-zinc-500">
            This usually takes 10&ndash;30 seconds. You can navigate away —
            we&apos;ll keep working in the background and you can come back
            anytime to see the result.
          </p>
          <Link
            href="/app"
            className="mt-7 inline-block text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            ← Back to inbox
          </Link>
        </div>
      </div>
    </div>
  );
}
