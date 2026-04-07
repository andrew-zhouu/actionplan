import { ActionPlanForm } from "@/components/feature/action-plan-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="mb-8">
          <p className="mb-3 text-base font-semibold uppercase tracking-wide text-zinc-500">
            ActionPlan
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Stop decoding documents. Start acting on them.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">
            ActionPlan turns confusing admin documents into clear next steps,
            deadlines, risks, and questions to ask.
          </p>
          <div className="mt-6 border-t border-zinc-200" />
        </div>
        <ActionPlanForm />
      </main>
    </div>
  );
}
