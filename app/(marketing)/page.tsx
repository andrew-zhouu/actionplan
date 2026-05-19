import Link from "next/link";
import { HeroAtmosphere } from "@/components/marketing/hero-atmosphere";
import { Reveal } from "@/components/marketing/reveal";
import { DocType } from "@/components/marketing/doc-type";
import { FeatureCard } from "@/components/marketing/feature-card";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative isolate -mx-6 overflow-hidden px-6 py-16 sm:py-24">
        <HeroAtmosphere />

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

      {/* ── Feature blocks ──────────────────────────────────────────────── */}
      <section className="mx-auto mt-12 grid max-w-4xl gap-5 sm:mt-20 sm:grid-cols-3 sm:gap-6">
        <Reveal delay={0}>   <FeatureCard eyebrow="01" title="Extract what matters"  body="Deadlines, action items, risks, and open questions — pulled from the document with sources you can verify." /></Reveal>
        <Reveal delay={100}> <FeatureCard eyebrow="02" title="Plan the next step"    body="A grounded, document-specific action plan, with each step expandable for context." /></Reveal>
        <Reveal delay={200}> <FeatureCard eyebrow="03" title="Draft your response"   body="Generate an email, letter, or talking points. Edit. Approve. Use." /></Reveal>
      </section>

      {/* ── Mission / ethos — the emotional center of the page.
            Single section-level Reveal: the whole block fades in as
            one unit when it enters the viewport, instead of staggering
            three sub-elements that read to the eye as "all at once."
            Shares its layout system with the proof section below:
            text-center, eyebrow + display headline + max-w-xl mx-auto
            body, identical supporting-text treatment (zinc-600,
            leading-relaxed, text-balance). */}
      <Reveal>
        <section className="mx-auto mt-20 max-w-3xl px-2 text-center sm:mt-28">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            What we believe
          </p>
          <h2 className="mt-5 text-balance font-display text-[34px] font-normal leading-[1.15] tracking-[-0.015em] text-zinc-900 sm:text-[46px]">
            &ldquo;Paperwork shouldn&rsquo;t be where opportunity gets lost.&rdquo;
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-balance text-[15px] leading-relaxed text-zinc-600 sm:text-[16px]">
            Navigating important systems shouldn&rsquo;t require insider knowledge.
            ActionPlan makes complex documents clearer and more actionable
            without replacing the judgment of the person reading them.
          </p>
        </section>
      </Reveal>

      {/* Subtle separator between mission and proof — short centered
          hairline. Restrained, not decorative. Adds a beat of
          separation without breaking the conceptual link between the
          two sections. Spacing is split (mt-10/14 above, mt-10/14
          below) so the total mission→proof gap stays close to the
          original mt-20/28 — the line takes the beat, not adds to it. */}
      <div
        aria-hidden="true"
        className="mx-auto mt-10 h-px w-20 bg-zinc-200 sm:mt-14"
      />

      {/* ── Proof at scale — shares the mission's layout system:
            text-center, eyebrow + display statement + supporting
            framing line in identical typography. Figures sit directly
            on the page, no card or bordered surface — the section
            statement above carries the visual anchor, the numbers
            anchor themselves through size, tracking, and breath.
            Single section-level Reveal so the section enters view as
            one unit. */}
      <Reveal>
        <section className="mx-auto mt-10 max-w-2xl px-2 text-center sm:mt-14">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            At scale
          </p>
          <h2 className="mx-auto mt-5 max-w-2xl text-balance font-display text-[24px] font-normal leading-[1.25] tracking-[-0.01em] text-zinc-900 sm:text-[30px]">
            Administrative friction is one of the largest hidden costs in modern systems.
          </h2>

          {/* Figures — wrapped in an explicit max-w-xl inner frame
              (~96px narrower than the section), centered, with smaller
              gap and figure sizes that physically fit the tighter
              frame. The grid no longer spreads across the section
              width — the stats sit as a compact centered group. */}
          <div className="mx-auto mt-14 max-w-xl sm:mt-16">
            <div className="grid gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10">
              <div>
                <div className="font-display text-[40px] font-normal leading-[1] tracking-[-0.02em] text-zinc-900 sm:text-[48px] md:text-[52px]">
                  $600B&ndash;$1T
                </div>
                <div className="mx-auto mt-4 max-w-[15rem] text-balance text-[14px] font-semibold leading-relaxed text-zinc-800 sm:text-[14.5px]">
                  annual U.S. healthcare administrative cost
                </div>
              </div>
              <div>
                <div className="font-display text-[40px] font-normal leading-[1] tracking-[-0.02em] text-zinc-900 sm:text-[48px] md:text-[52px]">
                  15&ndash;25%
                </div>
                <div className="mx-auto mt-4 max-w-[15rem] text-balance text-[14px] font-semibold leading-relaxed text-zinc-800 sm:text-[14.5px]">
                  of total U.S. healthcare spending
                </div>
              </div>
            </div>
          </div>

          <p className="mx-auto mt-14 max-w-xl text-balance text-[15px] font-medium leading-relaxed text-zinc-700 sm:mt-16 sm:text-[16px]">
            Healthcare is the most clearly quantified example.
            <br />
            The same pattern repeats wherever dense paperwork stands between
            people and outcomes, from housing and finance to immigration and
            benefits.
          </p>
        </section>
      </Reveal>

      {/* ── Document types — cursor-spotlight tiles ─────────────────────── */}
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

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
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

/**
 * Primary filled-black CTA. Final polish:
 *   - explicit transition properties (avoid `transition-all` cost)
 *   - cubic-bezier matching the reveal animations for visual cohesion
 *   - inset top highlight slightly stronger for more dimensional presence
 *   - active:scale-[0.99] for a real tactile press
 *   - focus-visible ring for keyboard accessibility + visual finish
 *   - arrow translates right on hover for the "pulling" feel
 */
function PrimaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group/btn inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.10),0_4px_12px_-4px_rgba(0,0,0,0.20)] transition-[transform,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-zinc-800 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(0,0,0,0.12),0_8px_24px_-6px_rgba(0,0,0,0.25)] active:translate-y-0 active:scale-[0.99] active:bg-zinc-900 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_1px_2px_rgba(0,0,0,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/40 focus-visible:ring-offset-2"
    >
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0.5"
      >→</span>
    </Link>
  );
}

function SecondaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group/btn inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white/90 px-5 py-2.5 text-[13.5px] font-semibold text-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-[transform,box-shadow,border-color,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-zinc-400 hover:bg-white hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] active:translate-y-0 active:scale-[0.99] active:shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}

