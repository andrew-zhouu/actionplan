"use client";

import { useState, useTransition } from "react";
import {
  generateTaskDraft,
  approveTaskDraft,
  type DraftType,
  type DraftContext,
  type TaskDraft,
} from "@/app/actions/task-drafts";

type Props = {
  documentId:   string;
  kind:         "action_item" | "deadline";
  taskIndex:    number;
  initialDraft: TaskDraft | null;
  draftContext: DraftContext;
};

const TYPE_LABELS: Record<DraftType, string> = {
  email:  "Email",
  letter: "Letter",
  note:   "Note",
};

const TYPE_HELP: Record<DraftType, string> = {
  email:  "Email to a counterparty",
  letter: "Formal written letter",
  note:   "Talking points for a call or meeting",
};

function formatApprovedTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day:   "numeric",
      year:  "numeric",
    });
  } catch {
    return "earlier";
  }
}

export function TaskDraftSection({
  documentId,
  kind,
  taskIndex,
  initialDraft,
  draftContext,
}: Props) {
  const [draft, setDraft]           = useState<TaskDraft | null>(initialDraft);
  const [pickerType, setPickerType] = useState<DraftType>(initialDraft?.draftType ?? "email");
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startGenerating]  = useTransition();
  const [isApproving, startApproving] = useTransition();

  function handleGenerate() {
    setError(null);
    startGenerating(async () => {
      try {
        const result = await generateTaskDraft(documentId, kind, taskIndex, pickerType, draftContext);
        setDraft(result.draft);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate draft");
      }
    });
  }

  function handleApprove() {
    if (!draft || draft.approved) return;
    setError(null);
    startApproving(async () => {
      try {
        const { approvedAt } = await approveTaskDraft(documentId, kind, taskIndex);
        setDraft({ ...draft, approved: true, approvedAt });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve draft");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-700">Draft</h2>
          {draft && !isPending && (
            <p className="mt-0.5 text-[11px] text-zinc-400">
              {TYPE_LABELS[draft.draftType]} · AI-generated, human-approved
            </p>
          )}
        </div>
        {draft && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending || isApproving}
            className="text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-700 disabled:opacity-40"
          >
            {isPending ? "Generating…" : "Regenerate"}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-5">

        {/* ── Empty state — compact: explainer + picker + CTA on one row when wide */}
        {!draft && !isPending && (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Generate a draft you can review and use to act on this task.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(["email", "letter", "note"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPickerType(t)}
                  title={TYPE_HELP[t]}
                  className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
                    pickerType === t
                      ? "bg-zinc-800 text-white"
                      : "border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
              <button
                type="button"
                onClick={handleGenerate}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-700"
              >
                Generate draft →
              </button>
            </div>
          </div>
        )}

        {/* ── Loading */}
        {isPending && (
          <div className="flex items-center gap-2.5 py-1">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin text-zinc-400"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p className="text-[13px] text-zinc-400">Generating draft…</p>
          </div>
        )}

        {/* ── Draft artifact + approval footer */}
        {draft && !isPending && (
          <div className="space-y-4">

            {/* Artifact card — distinct surface so it reads as a contained document
                rather than just another list block like the action plan */}
            <article
              className={`overflow-hidden rounded-lg border transition-colors ${
                draft.approved
                  ? "border-emerald-200 bg-emerald-50/30"
                  : "border-zinc-200 bg-zinc-50"
              }`}
            >
              {/* Artifact header — type label + status pill */}
              <div className="flex items-center justify-between border-b border-zinc-200/70 px-4 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                  {TYPE_LABELS[draft.draftType]}
                </span>
                {draft.approved ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Pending your review
                  </span>
                )}
              </div>

              {/* Subject (emails only) */}
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

              {/* Body — whitespace-pre-wrap preserves paragraph breaks */}
              <div className="px-4 py-3.5">
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-700">
                  {draft.body}
                </p>
              </div>
            </article>

            {/* Footer — explicit approve action when pending; status line when approved */}
            {!draft.approved ? (
              <div className="flex items-start justify-between gap-3">
                <p className="max-w-[360px] text-[11.5px] leading-snug text-zinc-500">
                  Review carefully before approving. Approval is your confirmation that the draft is correct and ready to use.
                </p>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isApproving ? (
                    "Approving…"
                  ) : (
                    <>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                      Approve draft
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-[11.5px] text-emerald-700">
                Approved{draft.approvedAt ? ` on ${formatApprovedTimestamp(draft.approvedAt)}` : ""}.
                You can regenerate at any time if you need a different version.
              </p>
            )}

          </div>
        )}

        {/* Error */}
        {error && !isPending && (
          <p className="mt-3 text-[12px] text-red-500">{error}</p>
        )}

      </div>
    </div>
  );
}
