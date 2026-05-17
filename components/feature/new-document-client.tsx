"use client";

import { useRouter } from "next/navigation";
import { ActionPlanForm } from "./action-plan-form";

type Props = {
  usage:       { documentsUsed: number; documentLimit: number } | null;
  locked?:     boolean;
  lockedText?: string;
};

/**
 * Thin client wrapper for the New Document page. The page itself is a
 * server component so it can fetch the user's trial usage and the
 * latest-doc state card; this wrapper owns the router-based refresh
 * that fires after a submit.
 *
 * With the persistent-processing + one-in-flight model:
 *   - On submit success the API responds with { id, status: "processing" }
 *     after a sub-second insert. We DON'T navigate to /app/docs/[id] —
 *     the compose page is the main surface. Instead, router.refresh()
 *     re-renders /app/new, which now sees the new processing row as
 *     "latest", renders the state card above the form, and passes
 *     locked=true so the form disables.
 *   - When the state card's polling detects the doc has completed, it
 *     calls router.refresh() too — the latest is no longer processing,
 *     the form unlocks, and the "Latest ready" card surfaces with an
 *     Open result CTA.
 *
 * The dedicated /app/docs/[id] processing page remains as a deep-link
 * fallback — reachable from the state card's Open link, or from direct
 * URL — but is no longer the default submitter destination.
 */
export function NewDocumentClient({ usage, locked = false, lockedText }: Props) {
  const router = useRouter();

  function handleSuccess(_response: { id: string }) {
    // Stay on /app/new and re-render. The newly inserted processing row
    // becomes the latest doc; the page surfaces it via the state card and
    // locks the form. The id isn't used here — server-rendered state is.
    router.refresh();
  }

  return (
    <ActionPlanForm
      onSuccess={handleSuccess}
      usage={usage}
      locked={locked}
      lockedText={lockedText}
    />
  );
}
