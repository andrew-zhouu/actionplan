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
    // router.back() preserves inbox filter params (e.g. ?q=lease&complexity=High).
    // Fall back to "/" if the user arrived directly at this URL with no prior history.
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return <WorkspaceView text={text} result={result} onReset={handleReset} />;
}
