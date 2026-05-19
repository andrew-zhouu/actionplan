import Link from "next/link";
import { HeroAtmosphere } from "@/components/marketing/hero-atmosphere";
import { Reveal } from "@/components/marketing/reveal";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative isolate -mx-6 overflow-hidden px-6 py-16 sm:py-24">

        {/* Client atmosphere — cursor parallax across dot grid, bloom,
            glass plane, and floating cards. Bails on touch / reduced-motion. */}
        <HeroAtmosphere />

        {/* Hero content — mount-time staggered fade-in (user is here at load,
            so we want this to animate immediately, not on scroll). */}
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
            <PrimaryCTA href="/early-access">Get early access</PrimaryCTA>
            <SecondaryCTA href="/demo">See the demo</SecondaryCTA>
          </div>
          <p
            className="lp-fade-in-up mt-6 text-[12px] text-zinc-400"
            style={{ animationDelay: "480ms" }}
          >
            Currently in early access. General availability coming soon.
          </p>
        </div>
      </section>

      {/* ── Feature blocks — scroll-triggered cascade (0 / 100 / 200 ms) ─── */}
      <section className="mx-auto mt-12 grid max-w-4xl gap-5 sm:mt-20 sm:grid-cols-3 sm:gap-6">
        <Reveal delay={0}>   <Feature eyebrow="01" title="Extract what matters"  body="Deadlines, action items, risks, and open questions — pulled from the document with sources you can verify." /></Reveal>
        <Reveal delay={100}> <Feature eyebrow="02" title="Plan the next step"    body="A grounded, document-specific action plan, with each step expandable for context." /></Reveal>
        <Reveal delay={200}> <Feature eyebrow="03" title="Draft your response"   body="Generate an email, letter, or talking points. Edit. Approve. Use." /></Reveal>
      </section>

      {/* ── Document types — heading reveals first, then tiles cascade ───── */}
      <section className="mx-auto mt-20 max-w-4xl sm:mt-28">
        <Reveal delay={0}>
          <div className="mb-8 text-center">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Document types
            </p>
            <h2 className="mt-3 font-display text-[26px] font-normal tracking-[-0.01em] text-zinc-900 sm:text-[30px]">
              Built for the documents that get you stuck.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          <Reveal delay={80}>
            <DocType
              label="Scholarship & financial aid letters"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              }
            />
          </Reveal>
          <Reveal delay={140}>
            <DocType
              label="Leases & rental agreements"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9.5 12 3l9 6.5V21H3z" />
                  <path d="M9 21v-7h6v7" />
                </svg>
              }
            />
          </Reveal>
          <Reveal delay={200}>
            <DocType
              label="Healthcare & insurance notices"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 6.5-7 11-7 11z" />
                </svg>
              }
            />
          </Reveal>
          <Reveal delay={260}>
            <DocType
              label="Tax, loan & tuition statements"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="12" x2="12" y2="18" />
                  <path d="M9 14h6M9 17h4" />
                </svg>
              }
            />
          </Reveal>
          <Reveal delay={320}>
            <DocType
              label="Employment & onboarding packets"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              }
            />
          </Reveal>
          <Reveal delay={380}>
            <DocType
              label="Legal & policy notices"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v3M5 6h14M7 6l-2 7h6M17 6l2 7h-6M3 13c.5 2 2 3 4 3M21 13c-.5 2-2 3-4 3M9 21h6M12 16v5" />
                </svg>
              }
            />
          </Reveal>
        </div>
      </section>

      {/* ── Audience — single reveal on scroll ──────────────────────────── */}
      <Reveal>
        <section className="mx-auto mt-20 max-w-3xl rounded-2xl border border-zinc-200 bg-zinc-50/60 px-6 py-8 sm:mt-28 sm:px-10">
          <p className="text-center font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Built for
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 sm:gap-10">
            <div>
              <p className="font-display text-[16px] font-normal tracking-tight text-zinc-900">
                Individuals
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-600">
                Students, tenants, patients, and applicants navigating a dense
                document on their own — admissions letters, lease addenda,
                medical notices, insurance forms.
              </p>
            </div>
            <div>
              <p className="font-display text-[16px] font-normal tracking-tight text-zinc-900">
                Teams &amp; organizations
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-600">
                Financial aid offices, advising programs, social services, and
                pilot partners handling these documents at scale — with shared
                context and trial-friendly access codes.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Final CTA — single reveal on scroll ─────────────────────────── */}
      <Reveal>
        <section className="mx-auto mt-20 max-w-2xl pb-20 text-center sm:mt-28">
          <h2 className="font-display text-[28px] font-normal tracking-[-0.01em] text-zinc-900 sm:text-[34px]">
            Try it on a real document.
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">
            The demo is fixed and shareable. Get early access to try it on your own document.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <PrimaryCTA href="/early-access">Get early access</PrimaryCTA>
            <SecondaryCTA href="/demo">See the demo</SecondaryCTA>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

// ─── Reusable building blocks ────────────────────────────────────────────

function PrimaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group/btn inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.10),0_4px_12px_-4px_rgba(0,0,0,0.20)] transition-all duration-200 ease-out hover:-translate-y-px hover:bg-zinc-800 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.12),0_8px_24px_-6px_rgba(0,0,0,0.25)] active:translate-y-0 active:bg-zinc-900 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_1px_2px_rgba(0,0,0,0.10)]"
    >
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5"
      >→</span>
    </Link>
  );
}

function SecondaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group/btn inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white/90 px-5 py-2.5 text-[13.5px] font-semibold text-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-px hover:border-zinc-400 hover:bg-white hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] active:translate-y-0 active:shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      {children}
    </Link>
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
    <div className="group relative h-full rounded-xl border border-zinc-200/70 bg-white/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.03),0_4px_12px_-4px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-zinc-300/90 hover:bg-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(0,0,0,0.06),0_24px_48px_-12px_rgba(0,0,0,0.12)] sm:p-6">
      <div className="flex items-center gap-2.5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
          {eyebrow}
        </p>
        <span className="h-px flex-1 bg-zinc-200/80 transition-colors duration-300 group-hover:bg-zinc-300" />
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

function DocType({
  icon,
  label,
}: {
  icon:  React.ReactNode;
  label: string;
}) {
  return (
    <div className="group flex h-full items-center gap-3 rounded-lg border border-zinc-200/70 bg-white/70 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
        {icon}
      </div>
      <span className="text-[13px] font-medium leading-snug text-zinc-800">
        {label}
      </span>
    </div>
  );
}
