"use client";

import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/types/analysis";
import { Topbar } from "@/components/shell/topbar";
import { ActionPlanForm } from "@/components/feature/action-plan-form";
import { STORAGE_KEY } from "@/lib/constants";

type AnalyzeResponse = AnalysisResult & { id?: string };

export default function NewDocumentPage() {
  const router = useRouter();

  function handleSuccess(text: string, response: AnalyzeResponse) {
    if (response.id) {
      router.push(`/docs/${response.id}`);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ text, result: response }));
      router.push("/workspace");
    }
  }

  return (
    <>
      <Topbar crumbs={[{ label: "Inbox", href: "/" }, "New document"]} />
      <div className="flex-1 overflow-y-auto bg-zinc-50">
        <main className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-8">
            <p className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-400">
              New document · Inbox
            </p>
            <h1 className="font-display text-[44px] font-normal leading-[1.05] tracking-[-0.015em] text-zinc-900">
              Paste the document. Get a plan you can act on in seconds.
            </h1>
            <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-zinc-500">
              ActionPlan reads admissions letters, leases, aid notices, and
              policies — then pulls out what you must do, by when, and what
              could trip you up.
            </p>
          </div>
          <ActionPlanForm onSuccess={handleSuccess} />
        </main>
      </div>
    </>
  );
}
