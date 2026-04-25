"use client";

import type { AnalysisResult } from "@/types/analysis";

type Props = { result: AnalysisResult };

export function RisksTab({ result }: Props) {
  if (result.risks.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-zinc-400">
        No risks flagged for this document.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 px-6 py-5">
      {result.risks.map((risk, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4"
        >
          <div className="mt-[5px] size-1.5 shrink-0 rounded-full bg-amber-400" />
          <p className="text-sm leading-relaxed text-zinc-700">{risk}</p>
        </div>
      ))}
    </div>
  );
}
