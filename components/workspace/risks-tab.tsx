"use client";

import { useEffect, useRef } from "react";
import type { AnalysisResult } from "@/types/analysis";

type Props = {
  result:         AnalysisResult;
  highlightIndex?: number; // index of the risk to scroll to and highlight on mount
};

export function RisksTab({ result, highlightIndex }: Props) {
  const highlightRef = useRef<HTMLDivElement>(null);

  // Scroll the highlighted risk into view once the tab mounts.
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []); // intentionally runs once on mount

  if (result.risks.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-zinc-400">
        No risks flagged for this document.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 px-6 py-5">
      {result.risks.map((risk, i) => {
        const isHighlighted = i === highlightIndex;
        return (
          <div
            key={i}
            ref={isHighlighted ? highlightRef : undefined}
            className={`flex gap-3 rounded-xl border p-4 transition-all duration-300 ${
              isHighlighted
                ? "border-amber-300 bg-amber-50 ring-2 ring-amber-200 ring-offset-1"
                : "border-amber-100 bg-amber-50"
            }`}
          >
            <div className="mt-[5px] size-1.5 shrink-0 rounded-full bg-amber-400" />
            <p className="text-sm leading-relaxed text-zinc-700">{risk}</p>
          </div>
        );
      })}
    </div>
  );
}
