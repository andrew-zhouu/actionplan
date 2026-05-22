"use client";

import { useState } from "react";
import type { PlanStep } from "@/app/actions/task-plans";

type Props = {
  steps:           PlanStep[];
  /** Index of the step to open initially, for a tasteful default. */
  initialExpanded: number;
};

/**
 * Smooth-scrolls to the Draft section. Mirrors the helper in the real-app
 * TaskPlanSection so the "Generate draft for this step" affordance behaves
 * identically in the demo.
 */
function jumpToDraftSection() {
  document.getElementById("draft-section")?.scrollIntoView({
    behavior: "smooth",
    block:    "start",
  });
}

/**
 * Demo-only action-plan card with REAL expand/collapse interaction.
 *
 * Visually identical to the prior static version inside demo-workspace.tsx,
 * but now driven by the same `Set<number>` toggle pattern used by the live
 * `components/tasks/task-plan-section.tsx`: each row is a real <button>,
 * clicking it toggles that step into/out of the expanded set, multiple
 * steps can be open at once, and `aria-expanded` reflects the live state.
 *
 * Initial state seeds one step open (whichever index the demo page passes
 * via `initialExpanded`) so the demo lands looking like the previous
 * snapshot. Everything after that is real user interaction.
 *
 * Only the plan card needs client-side state — the rest of the demo
 * remains server-rendered.
 */
export function DemoPlanSection({ steps, initialExpanded }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const s = new Set<number>();
    if (initialExpanded >= 0 && initialExpanded < steps.length) {
      s.add(initialExpanded);
    }
    return s;
  });

  function toggleExpanded(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else             next.add(i);
      return next;
    });
  }

  return (
    <div
      id="action-plan-section"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white scroll-mt-6"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-700">Action plan</h2>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {steps.length} steps · AI-generated
          </p>
        </div>
      </div>
      <div className="px-5 py-5">
        <ol className="space-y-1">
          {steps.map((step, i) => {
            const isExpanded = expanded.has(i);
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
      </div>
    </div>
  );
}
