"use client";

import { useState, useRef } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { AnalysisResults } from "./analysis-results";

const MIN_LENGTH = 50;
const MAX_LENGTH = 12000;

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

type Props = {
  onSuccess?: (text: string, result: AnalysisResult) => void;
};

export function ActionPlanForm({ onSuccess }: Props = {}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const charCount = text.length;
  const isTooShort = charCount > 0 && charCount < MIN_LENGTH;
  const isOverLimit = charCount > MAX_LENGTH;
  const canSubmit = charCount >= MIN_LENGTH && !isOverLimit && !loading;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a confusing email, letter, policy, or document here…"
            rows={10}
            maxLength={MAX_LENGTH}
            disabled={loading}
            className="w-full resize-y border-0 bg-transparent px-4 py-4 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 disabled:opacity-50"
          />
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                disabled={loading}
                onClick={() => setText(SAMPLE_TEXT)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ✦ Try sample
              </button>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-300 cursor-not-allowed"
              >
                ↑ Upload
              </button>
              <span className="hidden sm:block text-xs text-zinc-300 select-none">
                PDF · DOCX · TXT
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <p className={`text-xs ${isOverLimit ? "text-red-500" : "text-zinc-400"}`}>
                {isTooShort
                  ? `${MIN_LENGTH - charCount} more chars needed`
                  : isOverLimit
                  ? `${charCount - MAX_LENGTH} over limit`
                  : charCount > 0
                  ? `${charCount.toLocaleString()}`
                  : ""}
              </p>
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

      {result && <AnalysisResults result={result} />}
    </div>
  );
}
