import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6">

      {/* ── Hero ──────────────────────────────────────────────────────────────
          Wrapped in a positioned, isolated, overflow-hidden section so the
          ambient background layers (dot grid, radial bloom, drifting cards)
          can sit absolutely behind the text without leaking into adjacent
          sections. */}
      <section className="relative isolate -mx-6 overflow-hidden px-6 py-16 sm:py-24">

        {/* Atmospheric background — purely decorative, behind the text */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          {/* Faint dot grid, center-masked so it fades to nothing at edges */}
          <div className="lp-dot-grid absolute inset-0 opacity-70" />

          {/* Soft radial ambient light — broad, multi-stop gradient applied
              directly to a full-bleed div. No blur radius needed: the smooth
              gradient stops do the diffusion. Position is implicit (centered
              in the element via the gradient itself), so reduced-motion users
              see the same softly-centered ambient as everyone else. */}
          <div
            className="lp-glow absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 65% 55% at 50% 42%, " +
                "rgba(168, 175, 240, 0.22) 0%, " +
                "rgba(196, 200, 235, 0.14) 28%, " +
                "rgba(220, 220, 240, 0.07) 52%, " +
                "transparent 78%)",
            }}
          />

          {/* Two small drifting document-fragment cards — hidden on small
              screens to keep mobile calm. Each has a faint internal layout
              that suggests product surface (paragraph + checklist) without
              showing readable content. */}
          <div className="lp-drift-a absolute left-[8%] top-[18%] hidden h-32 w-44 overflow-hidden rounded-xl border border-zinc-200/60 bg-white/65 opacity-65 shadow-sm backdrop-blur-sm sm:block">
            {/* Paragraph-fragment surface */}
            <div className="flex h-full flex-col gap-1.5 p-3.5">
              <div className="h-1 w-3/5 rounded-full bg-zinc-300/70" />
              <div className="mt-1 h-0.5 w-full rounded-full bg-zinc-200/70" />
              <div className="h-0.5 w-11/12 rounded-full bg-zinc-200/70" />
              <div className="h-0.5 w-4/5 rounded-full bg-zinc-200/70" />
              <div className="h-0.5 w-3/4 rounded-full bg-zinc-200/70" />
              <div className="mt-auto h-0.5 w-1/2 rounded-full bg-zinc-200/60" />
            </div>
          </div>

          <div className="lp-drift-b absolute right-[7%] top-[56%] hidden h-28 w-40 overflow-hidden rounded-xl border border-zinc-200/60 bg-white/65 opacity-65 shadow-sm backdrop-blur-sm sm:block">
            {/* Checklist-fragment surface — three rows, middle one "checked" */}
            <div className="flex h-full flex-col gap-2 p-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 shrink-0 rounded-sm border border-zinc-300/80 bg-white/80" />
                <div className="h-0.5 flex-1 rounded-full bg-zinc-200/70" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 shrink-0 rounded-sm border border-zinc-400/80 bg-zinc-400/50" />
                <div className="h-0.5 flex-1 rounded-full bg-zinc-200/60" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 shrink-0 rounded-sm border border-zinc-300/80 bg-white/80" />
                <div className="h-0.5 flex-1 rounded-full bg-zinc-200/70" />
              </div>
              <div className="mt-auto flex justify-end">
                <div className="h-1.5 w-7 rounded-full bg-zinc-300/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Hero content — staggered fade-in */}
        <div className="mx-auto max-w-3xl text-center">
          <p
            className="lp-fade-in-up mb-5 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500 backdrop-blur-sm"
            style={{ animationDelay: "0ms" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Early access
          </p>
          <h1
            className="lp-fade-in-up font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-zinc-900 sm:text-[56px]"
            style={{ animationDelay: "120ms" }}
          >
            Turn confusing documents into clear next steps.
          </h1>
          <p
            className="lp-fade-in-up mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-zinc-600 sm:text-[17px]"
            style={{ animationDelay: "240ms" }}
          >
            Drop in a lease, scholarship letter, financial form, or any dense
            document. ActionPlan extracts deadlines, action items, risks, and
            drafts a response you can review.
          </p>
          <div
            className="lp-fade-in-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "360ms" }}
          >
            {/* Primary CTA — Get early access (the conversion action) */}
            <Link
              href="/early-access"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-zinc-700"
            >
              Get early access
              <span aria-hidden="true">→</span>
            </Link>
            {/* Secondary CTA — See the demo (try before signing up) */}
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white/90 px-5 py-2.5 text-[13.5px] font-semibold text-zinc-700 backdrop-blur-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              See the demo
            </Link>
          </div>
          <p
            className="lp-fade-in-up mt-6 text-[12px] text-zinc-400"
            style={{ animationDelay: "480ms" }}
          >
            Currently in early access. General availability coming soon.
          </p>
        </div>
      </section>

      {/* ── Feature blocks ────────────────────────────────────────────────────
          Soft translucent cards with a hairline trailing rule on the eyebrow.
          Hover deepens the border and adds a soft shadow — gives each block
          a "designed object" feel instead of a generic three-column text grid. */}
      <section className="mx-auto mt-12 grid max-w-4xl gap-5 sm:mt-20 sm:grid-cols-3 sm:gap-6">
        <Feature
          eyebrow="01"
          title="Extract what matters"
          body="Deadlines, action items, risks, and open questions — pulled from the document with sources you can verify."
          delay={600}
        />
        <Feature
          eyebrow="02"
          title="Plan the next step"
          body="A grounded, document-specific action plan, with each step expandable for context."
          delay={720}
        />
        <Feature
          eyebrow="03"
          title="Draft your response"
          body="Generate an email, letter, or talking points. Edit. Approve. Use."
          delay={840}
        />
      </section>

      {/* ── Audience strip ────────────────────────────────────────────────── */}
      <section
        className="lp-fade-in-up mx-auto mt-20 max-w-3xl rounded-2xl border border-zinc-200 bg-zinc-50/60 px-6 py-8 text-center sm:mt-28 sm:px-10"
        style={{ animationDelay: "960ms" }}
      >
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Built for
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-700">
          Students navigating scholarship letters and aid packages. Tenants
          facing lease renewals and addenda. Anyone receiving a document
          dense enough that they don&apos;t know where to start.
        </p>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section
        className="lp-fade-in-up mx-auto mt-20 max-w-2xl pb-20 text-center sm:mt-28"
        style={{ animationDelay: "1040ms" }}
      >
        <h2 className="font-display text-[28px] font-normal tracking-[-0.01em] text-zinc-900 sm:text-[34px]">
          Try it on a real document.
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">
          The demo is fixed and shareable. Get early access to try it on your own document.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/early-access"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            Get early access →
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
          >
            See the demo
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
  delay,
}: {
  eyebrow: string;
  title:   string;
  body:    string;
  delay:   number;
}) {
  return (
    <div
      className="lp-fade-in-up group relative rounded-xl border border-zinc-200/70 bg-white/70 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
          {eyebrow}
        </p>
        <span className="h-px flex-1 bg-zinc-200/80" />
      </div>
      <h3 className="mt-3 font-display text-[18px] font-normal tracking-tight text-zinc-900">
        {title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
        {body}
      </p>
    </div>
  );
}
