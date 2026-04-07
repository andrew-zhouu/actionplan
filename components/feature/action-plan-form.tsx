"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { AnalysisResults } from "./analysis-results";

const MIN_LENGTH = 50;
const MAX_LENGTH = 12000;

export function ActionPlanForm() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

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
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
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
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && <AnalysisResults result={result} />}
    </div>
  );
}
