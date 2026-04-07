import { ActionPlanForm } from "@/components/feature/action-plan-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            ActionPlan
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-500">
            Paste a confusing admissions letter, scholarship offer, lease, or
            school notice. Get clear next steps, deadlines, and questions to ask.
          </p>
          <div className="mt-8 border-t border-zinc-200" />
        </div>
        <ActionPlanForm />
      </main>
    </div>
  );
}
