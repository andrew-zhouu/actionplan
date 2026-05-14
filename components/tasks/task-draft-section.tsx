"use client";

import { useState, useTransition } from "react";
import {
  generateTaskDraft,
  approveTaskDraft,
  unapproveTaskDraft,
  saveTaskDraftEdits,
  discardTaskDraft,
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

// ─── saved-state pill ────────────────────────────────────────────────────────

type SavedState =
  | { kind: "pending-saved" }
  | { kind: "approved-saved" }
  | { kind: "unsaved-edits" }
  | { kind: "not-persisted" };

function SavedPill({ state }: { state: SavedState }) {
  switch (state.kind) {
    case "pending-saved":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[10.5px] font-medium text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          Saved · Pending review
        </span>
      );
    case "approved-saved":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 6 5 9 10 3" />
          </svg>
          Saved · Approved
        </span>
      );
    case "unsaved-edits":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Unsaved changes
        </span>
      );
    case "not-persisted":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          Not saved · Run db:push
        </span>
      );
  }
}

// ─── component ───────────────────────────────────────────────────────────────

export function TaskDraftSection({
  documentId,
  kind,
  taskIndex,
  initialDraft,
  draftContext,
}: Props) {
  // Core draft state
  const [draft, setDraft]         = useState<TaskDraft | null>(initialDraft);
  const [persisted, setPersisted] = useState<boolean>(initialDraft !== null);

  // Empty-state picker
  const [pickerType, setPickerType] = useState<DraftType>(initialDraft?.draftType ?? "email");

  // Edit state
  const [isEditing, setIsEditing]     = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody]       = useState("");

  // Inline confirmations — null when not confirming
  const [confirming, setConfirming] = useState<
    null | "discard" | "regenerate-approved" | "regenerate-editing"
  >(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Transitions — separate so we can show specific spinners
  const [isGenerating,  startGenerating]  = useTransition();
  const [isApproving,   startApproving]   = useTransition();
  const [isUnapproving, startUnapproving] = useTransition();
  const [isSaving,      startSaving]      = useTransition();
  const [isDiscarding,  startDiscarding]  = useTransition();
  const anyPending =
    isGenerating || isApproving || isUnapproving || isSaving || isDiscarding;

  // Computed
  const hasUnsavedChanges =
    isEditing &&
    draft !== null &&
    (editBody !== draft.body || editSubject !== (draft.subject ?? ""));

  // Saved-state for header pill
  let savedState: SavedState | null = null;
  if (draft) {
    if (isEditing && hasUnsavedChanges)        savedState = { kind: "unsaved-edits" };
    else if (!persisted)                       savedState = { kind: "not-persisted" };
    else if (draft.approved)                   savedState = { kind: "approved-saved" };
    else                                       savedState = { kind: "pending-saved" };
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function clearTransient() {
    setError(null);
    setConfirming(null);
  }

  function handleGenerate() {
    clearTransient();
    startGenerating(async () => {
      try {
        const result = await generateTaskDraft(documentId, kind, taskIndex, pickerType, draftContext);
        setDraft(result.draft);
        setPersisted(result.persisted);
        setIsEditing(false);
        setEditSubject("");
        setEditBody("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate draft");
      }
    });
  }

  function handleRegenerateClick() {
    // Confirm if user has work that would be lost
    if (isEditing && hasUnsavedChanges) {
      setConfirming("regenerate-editing");
      return;
    }
    if (draft?.approved) {
      setConfirming("regenerate-approved");
      return;
    }
    handleGenerate();
  }

  function handleStartEdit() {
    if (!draft) return;
    setEditSubject(draft.subject ?? "");
    setEditBody(draft.body);
    setIsEditing(true);
    setError(null);
    setConfirming(null);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditSubject("");
    setEditBody("");
    setError(null);
  }

  function handleSaveEdit() {
    if (!draft) return;
    if (editBody.trim().length === 0) {
      setError("Body cannot be empty");
      return;
    }
    clearTransient();
    startSaving(async () => {
      try {
        const subjectToSave = draft.draftType === "email" ? editSubject.trim() : null;
        const bodyToSave    = editBody.trim();
        const result = await saveTaskDraftEdits(
          documentId, kind, taskIndex,
          { subject: subjectToSave, body: bodyToSave },
        );
        setDraft({
          ...draft,
          subject:    subjectToSave,
          body:       bodyToSave,
          approved:   false,
          approvedAt: null,
        });
        setPersisted(result.persisted);
        setIsEditing(false);
        setEditSubject("");
        setEditBody("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save changes");
      }
    });
  }

  function handleApprove() {
    if (!draft || draft.approved || isEditing) return;
    clearTransient();
    startApproving(async () => {
      try {
        const result = await approveTaskDraft(documentId, kind, taskIndex);
        setDraft({ ...draft, approved: true, approvedAt: result.approvedAt });
        setPersisted(result.persisted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve draft");
      }
    });
  }

  function handleUnapprove() {
    if (!draft || !draft.approved || isEditing) return;
    clearTransient();
    startUnapproving(async () => {
      try {
        const result = await unapproveTaskDraft(documentId, kind, taskIndex);
        setDraft({ ...draft, approved: false, approvedAt: null });
        setPersisted(result.persisted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unapprove draft");
      }
    });
  }

  function handleDiscardConfirm() {
    setError(null);
    setConfirming(null);
    startDiscarding(async () => {
      try {
        await discardTaskDraft(documentId, kind, taskIndex);
        setDraft(null);
        setPersisted(false);
        setIsEditing(false);
        setEditSubject("");
        setEditBody("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to discard draft");
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div id="draft-section" className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {/* Header — title + always-visible saved-state pill */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[13px] font-semibold text-zinc-700">Draft</h2>
          {savedState && <SavedPill state={savedState} />}
        </div>
        {/* Section-level Regenerate — operates on the whole artifact, lives at
            the section level so it doesn't compete with the per-state review
            controls in the bottom bar. Hidden during inline confirms to avoid
            offering a duplicate path while the user is resolving one. */}
        {draft && !confirming && (
          <button
            type="button"
            onClick={handleRegenerateClick}
            disabled={anyPending}
            className="text-[11.5px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-40"
          >
            {isGenerating ? "Regenerating…" : "Regenerate"}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-5">

        {/* ── Empty state — compact: explainer + picker + CTA on one wrap row */}
        {!draft && !isGenerating && (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Generate a draft you can review, edit, and use to act on this task.
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

        {/* ── Generation loading */}
        {isGenerating && (
          <div className="flex items-center gap-2.5 py-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin text-zinc-400">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p className="text-[13px] text-zinc-400">
              {draft ? "Regenerating draft…" : "Generating draft…"}
            </p>
          </div>
        )}

        {/* ── Draft view / edit / actions */}
        {draft && !isGenerating && (
          <div className="space-y-4">

            {/* ── Read-only artifact card */}
            {!isEditing && (
              <article className={`overflow-hidden rounded-lg border ${
                draft.approved
                  ? "border-emerald-200 bg-emerald-50/30"
                  : "border-zinc-200 bg-zinc-50"
              }`}>
                {/* Type label */}
                <div className="border-b border-zinc-200/70 px-4 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                    {TYPE_LABELS[draft.draftType]}
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
            )}

            {/* ── Edit form — same artifact shape, but inputs */}
            {isEditing && (
              <article className="overflow-hidden rounded-lg border border-amber-200 bg-white ring-1 ring-amber-100">
                <div className="flex items-center justify-between border-b border-zinc-200/70 px-4 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                    {TYPE_LABELS[draft.draftType]}
                  </span>
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-700">
                    Editing
                  </span>
                </div>

                {/* Subject input (email only) */}
                {draft.draftType === "email" && (
                  <div className="border-b border-zinc-200/70 px-4 py-2.5">
                    <label
                      htmlFor="draft-subject"
                      className="block font-mono text-[9.5px] uppercase tracking-[0.1em] text-zinc-400"
                    >
                      Subject
                    </label>
                    <input
                      id="draft-subject"
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      maxLength={200}
                      disabled={anyPending}
                      placeholder="Subject line"
                      className="mt-0.5 w-full bg-transparent text-[13.5px] font-semibold text-zinc-800 placeholder:text-zinc-300 focus:outline-none"
                    />
                  </div>
                )}

                {/* Body textarea */}
                <div className="px-4 py-3.5">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    maxLength={8000}
                    disabled={anyPending}
                    rows={Math.max(8, Math.min(24, editBody.split("\n").length + 2))}
                    placeholder="Draft body…"
                    className="block max-h-[60vh] w-full resize-y bg-transparent text-[13.5px] leading-relaxed text-zinc-700 placeholder:text-zinc-300 focus:outline-none"
                  />
                </div>
              </article>
            )}

            {/* ── Action / status bar — adapts to state */}
            {!confirming && !isEditing && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-[360px] text-[11.5px] leading-snug text-zinc-500">
                  {draft.approved
                    ? `Approved${draft.approvedAt ? ` on ${formatApprovedTimestamp(draft.approvedAt)}` : ""}. Edit or regenerate at any time.`
                    : "Review carefully — edit if needed, then approve when the draft is correct."}
                </p>
                <div className="flex flex-wrap items-center gap-2 gap-y-1.5">
                  {/* Edit — neutral, outlined: modifies the artifact in place */}
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    disabled={anyPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                    Edit
                  </button>

                  {/* Discard — destructive, outlined */}
                  <button
                    type="button"
                    onClick={() => setConfirming("discard")}
                    disabled={anyPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-[11.5px] font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-100 disabled:opacity-50"
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

                  {/* Primary state-change — Approve when pending, Unapprove when approved */}
                  {!draft.approved ? (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={anyPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isApproving ? (
                        "Approving…"
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="2 6 5 9 10 3" />
                          </svg>
                          Approve draft
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUnapprove}
                      disabled={anyPending}
                      title="Clear approval — content is preserved"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {isUnapproving ? (
                        "Returning…"
                      ) : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 7v6h6" />
                            <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
                          </svg>
                          Return to review
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Edit mode action bar */}
            {isEditing && !confirming && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11.5px] leading-snug text-zinc-500">
                  {draft.approved
                    ? "Saving will mark this draft as pending review."
                    : "Save your changes to update the draft."}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={anyPending}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={anyPending || !hasUnsavedChanges}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Inline confirmation: discard */}
            {confirming === "discard" && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/60 px-4 py-3">
                <p className="text-[12px] font-medium text-red-700">
                  Discard this draft permanently? This cannot be undone.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    disabled={anyPending}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardConfirm}
                    disabled={anyPending}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDiscarding ? "Discarding…" : "Confirm discard"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Inline confirmation: regenerate (approved or editing-dirty) */}
            {(confirming === "regenerate-approved" || confirming === "regenerate-editing") && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
                <p className="text-[12px] font-medium text-amber-800">
                  {confirming === "regenerate-editing"
                    ? "Discard your unsaved edits and regenerate a fresh draft?"
                    : "Replace your approved draft with a fresh one? Approval will be reset."}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    disabled={anyPending}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={anyPending}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                  >
                    Confirm regenerate
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Error */}
        {error && !isGenerating && (
          <p className="mt-3 text-[12px] text-red-500">{error}</p>
        )}

      </div>
    </div>
  );
}
