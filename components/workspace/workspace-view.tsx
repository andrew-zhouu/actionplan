"use client";

import type { AnalysisResult } from "@/types/analysis";
import { SourcePane } from "./source-pane";
import { PlanPanel } from "./plan-panel";

type Props = {
  text: string;
  result: AnalysisResult;
  onReset: () => void;
};

export function WorkspaceView({ text, result, onReset }: Props) {
  return (
    <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 lg:overflow-hidden">
      <SourcePane text={text} result={result} onReset={onReset} />
      <PlanPanel result={result} />
    </div>
  );
}
