"use client";

import { Suspense, type ReactNode } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { SourcePane } from "./source-pane";
import { PlanPanel } from "./plan-panel";

type Props = {
  text: string;
  result: AnalysisResult;
  onReset: () => void;
  startHereSlot?: ReactNode;
};

export function WorkspaceView({ text, result, onReset, startHereSlot }: Props) {
  return (
    <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 lg:overflow-hidden">
      <SourcePane text={text} result={result} onReset={onReset} />
      {/* Suspense is required because PlanPanel uses useSearchParams() */}
      <Suspense fallback={null}>
        <PlanPanel result={result} startHereSlot={startHereSlot} />
      </Suspense>
    </div>
  );
}
