"use client";

import type { AnalysisResult } from "@/types/analysis";

type Props = { result: AnalysisResult };

export function QuestionsTab({ result }: Props) {
  if (result.questionsToAsk.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-zinc-400">
        No questions suggested for this document.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 px-6 py-5">
      {result.questionsToAsk.map((q, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4"
        >
          <div className="mt-[5px] size-1.5 shrink-0 rounded-full bg-blue-400" />
          <p className="text-sm leading-relaxed text-zinc-700">{q}</p>
        </div>
      ))}
    </div>
  );
}
