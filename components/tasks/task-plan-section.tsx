"use client";

import { useState, useTransition } from "react";
import { generateTaskPlan, type PlanContext } from "@/app/actions/task-plans";

type Props = {
  documentId:   string;
  kind:         "action_item" | "deadline";
  taskIndex:    number;
  initialSteps: string[] | null;
  planContext:  PlanContext;
};

export function TaskPlanSection({
  documentId,
  kind,
  taskIndex,
  initialSteps,
  planContext,
}: Props) {
  const [steps, setSteps]            = useState<string[] | null>(initialSteps);
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateTaskPlan(documentId, kind, taskIndex, planContext);
        setSteps(result.steps);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate plan");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-700">Action plan</h2>
          {steps && !isPending && (
            <p className="mt-0.5 text-[11px] text-zinc-400">
              {steps.length} step{steps.length !== 1 ? "s" : ""} · AI-generated
            </p>
          )}
        </div>
        {/* Regenerate — only shown when steps exist, gives secondary affordance */}
        {steps && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-700 disabled:opacity-40"
          >
            {isPending ? "Generating…" : "Regenerate"}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4">

        {/* Empty state — prompt to generate */}
        {!steps && !isPending && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Generate a step-by-step plan for completing this task, grounded in the document context.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-zinc-700"
            >
              Generate plan
            </button>
          </div>
        )}

        {/* Loading */}
        {isPending && (
          <div className="flex items-center gap-2.5 py-1">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin text-zinc-400"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p className="text-[13px] text-zinc-400">Generating plan…</p>
          </div>
        )}

        {/* Steps list */}
        {steps && !isPending && (
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-mono text-[10px] font-bold text-zinc-500">
                  {i + 1}
                </span>
                <p className="text-[13px] leading-snug text-zinc-700">{step}</p>
              </li>
            ))}
          </ol>
        )}

        {/* Error */}
        {error && !isPending && (
          <p className="mt-3 text-[12px] text-red-500">{error}</p>
        )}

      </div>
    </div>
  );
}
