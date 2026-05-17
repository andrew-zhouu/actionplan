"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const MIN_LENGTH     = 50;
const MAX_LENGTH     = 12_000;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const SAMPLE_TEXT = `Dear Alex Chen,

Congratulations. On behalf of the Rhodes Foundation, it is our great pleasure to inform you that you have been selected as a recipient of the Rhodes Merit Scholarship for the 2026–2027 academic year, in the amount of $18,500.

To accept this award, you must submit the enclosed Acceptance & Disbursement Agreement, a certified copy of your enrollment verification, and a 250-word statement of intent no later than May 15, 2026. Failure to return all three documents by this date will result in the automatic forfeiture of the scholarship, and the award will be reassigned to an alternate candidate.

Disbursement of funds is contingent upon verification of full-time enrollment (minimum 12 credit hours per semester). Recipients who drop below full-time status at any point during the academic year are required to notify the Foundation within 10 business days; failure to do so may result in pro-rated repayment of the award.

You are required to maintain a cumulative GPA of 3.5 or higher to remain eligible for renewal consideration in subsequent years. A mid-year academic progress report will be requested in January 2027.

As a condition of the award, recipients are expected to participate in two Foundation mentorship events per year and submit a brief annual impact letter. Non-participation without documented cause may disqualify the recipient from future Foundation programming.

Please direct questions regarding this award to the Office of Financial Aid at awards@rhodesfoundation.org.

Sincerely,
Dr. Miriam Okafor
Executive Director, Rhodes Foundation`;

// ─── helpers ───────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Usage         = { documentsUsed: number; documentLimit: number };
type LimitReached  = { documentsUsed: number; documentLimit: number };
type AnalyzeStart  = { id: string };

type Props = {
  onSuccess?: (response: AnalyzeStart) => void;
  usage?:    Usage | null;
  /** True when the user already has an in-flight analysis. Disables every
   *  interactive control so the user can't trigger a server-side 409. The
   *  state card above this form is what tells the user what's happening. */
  locked?:   boolean;
  /** The sourceText of the in-flight analysis (when locked). The textarea
   *  is repopulated with this so the user sees exactly what's being
   *  analyzed even after navigating away and coming back. */
  lockedText?: string;
};

export function ActionPlanForm({
  onSuccess,
  usage      = null,
  locked     = false,
  lockedText,
}: Props = {}) {
  const router = useRouter();

  // Lazy-init `text` from `lockedText` on first mount so a user who
  // navigates back to /app/new while their analysis is still processing
  // immediately sees the submitted content — no flicker, no useEffect lag.
  const [text, setText] = useState<string>(
    locked && typeof lockedText === "string" ? lockedText : "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [limitState, setLimitState] = useState<LimitReached | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Belt-and-suspenders double-submit guard. The Analyze button is also
  // `disabled` while `loading` is true, but React state updates batch —
  // the ref check at the top of handleSubmit prevents any race during
  // the click → loading=true → disabled-render window.
  const submittingRef = useRef(false);

  // ── sync textarea with the in-flight analysis's sourceText ─────────────
  // While locked, mirror the server's `lockedText` into the textarea so
  // the user sees what's being analyzed even after they leave and come
  // back. When the lock transitions OFF (analysis completed), clear the
  // textarea so the user starts fresh for their next submission. Also
  // force file-mode → text-mode on lock so the compose surface always
  // shows the in-flight analysis as text regardless of how it was
  // originally submitted.
  useEffect(() => {
    if (locked) {
      if (typeof lockedText === "string") setText(lockedText);
      setFile(null);
    } else {
      setText("");
    }
  }, [locked, lockedText]);

  // ── derived limit state ────────────────────────────────────────────────
  const usageAtLimit  = usage !== null && usage.documentsUsed >= usage.documentLimit;
  const showingLimit  = limitState !== null || usageAtLimit;
  const effectiveLimit: LimitReached | null =
    limitState ?? (usageAtLimit ? usage! : null);

  // ── shared API error handling ─────────────────────────────────────────

  type ApiError = { error?: unknown; message?: unknown; documentsUsed?: unknown; documentLimit?: unknown };

  function handleApiError(data: ApiError) {
    if (data.error === "limit_reached") {
      setLimitState({
        documentsUsed: typeof data.documentsUsed === "number" ? data.documentsUsed : 0,
        documentLimit: typeof data.documentLimit === "number" ? data.documentLimit : 0,
      });
      return;
    }
    if (data.error === "analysis_in_flight") {
      // Another tab beat us, or the form was momentarily out of sync.
      // Don't show a red error banner — just refresh the page so the
      // state card + locked form reflect reality.
      router.refresh();
      return;
    }
    const friendly =
      typeof data.message === "string" ? data.message :
      typeof data.error   === "string" ? data.error   :
      "Something went wrong. Please try again.";
    setError(friendly);
  }

  // ── analyze pipelines (insert + after() — server returns { id } fast) ──

  async function analyzeText(textToAnalyze: string) {
    setError(null);
    setLimitState(null);
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: textToAnalyze }),
      });
      const data = await response.json();
      if (!response.ok) {
        handleApiError(data);
        return;
      }
      if (typeof data?.id !== "string") {
        setError("Unexpected response from the server. Please try again.");
        return;
      }
      onSuccess?.({ id: data.id });
    } catch {
      setError("Could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function analyzeFile(fileToAnalyze: File) {
    setError(null);
    setLimitState(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", fileToAnalyze);
      const response = await fetch("/api/upload-analyze", {
        method: "POST",
        body:   formData,
      });
      const data = await response.json();
      if (!response.ok) {
        handleApiError(data);
        return;
      }
      if (typeof data?.id !== "string") {
        setError("Unexpected response from the server. Please try again.");
        return;
      }
      onSuccess?.({ id: data.id });
    } catch {
      setError("Could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // ── file selection ──────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!selected) return;

    const name  = selected.name.toLowerCase();
    const isPdf = selected.type === "application/pdf" || name.endsWith(".pdf");
    const isTxt = selected.type === "text/plain"      || name.endsWith(".txt");

    if (!isPdf && !isTxt) {
      setError("Unsupported file type. Please upload a PDF or TXT file.");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError("File is too large. Please use a file under 5 MB.");
      return;
    }

    setFile(selected);
    setError(null);
    setLimitState(null);
    setText("");
  }

  function clearFile() {
    setFile(null);
    setError(null);
  }

  // ── submit (with hard double-submit guard) ────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Hard guards: if a submit is already in flight OR the form is locked
    // because the user already has a processing doc, ignore. React's
    // `loading` and `disabled` states take a render to propagate, so a
    // ref-check at the top of the handler closes the race window.
    if (submittingRef.current) return;
    if (locked) return;
    submittingRef.current = true;

    try {
      if (file) {
        await analyzeFile(file);
      } else {
        await analyzeText(text);
      }
    } finally {
      submittingRef.current = false;
    }
  }

  // ── derived state ───────────────────────────────────────────────────────

  const charCount   = text.length;
  const wordCount   = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const isTooShort  = charCount > 0 && charCount < MIN_LENGTH;
  const isOverLimit = charCount > MAX_LENGTH;
  // `inputsDisabled` covers both the brief insert window (`loading`) and the
  // one-in-flight lock (`locked`). Used to disable every interactive control.
  const inputsDisabled = loading || locked;
  const canSubmit   = !showingLimit && !locked && (file
    ? !loading
    : charCount >= MIN_LENGTH && !isOverLimit && !loading);

  const counterText = isTooShort
    ? `${MIN_LENGTH - charCount} more chars needed`
    : isOverLimit
    ? `${charCount - MAX_LENGTH} over limit`
    : wordCount > 0
    ? `${wordCount.toLocaleString()} words`
    : "";

  const remaining = usage ? Math.max(0, usage.documentLimit - usage.documentsUsed) : null;

  // ── render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        className="sr-only"
        onChange={handleFileSelect}
      />

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          {file ? (
            <div className="flex items-center gap-4 px-5 py-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900">{file.name}</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {formatFileSize(file.size)} · Ready to analyze
                </p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                disabled={inputsDisabled}
                title="Remove file"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a confusing email, letter, policy, or document here…"
              rows={10}
              maxLength={MAX_LENGTH}
              disabled={inputsDisabled}
              className="w-full resize-y border-0 bg-transparent px-4 py-4 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 disabled:opacity-50"
            />
          )}

          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              {!file && (
                <button
                  type="button"
                  disabled={inputsDisabled}
                  onClick={() => setText(SAMPLE_TEXT)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ✦ Try sample
                </button>
              )}
              <button
                type="button"
                disabled={inputsDisabled}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ↑ {file ? "Change file" : "Upload"}
              </button>
              <span className="hidden sm:block text-xs text-zinc-300 select-none">
                PDF · TXT
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!file && (
                <p className={`text-xs ${isOverLimit ? "text-red-500" : "text-zinc-400"}`}>
                  {counterText}
                </p>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {/* Spinner shows for both the brief insert window (`loading`)
                    and the longer in-flight processing state (`locked`), so
                    the button stays visually coordinated with the
                    "Analyzing your latest document…" card above. */}
                {(loading || locked) && (
                  <span className="size-4 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
                )}
                {locked
                  ? "Analyzing…"
                  : loading
                  ? "Submitting…"
                  : "Analyze →"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Persistent usage indicator — collapses when at limit. */}
      {usage && !showingLimit && remaining !== null && (
        <p className="px-1 text-[11.5px] text-zinc-500">
          <span className="font-medium text-zinc-700">{remaining}</span>
          {" of "}
          <span className="font-medium text-zinc-700">{usage.documentLimit}</span>
          {" early-access "}
          {usage.documentLimit === 1 ? "analysis" : "analyses"}
          {" remaining."}
        </p>
      )}

      {/* Limit-reached notice — early-access framed; links to /early-access
          for org code path. Replaces both the usage indicator and the
          generic error banner. */}
      {effectiveLimit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[13px] font-semibold text-amber-900">
            You&apos;ve reached your early-access limit
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-amber-800">
            You&apos;ve used all {effectiveLimit.documentLimit} of your early-access{" "}
            {effectiveLimit.documentLimit === 1 ? "analysis" : "analyses"}. We&apos;ll
            let you know when general access opens — or, if you have an
            organization access code,{" "}
            <Link
              href="/early-access"
              className="font-semibold text-amber-900 underline decoration-amber-400 underline-offset-2 transition-colors hover:decoration-amber-600"
            >
              enter it here
            </Link>{" "}
            for higher limits.
          </p>
        </div>
      )}

      {/* Generic error (non-limit). Only renders when there's a real error
          and we're not already showing the limit notice. */}
      {error && !effectiveLimit && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
