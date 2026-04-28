"use client";

import { useState, useRef } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { AnalysisResults } from "./analysis-results";

const MIN_LENGTH    = 50;
const MAX_LENGTH    = 12_000;
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

const LOADING_MESSAGES = [
  "Analyzing document…",
  "Extracting action items…",
  "Identifying deadlines…",
  "Reviewing risks and fine print…",
  "Generating questions to ask…",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024)             return `${bytes} B`;
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  onSuccess?: (text: string, result: AnalysisResult) => void;
};

export function ActionPlanForm({ onSuccess }: Props = {}) {
  const [text, setText]                       = useState("");
  const [file, setFile]                       = useState<File | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [result, setResult]                   = useState<AnalysisResult | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── file selection ──────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = ""; // reset so the same file can be re-selected after clearing
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
    setResult(null);
    setText(""); // clear any pasted text
  }

  function clearFile() {
    setFile(null);
    setError(null);
  }

  // ── submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    setLoadingMessageIndex(0);

    intervalRef.current = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    try {
      if (file) {
        // ── file mode ──────────────────────────────────────────────────
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload-analyze", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "Something went wrong. Please try again.");
          return;
        }

        const extractedText = (data as { extractedText?: string }).extractedText ?? "";

        if (onSuccess) {
          onSuccess(extractedText, data as AnalysisResult);
        } else {
          setResult(data as AnalysisResult);
        }
      } else {
        // ── text mode (unchanged) ──────────────────────────────────────
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "Something went wrong. Please try again.");
          return;
        }

        if (onSuccess) {
          onSuccess(text, data as AnalysisResult);
        } else {
          setResult(data as AnalysisResult);
        }
      }
    } catch {
      setError("Could not reach the server. Please check your connection.");
    } finally {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setLoading(false);
    }
  }

  // ── derived state ───────────────────────────────────────────────────────

  const charCount  = text.length;
  const wordCount  = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const isTooShort = charCount > 0 && charCount < MIN_LENGTH;
  const isOverLimit = charCount > MAX_LENGTH;
  const canSubmit  = file
    ? !loading
    : charCount >= MIN_LENGTH && !isOverLimit && !loading;

  const counterText = isTooShort
    ? `${MIN_LENGTH - charCount} more chars needed`
    : isOverLimit
    ? `${charCount - MAX_LENGTH} over limit`
    : wordCount > 0
    ? `${wordCount.toLocaleString()} words`
    : "";

  // ── render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
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
            /* ── file mode ── */
            <div className="flex items-center gap-4 px-5 py-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-500"
                >
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
                disabled={loading}
                title="Remove file"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            /* ── text mode ── */
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a confusing email, letter, policy, or document here…"
              rows={10}
              maxLength={MAX_LENGTH}
              disabled={loading}
              className="w-full resize-y border-0 bg-transparent px-4 py-4 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 disabled:opacity-50"
            />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              {!file && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setText(SAMPLE_TEXT)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ✦ Try sample
                </button>
              )}
              <button
                type="button"
                disabled={loading}
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
                {loading && (
                  <span className="size-4 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
                )}
                {loading ? "Analyzing…" : "Analyze →"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {loading && (
        <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <span className="size-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          <p className="text-sm text-zinc-500">{LOADING_MESSAGES[loadingMessageIndex]}</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Inline fallback: only rendered when onSuccess is not provided
          (e.g. standalone embedding or local development). In the main
          app flow onSuccess is always passed, so this branch stays dormant. */}
      {result && <AnalysisResults result={result} />}
    </div>
  );
}
