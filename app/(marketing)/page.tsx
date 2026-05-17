import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">

      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Early access
        </p>
        <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-zinc-900 sm:text-[56px]">
          Turn confusing documents into clear next steps.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-zinc-600 sm:text-[17px]">
          Drop in a lease, scholarship letter, financial form, or any dense
          document. ActionPlan extracts deadlines, action items, risks, and
          drafts a response you can review.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            See the demo
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
          >
            Open the app
          </Link>
        </div>
        <p className="mt-6 text-[12px] text-zinc-400">
          Currently in early access. General availability coming soon.
        </p>
      </section>

      {/* What it does — three plain blocks, no graphics */}
      <section className="mx-auto mt-20 grid max-w-4xl gap-8 sm:mt-28 sm:grid-cols-3">
        <Feature
          eyebrow="01"
          title="Extract what matters"
          body="Deadlines, action items, risks, and open questions — pulled from the document with sources you can verify."
        />
        <Feature
          eyebrow="02"
          title="Plan the next step"
          body="A grounded, document-specific action plan, with each step expandable for context."
        />
        <Feature
          eyebrow="03"
          title="Draft your response"
          body="Generate an email, letter, or talking points. Edit. Approve. Use."
        />
      </section>

      {/* Audience strip */}
      <section className="mx-auto mt-20 max-w-3xl rounded-2xl border border-zinc-200 bg-zinc-50/60 px-6 py-8 text-center sm:mt-28 sm:px-10">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Built for
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-700">
          Students navigating scholarship letters and aid packages. Tenants
          facing lease renewals and addenda. Anyone receiving a document
          dense enough that they don't know where to start.
        </p>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mt-20 max-w-2xl text-center sm:mt-28">
        <h2 className="font-display text-[28px] font-normal tracking-[-0.01em] text-zinc-900 sm:text-[34px]">
          Try it on a real document.
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">
          The demo is fixed and shareable. The app is open while we're in early access.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            See the demo →
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
          >
            Open the app
          </Link>
        </div>
      </section>
    </div>
  );
}

function Feature({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title:   string;
  body:    string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {eyebrow}
      </p>
      <h3 className="mt-2 font-display text-[18px] font-normal tracking-tight text-zinc-900">
        {title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
        {body}
      </p>
    </div>
  );
}
