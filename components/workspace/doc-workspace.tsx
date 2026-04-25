"use client";

import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/types/analysis";
import { WorkspaceView } from "./workspace-view";

type Props = {
  text: string;
  result: AnalysisResult;
};

export function DocWorkspace({ text, result }: Props) {
  const router = useRouter();

  function handleReset() {
    router.push("/");
  }

  return <WorkspaceView text={text} result={result} onReset={handleReset} />;
}
