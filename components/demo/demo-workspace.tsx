import Link from "next/link";
import type { AnalysisResult } from "@/types/analysis";
import type { PlanStep } from "@/app/actions/task-plans";
import type { SampleDraft } from "@/lib/demo/sample-analysis";
import { COMPLEXITY_COLORS } from "@/lib/constants";
import { parseDate, formatDeadlineDate } from "@/lib/utils/dates";

/**
 * Read-only renderer for the /demo page. Mirrors the real workspace flow —
 * source on the left, action-oriented workflow on the right (summary → next
 * step → action plan → draft → document context). Each section is a static
 * visual twin of its real-app counterpart: same border/padding/typography/
 * tone palette, no client state, no server actions, no DB.
 */

// ─── tone helpers (mirror app/app/docs/[id]/page.tsx) ─────────────────────────

type Tone = "red" | "amber" | "neutral";

const TONE_BORDER:  Record<Tone, string> = {
  red:     "border-red-200",
  amber:   "border-amber-200",
  neutral: "border-zinc-200",
};

const TONE_SUPPORT: Record<Tone, string> = {
  red:     "text-red-600",
  amber:   "text-amber-700",
  neutral: "text-zinc-500",
};

function deriveSupport(rawDate: string | undefined): { support: string | undefined; tone: Tone } {
  if (!rawDate) return { support: undefined, tone: "neutral" };
  const parsed = parseDate(rawDate);
  if (!parsed) return { support: rawDate, tone: "neutral" };

  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const target   = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    const days = -diffDays;
    return { support: `Overdue ${days} day${days === 1 ? "" : "s"} ago`, tone: "red" };
  }
  if (diffDays === 0) return { support: "Due today", tone: "amber" };
  if (diffDays <= 7)  return { support: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`, tone: "amber" };
  return { support: `Due ${formatDeadlineDate(parsed)}`, tone: "neutral" };
}

// ─── main component ──────────────────────────────────────────────────────────

type Props = {
  text:              string;
  result:            AnalysisResult;
  topDeadlineIndex:  number;
  planSteps:         PlanStep[];
  expandedStepIndex: number;
  draft:             SampleDraft;
};

export function DemoWorkspace({
  text,
  result,
  topDeadlineIndex,
  planSteps,
  expandedStepIndex,
  draft,
}: Props) {
  const topDeadline = result.deadlines[topDeadlineIndex];
  const { support, tone } = deriveSupport(topDeadline?.date);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">

      {/* Demo banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Sample
          </span>
          <span aria-hidden="true" className="select-none text-zinc-300">·</span>
          <p className="text-[12.5px] text-zinc-600">
            A fixed example showing the full workflow on a single document.
          </p>
        </div>
        <Link
          href="/early-access?next=/app/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Try with your document
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Two-column workspace — source left, action-oriented right */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">

        <SourcePane text={text} />

        <div className="space-y-5">
          <SummaryCard result={result} />
          {topDeadline && (
            <NextStepCard
              description={topDeadline.description}
              support={support}
              tone={tone}
            />
          )}
          <PlanSection steps={planSteps} expandedIndex={expandedStepIndex} />
          <DraftSection draft={draft} />
          <DocumentContext
            result={result}
            topDeadlineIndex={topDeadlineIndex}
          />
        </div>
      </div>
    </div>
  );
}

// ─── sections ────────────────────────────────────────────────────────────────

function SourcePane({ text }: { text: string }) {
  // Layout notes:
  // - `flex flex-col` + `flex-1` scroll area: inner content fills whatever
  //   height the pane occupies, so the bordered container never has a dead
  //   white area below short content when the grid row stretches.
  // - Mobile cap: `max-h-[640px]` keeps the pane reasonable on small screens.
  // - Desktop: `lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]` pins the
  //   source to the viewport as the workflow column scrolls — matching how
  //   a real two-pane workspace behaves — and caps height so internal scroll
  //   kicks in for long sources.
  return (
    <div className="flex max-h-[640px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
      <div className="shrink-0 border-b border-zinc-100 px-5 py-3">
        <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Source document
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-zinc-700">
          {text}
        </pre>
      </div>
    </div>
  );
}

function SummaryCard({ result }: { result: AnalysisResult }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-3.5">
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              COMPLEXITY_COLORS[result.complexityLevel] ?? "bg-zinc-100 text-zinc-500"
            }`}
          >
            {result.complexityLevel}
          </span>
          <span className="text-[12px] text-zinc-600">{result.documentType}</span>
          <span aria-hidden="true" className="select-none font-mono text-[10.5px] text-zinc-300">·</span>
          <span className="font-mono text-[10.5px] text-zinc-400">
            grade {result.readabilityScore}
          </span>
        </div>
        <p className="text-[13.5px] leading-relaxed text-zinc-700">
          {result.summary}
        </p>
      </div>
    </div>
  );
}

function NextStepCard({
  description,
  support,
  tone,
}: {
  description: string;
  support:     string | undefined;
  tone:        Tone;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white px-5 py-3.5 ${TONE_BORDER[tone]}`}>
      <div className="min-w-0 flex-1">
        <p className="mb-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Next step
        </p>
        <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-zinc-800">
          {description}
        </p>
        {support && (
          <p className={`mt-0.5 font-mono text-[11px] ${TONE_SUPPORT[tone]}`}>
            {support}
          </p>
        )}
      </div>
      {/* CTA — native anchor jump to the Action plan section below.
          Keeps the demo self-contained instead of kicking the visitor
          out to /app/new. Label changed to match the actual behavior. */}
      <a
        href="#action-plan-section"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-700"
      >
        See the plan
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

function PlanSection({
  steps,
  expandedIndex,
}: {
  steps:         PlanStep[];
  expandedIndex: number;
}) {
  return (
    <div
      id="action-plan-section"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white scroll-mt-6"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-700">Action plan</h2>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {steps.length} steps · AI-generated
          </p>
        </div>
      </div>
      <div className="px-5 py-5">
        <ol className="space-y-1">
          {steps.map((step, i) => {
            const isExpanded = i === expandedIndex;
            const canExpand  = step.detail.length > 0 || step.needsDraft;

            return (
              <li key={i} className="overflow-hidden rounded-md">
                <div className={`flex w-full items-start gap-3 px-2.5 py-2 ${
                  isExpanded ? "" : ""
                }`}>
                  <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-mono text-[10px] font-bold text-zinc-500">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[13px] font-medium leading-snug text-zinc-700">
                        {step.title}
                      </p>
                      {step.needsDraft && (
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                          Draft helpful
                        </span>
                      )}
                    </div>
                  </div>
                  {canExpand && (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={`mt-1.5 shrink-0 text-zinc-400 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </div>

                {isExpanded && (
                  <div className="pb-3 pl-[42px] pr-2.5 pt-1">
                    {step.detail && (
                      <p className="text-[12.5px] leading-relaxed text-zinc-600">
                        {step.detail}
                      </p>
                    )}
                    {step.needsDraft && (
                      <a
                        href="#draft-section"
                        className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                      >
                        Generate draft for this step
                        <span aria-hidden="true" className="text-zinc-400">→</span>
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function DraftSection({ draft }: { draft: SampleDraft }) {
  const typeLabel =
    draft.draftType === "email"  ? "Email"  :
    draft.draftType === "letter" ? "Letter" :
                                   "Note";

  return (
    <div
      id="draft-section"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white scroll-mt-6"
    >
      {/* Header — title + saved-state pill */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[13px] font-semibold text-zinc-700">Draft</h2>
          {draft.approved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 6 5 9 10 3" />
              </svg>
              Saved · Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[10.5px] font-medium text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              Saved · Pending review
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        <div className="space-y-4">
          {/* Artifact card */}
          <article className={`overflow-hidden rounded-lg border ${
            draft.approved
              ? "border-emerald-200 bg-emerald-50/30"
              : "border-zinc-200 bg-zinc-50"
          }`}>
            {/* Type label */}
            <div className="border-b border-zinc-200/70 px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                {typeLabel}
              </span>
            </div>

            {/* Subject (email only) */}
            {draft.subject && (
              <div className="border-b border-zinc-200/70 px-4 py-2.5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-zinc-400">
                  Subject
                </p>
                <p className="mt-0.5 text-[13.5px] font-semibold text-zinc-800">
                  {draft.subject}
                </p>
              </div>
            )}

            {/* Body */}
            <div className="px-4 py-3.5">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-700">
                {draft.body}
              </p>
            </div>
          </article>

          {/* Action / status bar — mirrors the live TaskDraftSection
              approved-state toolbar: Edit, Discard, Return to review.
              Regenerate is intentionally omitted from the demo.
              All three buttons are `disabled` with a tooltip explaining
              they're preview-only; the live app wires them to real actions. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[360px] text-[11.5px] leading-snug text-zinc-500">
              {draft.approved
                ? "Approved — ready to use."
                : "Review carefully — edit if needed, then approve when the draft is correct."}
            </p>
            <div className="flex flex-wrap items-center gap-2 gap-y-1.5">
              {/* Edit — neutral outlined, demo-disabled */}
              <button
                type="button"
                disabled
                title="Available with your own document — try the live app"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
                Edit
              </button>

              {/* Discard — destructive outlined, demo-disabled */}
              <button
                type="button"
                disabled
                title="Available with your own document — try the live app"
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-[11.5px] font-semibold text-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Discard
              </button>

              {/* Return to review — neutral outlined + undo arrow, demo-disabled */}
              <button
                type="button"
                disabled
                title="Available with your own document — try the live app"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
                </svg>
                Return to review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentContext({
  result,
  topDeadlineIndex,
}: {
  result:           AnalysisResult;
  topDeadlineIndex: number;
}) {
  const otherDeadlines = result.deadlines
    .map((d, i) => ({ ...d, index: i }))
    .filter((d) => d.index !== topDeadlineIndex);

  const stats: { label: string; count: number }[] = [
    { label: "other deadline",                          count: otherDeadlines.length },
    { label: "action item",                             count: result.actionItems.length },
    { label: "risk",                                    count: result.risks.length },
    { label: "open question",                           count: result.questionsToAsk.length },
  ].filter((s) => s.count > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-3">
        <h2 className="text-[13px] font-semibold text-zinc-700">Also in this document</h2>
        <p className="mt-0.5 text-[11px] text-zinc-400">
          Other items extracted from the same source — accessible from the document workspace.
        </p>
      </div>

      {/* Counts strip */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-zinc-100 px-5 py-3">
        {stats.map((s, i) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="select-none text-zinc-200">·</span>}
            <span className="font-mono text-[11px] font-semibold tabular-nums text-zinc-700">
              {s.count}
            </span>
            <span className="text-[11px] text-zinc-500">
              {s.label}{s.count === 1 ? "" : "s"}
            </span>
          </span>
        ))}
      </div>

      {/* Preview rows — one example each from risks and questions */}
      <ul className="divide-y divide-zinc-100">
        {result.risks.slice(0, 1).map((risk, i) => (
          <PreviewRow
            key={`risk-${i}`}
            kindLabel="Risk"
            dot="bg-amber-400"
            text={risk}
          />
        ))}
        {result.questionsToAsk.slice(1, 2).map((q, i) => (
          /* skip questions[0] — already covered by the draft above */
          <PreviewRow
            key={`question-${i}`}
            kindLabel="Question"
            dot="bg-zinc-400"
            text={q}
          />
        ))}
        {otherDeadlines.slice(0, 1).map((d) => (
          <PreviewRow
            key={`deadline-${d.index}`}
            kindLabel="Deadline"
            dot="bg-amber-500"
            text={d.description}
            meta={d.date}
          />
        ))}
      </ul>
    </div>
  );
}

function PreviewRow({
  kindLabel,
  dot,
  text,
  meta,
}: {
  kindLabel: string;
  dot:       string;
  text:      string;
  meta?:     string;
}) {
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] leading-snug text-zinc-700">{text}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
            {kindLabel}
          </span>
          {meta && (
            <>
              <span aria-hidden="true" className="select-none text-zinc-200">·</span>
              <span className="font-mono text-[10.5px] text-zinc-500">{meta}</span>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

