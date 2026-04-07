"use client";

import { useState, useRef } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { AnalysisResults } from "./analysis-results";

const MIN_LENGTH = 50;
const MAX_LENGTH = 12000;

const LOADING_MESSAGES = [
  "Analyzing document…",
  "Extracting action items…",
  "Identifying deadlines…",
  "Reviewing risks and fine print…",
  "Generating questions to ask…",
];

export function ActionPlanForm() {
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

      setResult(data as AnalysisResult);
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
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a confusing email, letter, policy, or document here…"
          rows={10}
          maxLength={MAX_LENGTH}
          disabled={loading}
          className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
        />
        <div className="flex items-center justify-between">
          <p className={`text-xs ${isOverLimit ? "text-red-500" : "text-zinc-400"}`}>
            {isTooShort
              ? `${MIN_LENGTH - charCount} more characters needed`
              : isOverLimit
              ? `${charCount - MAX_LENGTH} characters over limit`
              : charCount > 0
              ? `${charCount.toLocaleString()} characters`
              : ""}
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading && (
              <span className="size-4 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
            )}
            {loading ? "Analyzing…" : "Analyze"}
          </button>
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
