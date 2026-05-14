import Link from "next/link";

/**
 * Compact "Next step" module rendered inside the document workspace panel,
 * between the summary header and the tab bar. Three modes:
 *
 *   "none"     ⇢ document has zero tasks; the slot is null and the parent
 *                skips its section wrapper entirely.
 *   "all-done" ⇢ everything for this doc is complete; show a slim emerald
 *                acknowledgement line.
 *   "task"     ⇢ surface the chosen top-priority task with a primary CTA.
 *
 * The card has no outer margin — positioning (padding + section divider)
 * is handled by the PlanPanel section wrapper.
 */
export type StartHereProps =
  | { mode: "none" }
  | { mode: "all-done"; documentId: string }
  | {
      mode:       "task";
      documentId: string;
      kind:       "action_item" | "deadline";
      taskIndex:  number;
      taskLabel:  string;
      support?:   string;                       // optional urgency/date line
      tone:       "red" | "amber" | "neutral";  // signal on border + support text
    };

const TONE_BORDER: Record<"red" | "amber" | "neutral", string> = {
  red:     "border-red-200",
  amber:   "border-amber-200",
  neutral: "border-zinc-200",
};

const TONE_SUPPORT: Record<"red" | "amber" | "neutral", string> = {
  red:     "text-red-600",
  amber:   "text-amber-700",
  neutral: "text-zinc-500",
};

export function StartHereCard(props: StartHereProps) {
  if (props.mode === "none") return null;

  if (props.mode === "all-done") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-[12.5px] font-medium text-emerald-800">
            All tasks complete for this document.
          </p>
        </div>
        <Link
          href="/tasks"
          className="text-[11.5px] font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
        >
          View tasks →
        </Link>
      </div>
    );
  }

  // mode === "task" — compact module styled to fit inside the panel header area.
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-white px-4 py-3 ${TONE_BORDER[props.tone]}`}>
      <div className="min-w-0 flex-1">
        {/* Constant label — the module's identity */}
        <p className="mb-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Next step
        </p>

        {/* Task label — semibold but softened (zinc-800 not zinc-900) so it
            reads as a clear hierarchy step rather than heavy bold.
            line-clamp-2 caps pathologically long titles at two lines. */}
        <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-zinc-800">
          {props.taskLabel}
        </p>

        {/* Optional support — urgency context, color-toned */}
        {props.support && (
          <p className={`mt-0.5 font-mono text-[11px] ${TONE_SUPPORT[props.tone]}`}>
            {props.support}
          </p>
        )}
      </div>

      {/* Compact primary CTA */}
      <Link
        href={`/tasks/${props.documentId}/${props.kind}/${props.taskIndex}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-700"
      >
        Open task
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
