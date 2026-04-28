"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const COMPLEXITIES = ["Low", "Medium", "High"] as const;

export function InboxFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const currentComplexity = params.get("complexity") ?? "";
  const [inputValue, setInputValue] = useState(params.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the text input in sync when the URL changes externally (e.g. browser back).
  useEffect(() => {
    setInputValue(params.get("q") ?? "");
  }, [params]);

  // Cancel any pending debounce on unmount to prevent stale router.replace calls.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function buildUrl(q: string, complexity: string): string {
    const p = new URLSearchParams();
    if (q.trim())  p.set("q",          q.trim());
    if (complexity) p.set("complexity", complexity);
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(buildUrl(val, currentComplexity));
    }, 350);
  }

  function clearText() {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.replace(buildUrl("", currentComplexity));
  }

  function handleComplexity(c: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const next = currentComplexity === c ? "" : c; // toggle off if already active
    router.replace(buildUrl(inputValue, next));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Text search — matches documentType and summary excerpt */}
      <div className="relative min-w-[160px] max-w-[240px] flex-1">
        <input
          type="text"
          value={inputValue}
          onChange={handleTextChange}
          placeholder="Search…"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-3 pr-7 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none"
        />
        {inputValue && (
          <button
            type="button"
            onClick={clearText}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Complexity pills — toggle; clicking the active pill clears it */}
      <div className="flex items-center gap-1">
        {COMPLEXITIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => handleComplexity(c)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              currentComplexity === c
                ? "bg-zinc-800 text-white"
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
