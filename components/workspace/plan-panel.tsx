"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { AnalysisResult } from "@/types/analysis";
import { PlanTab } from "./plan-tab";
import { RisksTab } from "./risks-tab";
import { QuestionsTab } from "./questions-tab";
import { COMPLEXITY_COLORS } from "@/lib/constants";

type Tab = "plan" | "risks" | "questions";

type Props = {
  result: AnalysisResult;
  /** Optional "Next step" module rendered between the summary and the tab bar. */
  startHereSlot?: ReactNode;
};

export function PlanPanel({ result, startHereSlot }: Props) {
  const params = useSearchParams();

  // Allow deep-links from the dashboard (e.g. ?tab=risks&risk=2) to open
  // the correct tab and pass the highlight index to the target tab.
  const urlTab     = params.get("tab");
  const initialTab: Tab = (urlTab === "risks" || urlTab === "questions") ? urlTab : "plan";
  const [tab, setTab] = useState<Tab>(initialTab);

  const highlightRiskStr = params.get("risk");
  const highlightRisk    = highlightRiskStr !== null ? parseInt(highlightRiskStr, 10) : undefined;

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

      {/* Next step module — bridges the summary into action. Rendered only when
          the server passes a slot (skipped when the doc has zero tasks). */}
      {startHereSlot && (
        <div className="shrink-0 border-b border-zinc-100 px-6 py-3.5">
          {startHereSlot}
        </div>
      )}

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
        {tab === "risks"     && <RisksTab     result={result} highlightIndex={highlightRisk} />}
        {tab === "questions" && <QuestionsTab result={result} />}
      </div>
    </div>
  );
}
