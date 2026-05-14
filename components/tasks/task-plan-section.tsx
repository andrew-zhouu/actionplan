"use client";

import { useState, useTransition } from "react";
import {
  generateTaskPlan,
  type PlanContext,
  type PlanStep,
} from "@/app/actions/task-plans";

type Props = {
  documentId:   string;
  kind:         "action_item" | "deadline";
  taskIndex:    number;
  initialSteps: PlanStep[] | null;
  planContext:  PlanContext;
};

/**
 * Smooth-scrolls the page to the Draft section (anchor `#draft-section`).
 * No-op if the section is not in the DOM (e.g. mid-regenerate / unmounted).
 */
function jumpToDraftSection() {
  document.getElementById("draft-section")?.scrollIntoView({
    behavior: "smooth",
    block:    "start",
  });
}

export function TaskPlanSection({
  documentId,
  kind,
  taskIndex,
  initialSteps,
  planContext,
}: Props) {
  const [steps, setSteps]                = useState<PlanStep[] | null>(initialSteps);
  const [expanded, setExpanded]          = useState<Set<number>>(new Set());
  const [error, setError]                = useState<string | null>(null);
  const [isPending, startTransition]     = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateTaskPlan(documentId, kind, taskIndex, planContext);
        setSteps(result.steps);
        // Reset expanded indices — the step list is now entirely new
        setExpanded(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate plan");
      }
    });
  }

  function toggleExpanded(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else             next.add(i);
      return next;
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
        {/* Regenerate — section-level action, mirrors Draft section's header pattern */}
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
      <div className="px-5 py-5">

        {/* ── Empty state — prompt to generate */}
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

        {/* ── Loading */}
        {isPending && (
          <div className="flex items-center gap-2.5 py-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin text-zinc-400">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p className="text-[13px] text-zinc-400">Generating plan…</p>
          </div>
        )}

        {/* ── Steps list — expandable rows */}
        {steps && !isPending && (
          <ol className="space-y-1">
            {steps.map((step, i) => {
              const isExpanded = expanded.has(i);
              // A row is expandable when it has additional content to reveal
              const canExpand  = step.detail.length > 0 || step.needsDraft;

              return (
                <li key={i} className="overflow-hidden rounded-md">
                  {/* Row header — click to toggle expansion */}
                  <button
                    type="button"
                    onClick={() => { if (canExpand) toggleExpanded(i); }}
                    disabled={!canExpand}
                    aria-expanded={isExpanded}
                    className={`flex w-full items-start gap-3 px-2.5 py-2 text-left transition-colors ${
                      canExpand
                        ? "cursor-pointer hover:bg-zinc-50"
                        : "cursor-default"
                    }`}
                  >
                    <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-mono text-[10px] font-bold text-zinc-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-[13px] font-medium leading-snug text-zinc-700">
                          {step.title}
                        </p>
                        {step.needsDraft && (
                          /* Informational badge — zinc-neutral, never alarming.
                             Tells the user this step benefits from a draft artifact. */
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Draft helpful
                          </span>
                        )}
                      </div>
                    </div>
                    {canExpand && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`mt-1.5 shrink-0 text-zinc-400 transition-transform duration-150 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </button>

                  {/* Expanded panel — detail + optional step→draft affordance */}
                  {isExpanded && (
                    <div className="pb-3 pl-[42px] pr-2.5 pt-1">
                      {step.detail && (
                        <p className="text-[12.5px] leading-relaxed text-zinc-600">
                          {step.detail}
                        </p>
                      )}
                      {step.needsDraft && (
                        /* Actionable chip — distinct from the informational
                           "Draft helpful" badge above. Outlined container
                           reads as a real control; extra top margin separates
                           it from the explanatory detail paragraph. */
                        <button
                          type="button"
                          onClick={jumpToDraftSection}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                        >
                          Generate draft for this step
                          <span aria-hidden="true" className="text-zinc-400">→</span>
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
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
