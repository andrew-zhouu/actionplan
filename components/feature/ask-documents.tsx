"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Answer } from "@/lib/rag/types";
import { MAX_DOCUMENTS } from "@/lib/rag/types";

type DocumentOption = { id: string; title: string; date: string };

export function AskDocuments({ documents, initialDocumentId, available }: {
  documents: DocumentOption[];
  initialDocumentId?: string;
  available: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(() => {
    const initial = documents.find(d => d.id === initialDocumentId);
    return initial ? [initial.id] : documents.slice(0, MAX_DOCUMENTS).map(d => d.id);
  });
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || !available) return;
    inFlight.current = true;
    setBusy(true); setError(""); setAnswer(null); setAskedQuestion(question.trim());
    try {
      const response = await fetch("/api/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), documentIds: selected }),
        signal: AbortSignal.timeout(115_000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Couldn't complete the question. Please try again.");
      setAnswer(result as Answer);
    } catch (err) {
      setError(err instanceof Error && err.name !== "TimeoutError" ? err.message : "This took too long. Please try again shortly.");
    } finally { setBusy(false); inFlight.current = false; }
  }

  return <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">Your documents, together</p>
    <h1 className="mt-3 font-display text-3xl tracking-tight text-zinc-900">Ask a question. See the source.</h1>
    <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">Compare details across your documents, clarify a condition, or find a deadline. Every answer includes the passages it came from.</p>
    {!available && <p role="status" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Document questions are not available yet. You can still view your analyses in the inbox.</p>}
    {documents.length === 0 ? <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8">
      <h2 className="font-medium text-zinc-900">Start with a document</h2>
      <p className="mt-2 text-sm text-zinc-600">Once its analysis is complete, you can ask questions here.</p>
      <Link className="mt-5 inline-block text-sm font-semibold underline underline-offset-4" href="/app/new">Add a document →</Link>
    </div> : <form onSubmit={ask} className="mt-8 space-y-6">
      <fieldset disabled={busy} className="rounded-2xl border border-zinc-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-zinc-900">Choose up to {MAX_DOCUMENTS} documents</legend>
        <p className="mb-3 text-xs text-zinc-500">{selected.length} selected · Showing your latest {documents.length} completed documents</p>
        <div className="max-h-52 space-y-1 overflow-y-auto">
          {documents.map(doc => <label key={doc.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-zinc-50">
            <input type="checkbox" checked={selected.includes(doc.id)}
              disabled={!selected.includes(doc.id) && selected.length >= MAX_DOCUMENTS}
              onChange={() => { setAnswer(null); setSelected(previous => previous.includes(doc.id) ? previous.filter(id => id !== doc.id) : [...previous, doc.id]); }}
              className="h-4 w-4 accent-zinc-900" />
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">{doc.title}</span>
            <span className="text-xs text-zinc-400">{doc.date}</span>
            <Link href={`/app/docs/${encodeURIComponent(doc.id)}`} className="text-xs text-zinc-500 underline underline-offset-2">Open</Link>
          </label>)}
        </div>
      </fieldset>
      <div>
        <label htmlFor="document-question" className="mb-2 block text-sm font-semibold text-zinc-900">What would you like to know?</label>
        <textarea id="document-question" required minLength={3} maxLength={1000} rows={3}
          value={question} onChange={e => setQuestion(e.target.value)} disabled={busy || !available}
          placeholder="What do I need to submit to keep my scholarship?"
          className="w-full resize-y rounded-xl border border-zinc-300 bg-white p-4 text-sm leading-6 text-zinc-900 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs leading-5 text-zinc-500">Selected text is processed by Google for search and relevant passages by Anthropic for answers. <Link href="/privacy" className="underline underline-offset-2">Privacy details</Link></p>
          <button type="submit" disabled={busy || !available || !selected.length || question.trim().length < 3}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Finding an answer…" : "Ask documents"}</button>
        </div>
      </div>
    </form>}
    <div aria-live="polite" aria-busy={busy}>
      {busy && <p className="mt-6 text-sm text-zinc-600">Searching your selected documents. The first question may take longer while they are prepared.</p>}
      {error && <p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
      {answer && <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8" aria-label="Answer">
        <h2 className="mb-5 font-display text-xl text-zinc-900">{askedQuestion}</h2>
        {!answer.answerable ? <p className="text-sm leading-6 text-zinc-600">{answer.message}</p> : <div className="space-y-6">
          {answer.claims.map((claim, i) => <div key={i}>
            <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-800">{claim.text}</p>
            <div className="mt-3 space-y-2">{claim.citations.map((cite, j) => <details key={`${cite.sourceId}-${j}`} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-zinc-600">{cite.documentTitle} · source {cite.sourceId.slice(1)}</summary>
              <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-zinc-300 pl-3 text-sm leading-6 text-zinc-600">{cite.quote}</blockquote>
              <Link href={`/app/docs/${encodeURIComponent(cite.documentId)}`} className="mt-3 inline-block text-xs font-medium text-zinc-700 underline underline-offset-2">Open original document →</Link>
            </details>)}</div>
          </div>)}
        </div>}
        <p className="mt-6 border-t border-zinc-100 pt-4 text-xs leading-5 text-zinc-500">Answers use retrieved passages, which may not cover every relevant detail. Check the quoted sources before acting.</p>
      </section>}
    </div>
  </main>;
}
