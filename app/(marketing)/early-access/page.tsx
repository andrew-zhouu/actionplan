import type { Metadata } from "next";
import { Suspense } from "react";
import { EarlyAccessForm } from "@/components/early-access/early-access-form";

export const metadata: Metadata = {
  title:       "Early access · ActionPlan",
  description: "Enter your email to use ActionPlan on your own documents.",
};

export default function EarlyAccessPage() {
  return (
    <div className="mx-auto w-full max-w-md px-6 py-16 sm:py-24">

      <header className="mb-8">
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Early access
        </p>
        <h1 className="font-display text-[32px] font-normal leading-tight tracking-[-0.01em] text-zinc-900 sm:text-[36px]">
          Get early access
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">
          Enter your email to use ActionPlan on your own documents.
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">
          Already used ActionPlan? Enter the same email to continue where you left off.
        </p>
      </header>

      {/* Suspense is required because the form uses useSearchParams() */}
      <Suspense fallback={null}>
        <EarlyAccessForm />
      </Suspense>

      <p className="mt-8 text-[11.5px] leading-relaxed text-zinc-400">
        ActionPlan is in early access. We&apos;ll let you know when general
        access opens.
      </p>
    </div>
  );
}
