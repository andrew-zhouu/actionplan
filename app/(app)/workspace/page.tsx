"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/types/analysis";
import { Topbar } from "@/components/shell/topbar";
import { WorkspaceView } from "@/components/workspace/workspace-view";

const STORAGE_KEY = "actionplan:workspace";

type WorkspaceData = { text: string; result: AnalysisResult };

export default function WorkspacePage() {
  const router = useRouter();
  const [data, setData] = useState<WorkspaceData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      setData(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      router.replace("/");
    }
  }, [router]);

  function handleReset() {
    sessionStorage.removeItem(STORAGE_KEY);
    router.push("/");
  }

  if (!data) {
    return (
      <>
        <Topbar crumbs={["Inbox"]} />
        <div className="flex flex-1 items-center justify-center bg-zinc-50">
          <span className="text-sm text-zinc-400">Loading…</span>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar crumbs={[{ label: "Inbox", href: "/" }, data.result.documentType]} />
      <WorkspaceView
        text={data.text}
        result={data.result}
        onReset={handleReset}
      />
    </>
  );
}
