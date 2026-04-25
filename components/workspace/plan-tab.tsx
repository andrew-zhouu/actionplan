"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/types/analysis";

type Props = { result: AnalysisResult };

function tryParseDate(str: string): Date | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function PlanTab({ result }: Props) {
  const [done, setDone] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="divide-y divide-zinc-100">
      {result.actionItems.length > 0 && (
        <section className="px-6 py-5">
          <h3 className="mb-3 flex items-baseline gap-2 text-[10.5px] font-semibold uppercase tracking-widest text-zinc-400">
            Action items
            <span className="font-normal text-zinc-300">
              {result.actionItems.length}
            </span>
          </h3>
          <ul className="space-y-0.5">
            {result.actionItems.map((item, i) => {
              const isDone = done.has(i);
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-50"
                >
                  <button
                    onClick={() => toggle(i)}
                    aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                    className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isDone
                        ? "border-zinc-700 bg-zinc-800"
                        : "border-zinc-300 bg-white hover:border-zinc-400"
                    }`}
                  >
                    {isDone && (
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`text-sm leading-relaxed ${
                      isDone ? "text-zinc-400 line-through" : "text-zinc-700"
                    }`}
                  >
                    {item}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 px-3 text-[11px] text-zinc-300">
            Progress tracked this session only
          </p>
        </section>
      )}

      {result.deadlines.length > 0 && (
        <section className="px-6 py-5">
          <h3 className="mb-3 flex items-baseline gap-2 text-[10.5px] font-semibold uppercase tracking-widest text-zinc-400">
            Deadlines
            <span className="font-normal text-zinc-300">
              {result.deadlines.length}
            </span>
          </h3>
          <ul className="space-y-4">
            {result.deadlines.map((deadline, i) => {
              const parsed = deadline.date ? tryParseDate(deadline.date) : null;
              return (
                <li key={i} className="flex items-start gap-4">
                  {parsed ? (
                    <div className="w-10 shrink-0 text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 leading-none">
                        {parsed.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                      <div className="font-display text-[26px] font-normal leading-none text-zinc-800 mt-0.5">
                        {parsed.getDate()}
                      </div>
                    </div>
                  ) : deadline.date ? (
                    <div className="shrink-0 rounded-md bg-zinc-100 px-2 py-1">
                      <span className="font-mono text-[10.5px] text-zinc-500">
                        {deadline.date}
                      </span>
                    </div>
                  ) : null}
                  <p className="text-sm leading-relaxed text-zinc-600 pt-0.5">
                    {deadline.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {result.actionItems.length === 0 && result.deadlines.length === 0 && (
        <div className="px-6 py-10 text-center text-sm text-zinc-400">
          No action items or deadlines found.
        </div>
      )}
    </div>
  );
}
