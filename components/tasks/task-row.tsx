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
  label:       string;
  meta?:       string;   // formatted date for deadlines
  sourceLabel: string;
  sourceHref:  string;
};

export function TaskRow({
  documentId,
  kind,
  taskIndex,
  done: initialDone,
  disabled = false,
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

  return (
    <div
      className={`flex items-start gap-3 border-b border-zinc-100 px-6 py-3.5 last:border-b-0 transition-opacity ${
        isPending ? "opacity-60" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className={`mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          disabled
            ? "cursor-not-allowed border-zinc-200 bg-zinc-50"
            : done
            ? "border-zinc-700 bg-zinc-800"
            : "border-zinc-300 hover:border-zinc-400"
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
        <p
          className={`text-sm leading-relaxed ${
            done ? "text-zinc-400 line-through" : "text-zinc-700"
          }`}
        >
          {label}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {meta && (
            <>
              <span className="font-mono text-[10.5px] text-zinc-400">{meta}</span>
              <span className="select-none text-zinc-300">·</span>
            </>
          )}
          <Link
            href={sourceHref}
            className="text-[11px] text-zinc-400 transition-colors hover:text-zinc-600"
          >
            {sourceLabel} ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
