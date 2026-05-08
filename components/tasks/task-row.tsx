"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleTaskCompletion } from "@/app/actions/tasks";

type Props = {
  documentId:  string;
  kind:        "action_item" | "deadline";
  taskIndex:   number;
  done:        boolean;
  disabled?:   boolean;
  overdue?:    boolean;
  label:       string;
  meta?:       string;   // original date string for deadlines
  sourceLabel: string;
  sourceHref:  string;
};

export function TaskRow({
  documentId,
  kind,
  taskIndex,
  done: initialDone,
  disabled = false,
  overdue = false,
  label,
  meta,
  sourceLabel,
  sourceHref,
}: Props) {
  const [done, setDone] = useState(initialDone);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (disabled) return;
    const wasD = done;
    setDone(!wasD);
    startTransition(async () => {
      await toggleTaskCompletion(documentId, kind, taskIndex, wasD);
    });
  }

  const workspaceHref = `/tasks/${documentId}/${kind}/${taskIndex}`;

  return (
    <div
      className={`group relative flex items-start gap-3 border-b border-zinc-100 px-6 py-4 last:border-b-0 transition-colors hover:bg-zinc-50 ${
        isPending ? "opacity-60" : ""
      }`}
    >
      {/* Overdue left accent — gives urgency a row-level signal */}
      {overdue && !done && (
        <span className="absolute inset-y-0 left-0 w-[3px] rounded-r bg-red-400" />
      )}

      {/* Corner bracket affordance — appears on hover/focus to make the row
          feel like a pressable work object. Four spans, each showing only the
          two border sides that form that corner. */}
      <span className="pointer-events-none absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-tl-sm border-l border-t border-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
      <span className="pointer-events-none absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-tr-sm border-r border-t border-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-2.5 w-2.5 rounded-bl-sm border-b border-l border-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-br-sm border-b border-r border-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />

      {/* Checkbox */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          disabled
            ? "cursor-not-allowed border-zinc-200 bg-zinc-50"
            : done
            ? "border-zinc-700 bg-zinc-800"
            : "border-zinc-300 hover:border-zinc-500"
        }`}
      >
        {done && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none" className="shrink-0">
            <polyline
              points="1 3.5 3.5 6 8 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Label — block link so the whole text area is the click target */}
        <Link
          href={workspaceHref}
          className={`block text-[13.5px] font-medium leading-snug transition-colors ${
            done
              ? "text-zinc-400 line-through decoration-zinc-300"
              : "text-zinc-800 group-hover:text-zinc-900"
          }`}
        >
          {label}
        </Link>

        {/* Meta row: kind badge + date + source */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* Kind badge */}
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              kind === "deadline"
                ? overdue && !done
                  ? "bg-red-50 text-red-600"
                  : "bg-amber-50 text-amber-700"
                : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {kind === "deadline" ? "Deadline" : "Action"}
          </span>

          {/* Date (deadlines only) */}
          {meta && (
            <>
              <span className="select-none text-zinc-200">·</span>
              <span
                className={`font-mono text-[10.5px] ${
                  overdue && !done
                    ? "font-semibold text-red-500"
                    : "text-zinc-400"
                }`}
              >
                {meta}
              </span>
            </>
          )}

          {/* Source document link */}
          <span className="select-none text-zinc-200">·</span>
          <Link
            href={sourceHref}
            className="text-[11px] text-zinc-400 transition-colors hover:text-zinc-600"
          >
            {sourceLabel} ↗
          </Link>
        </div>
      </div>

      {/* Workspace affordance chevron — communicates that the row opens a workspace */}
      <div className="flex shrink-0 items-center self-center pl-1">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-200 transition-colors group-hover:text-zinc-500"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}
