"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { PlanTab } from "./plan-tab";
import { RisksTab } from "./risks-tab";
import { QuestionsTab } from "./questions-tab";

type Tab = "plan" | "risks" | "questions";

const COMPLEXITY_COLORS: Record<AnalysisResult["complexityLevel"], string> = {
  Low:    "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  High:   "bg-red-100 text-red-800",
};

type Props = { result: AnalysisResult };

export function PlanPanel({ result }: Props) {
  const [tab, setTab] = useState<Tab>("plan");

  const tabs: {
    key: Tab | "ask";
    label: string;
    count?: number;
    disabled?: boolean;
  }[] = [
    { key: "plan",      label: "Plan" },
    { key: "risks",     label: "Risks",     count: result.risks.length },
    { key: "questions", label: "Questions", count: result.questionsToAsk.length },
    { key: "ask",       label: "Ask",       disabled: true },
  ];

  return (
    <div className="flex flex-col bg-white lg:flex-1 lg:min-h-0">
      {/* Header — summary always visible */}
      <div className="shrink-0 border-b border-zinc-100 px-6 pt-5 pb-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span
            className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${COMPLEXITY_COLORS[result.complexityLevel]}`}
          >
            {result.complexityLevel}
          </span>
          <span className="text-xs text-zinc-500">{result.documentType}</span>
          <span className="select-none font-mono text-[10.5px] text-zinc-300">·</span>
          <span className="font-mono text-[10.5px] text-zinc-400">
            grade {result.readabilityScore}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-zinc-600">{result.summary}</p>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-zinc-200 px-2">
        {tabs.map(({ key, label, count, disabled }) => {
          const isActive = !disabled && tab === (key as Tab);
          return (
            <button
              key={key}
              disabled={disabled}
              title={disabled ? "Coming soon" : undefined}
              onClick={() => !disabled && setTab(key as Tab)}
              className={`relative px-3 py-3 text-xs font-medium transition-colors ${
                disabled
                  ? "cursor-not-allowed text-zinc-300"
                  : isActive
                  ? "text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {label}
              {count != null && count > 0 && (
                <span
                  className={`ml-1 ${
                    isActive ? "text-zinc-400" : "text-zinc-300"
                  }`}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-zinc-900" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "plan"      && <PlanTab      result={result} />}
        {tab === "risks"     && <RisksTab     result={result} />}
        {tab === "questions" && <QuestionsTab result={result} />}
      </div>
    </div>
  );
}
