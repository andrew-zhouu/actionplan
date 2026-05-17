"use client";

import { useRouter } from "next/navigation";
import { ActionPlanForm } from "./action-plan-form";

type Props = {
  usage: { documentsUsed: number; documentLimit: number } | null;
};

/**
 * Thin client wrapper for the New Document page. The page itself is a
 * server component so it can fetch the user's trial usage and the
 * latest-doc state card; this wrapper owns the router-based navigation
 * that fires when the analyze API returns the inserted document id.
 *
 * With the persistent-processing model, the API responds quickly with
 * just { id, status: "processing" }. The actual analysis runs server-side
 * via Next.js `after()` and the user lands on /app/docs/[id] which
 * polls for completion.
 */
export function NewDocumentClient({ usage }: Props) {
  const router = useRouter();

  function handleSuccess(response: { id: string }) {
    router.push(`/app/docs/${response.id}`);
  }

  return <ActionPlanForm onSuccess={handleSuccess} usage={usage} />;
}
