"use client";

import type { AnalysisResult } from "@/types/analysis";
import { COMPLEXITY_COLORS } from "@/lib/constants";

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

type Props = {
  text: string;
  result: AnalysisResult;
  onReset: () => void;
};

export function SourcePane({ text, result, onReset }: Props) {
  const words = wordCount(text);
  const complexityColor = COMPLEXITY_COLORS[result.complexityLevel];

  const paragraphs = text
    .trim()
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col border-b border-zinc-200 bg-[var(--paper)] lg:w-[45%] lg:shrink-0 lg:border-b-0 lg:border-r lg:overflow-y-auto">
      {/* Metadata strip */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${complexityColor}`}
          >
            {result.complexityLevel}
          </span>
          <span className="font-mono text-[10.5px] text-zinc-400">
            {words.toLocaleString()} words
          </span>
          <span className="select-none text-zinc-300">·</span>
          <span className="font-mono text-[10.5px] text-zinc-400">
            grade {result.readabilityScore}
          </span>
        </div>
        <button
          onClick={onReset}
          className="shrink-0 text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-700"
        >
          ← Inbox
        </button>
      </div>

      {/* Document text */}
      <div className="px-8 py-8 lg:py-10">
        <div className="mx-auto max-w-[640px] text-[14.5px] leading-[1.7] text-zinc-600">
          {paragraphs.map((para, i) => (
            <p key={i} className="mb-[1em] last:mb-0">
              {para}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
