import type { Metadata } from "next";
import { Suspense } from "react";
import { EarlyAccessForm } from "@/components/early-access/early-access-form";

export const metadata: Metadata = {
  title:       "Try ActionPlan",
  description: "Enter your email to start using ActionPlan with your own documents. You'll get access immediately — no invitation code needed.",
};

export default function EarlyAccessPage() {
  return (
    <div className="mx-auto w-full max-w-md px-6 py-16 sm:py-24">

      <header className="mb-8">
        {/* Early-access kicker — editorial hairline + label.
            Matches the marketing hero kicker exactly. Short zinc-300
            hairline as a "start of section" cue, mono-uppercase
            label, no dot / no border / no surface. */}
        <p className="mb-5 inline-flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700">
          <span aria-hidden="true" className="h-px w-6 bg-zinc-300" />
          Early access
        </p>
        <h1 className="font-display text-[32px] font-normal leading-tight tracking-[-0.01em] text-zinc-900 sm:text-[36px]">
          Try ActionPlan
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">
          Enter your email to start using ActionPlan with your own documents.
          You&apos;ll get access immediately&mdash;no invitation code needed.
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">
          Already used ActionPlan? Enter the same email to pick up where you left off.
        </p>
      </header>

      {/* Suspense is required because the form uses useSearchParams() */}
      <Suspense fallback={null}>
        <EarlyAccessForm />
      </Suspense>
    </div>
  );
}
