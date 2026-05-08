export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { documents, taskCompletions } from "@/lib/db/schema";
import type { AnalysisResult } from "@/types/analysis";
import { Topbar } from "@/components/shell/topbar";
import { TaskWorkspaceToggle } from "@/components/tasks/task-workspace-toggle";
import { TaskBackButton } from "@/components/tasks/task-back-button";
import { COMPLEXITY_COLORS } from "@/lib/constants";
import { parseDate, formatDeadlineDate } from "@/lib/utils/dates";

// ─── helpers ─────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "this", "that",
  "these", "those", "it", "its", "as", "if", "all", "any", "each",
  "you", "your", "our", "their", "per", "also", "not", "no",
]);

/**
 * Finds a risk from the document that meaningfully overlaps with the task label.
 * Conservative: requires at least 2 keyword matches (≥ 4 chars, non-stop-word)
 * to avoid surfacing spurious single-word coincidences.
 * Returns null when no confident match is found.
 */
function findRelatedRisk(taskLabel: string, risks: string[]): string | null {
  if (risks.length === 0) return null;

  const taskWords = taskLabel
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  if (taskWords.length === 0) return null;

  let bestRisk: string | null = null;
  let bestScore = 0;

  for (const risk of risks) {
    const riskLower = risk.toLowerCase();
    const score = taskWords.filter((w) => riskLower.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestRisk = risk;
    }
  }

  // Require at least 2 overlapping keywords — single-word matches are too weak
  return bestScore >= 2 ? bestRisk : null;
}

// ─── page ─────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ documentId: string; kind: string; index: string }>;
};

export default async function TaskWorkspacePage({ params }: Props) {
  const { documentId, kind, index: indexStr } = await params;

  // ── Validate kind ──────────────────────────────────────────────────────────
  if (kind !== "deadline" && kind !== "action_item") notFound();
  const taskKind = kind as "action_item" | "deadline";

  // ── Validate index ─────────────────────────────────────────────────────────
  const taskIndex = parseInt(indexStr, 10);
  if (isNaN(taskIndex) || taskIndex < 0) notFound();

  // ── Fetch document ─────────────────────────────────────────────────────────
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (rows.length === 0) notFound();
  const doc = rows[0];

  // ── Parse result JSON ──────────────────────────────────────────────────────
  let result: AnalysisResult;
  try {
    result = JSON.parse(doc.result) as AnalysisResult;
  } catch {
    notFound();
  }

  // ── Extract specific task — notFound() on out-of-range index ──────────────
  let taskLabel: string;
  let taskDate: string | undefined;

  if (taskKind === "deadline") {
    const deadline = result.deadlines[taskIndex];
    if (!deadline) notFound();
    taskLabel = deadline.description;
    taskDate  = deadline.date;
  } else {
    const item = result.actionItems[taskIndex];
    if (!item) notFound();
    taskLabel = item;
  }

  // ── Completion state ───────────────────────────────────────────────────────
  const completionRows = await db
    .select()
    .from(taskCompletions)
    .where(
      and(
        eq(taskCompletions.documentId, documentId),
        eq(taskCompletions.kind, taskKind),
        eq(taskCompletions.taskIndex, taskIndex),
      ),
    )
    .limit(1);
  const isDone = completionRows.length > 0;

  // ── Due date parsing ───────────────────────────────────────────────────────
  const parsedDate = taskDate ? parseDate(taskDate) : null;
  const now        = new Date();
  const isOverdue  = !!parsedDate && parsedDate < now && !isDone;

  // ── Related risk — conservative keyword match ─────────────────────────────
  const relatedRisk = findRelatedRisk(taskLabel, result.risks);

  // ── Sibling tasks (same document, same kind, excluding current) ───────────
  const siblingDeadlines = taskKind === "deadline"
    ? result.deadlines
        .map((d, i) => ({ description: d.description, date: d.date, index: i }))
        .filter((d) => d.index !== taskIndex)
        .slice(0, 3)
    : [];

  const siblingActions = taskKind === "action_item"
    ? result.actionItems
        .map((label, i) => ({ label, index: i }))
        .filter((a) => a.index !== taskIndex)
        .slice(0, 3)
    : [];

  const hasSiblings = siblingDeadlines.length > 0 || siblingActions.length > 0;

  // ── Risks display (up to 4 as broader reference) ──────────────────────────
  const visibleRisks = result.risks.slice(0, 4);
  const hiddenRisks  = result.risks.length - visibleRisks.length;

  return (
    <>
      <Topbar
        crumbs={[
          { label: "Tasks", href: "/tasks" },
          { label: doc.documentType, href: `/docs/${documentId}` },
          taskKind === "deadline" ? "Deadline" : "Action item",
        ]}
      />

      <div className="flex-1 overflow-y-auto bg-zinc-50">
        <main className="mx-auto max-w-2xl px-6 py-10">
          <div className="space-y-5">

            {/* ── Back navigation ──────────────────────────────────────── */}
            <TaskBackButton />

            {/* ── Task header ──────────────────────────────────────────── */}
            <div
              className={`overflow-hidden rounded-xl border bg-white p-6 ${
                isOverdue ? "border-red-200" : "border-zinc-200"
              }`}
            >
              {/* Badges + toggle */}
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      taskKind === "deadline" && isOverdue
                        ? "bg-red-100 text-red-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {taskKind === "deadline" ? "Deadline" : "Action item"}
                  </span>
                  {isOverdue && (
                    <span className="text-[11px] font-semibold text-red-500">
                      Overdue
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[11px] font-medium text-zinc-400">
                      Completed
                    </span>
                  )}
                </div>
                <TaskWorkspaceToggle
                  documentId={documentId}
                  kind={taskKind}
                  taskIndex={taskIndex}
                  done={isDone}
                />
              </div>

              {/* Task description */}
              <p
                className={`text-[17px] font-semibold leading-snug ${
                  isDone
                    ? "text-zinc-400 line-through decoration-zinc-300"
                    : isOverdue
                    ? "text-red-900"
                    : "text-zinc-900"
                }`}
              >
                {taskLabel}
              </p>

              {/* Due date */}
              {parsedDate && (
                <p
                  className={`mt-2.5 font-mono text-[12px] ${
                    isOverdue && !isDone ? "text-red-500" : "text-zinc-400"
                  }`}
                >
                  Due {formatDeadlineDate(parsedDate)}
                </p>
              )}
              {taskDate && !parsedDate && (
                <p className="mt-2.5 font-mono text-[12px] text-zinc-400">
                  Due {taskDate}
                </p>
              )}
            </div>

            {/* ── Source document ───────────────────────────────────────── */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-3.5">
                <h2 className="text-[13px] font-semibold text-zinc-700">
                  Source document
                </h2>
              </div>
              <div className="px-5 py-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      COMPLEXITY_COLORS[doc.complexity] ?? "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {doc.complexity}
                  </span>
                  <span className="text-[13px] font-medium text-zinc-700">
                    {doc.documentType}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-zinc-500">
                  {result.summary}
                </p>
                <Link
                  href={`/docs/${documentId}`}
                  className="mt-3 inline-block text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  Open in document workspace →
                </Link>
              </div>
            </div>

            {/* ── Why this task exists ──────────────────────────────────────
                Kind-specific framing + a matched risk when confidence is high.
                The related-risk block is omitted when keyword overlap is weak. */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-3.5">
                <h2 className="text-[13px] font-semibold text-zinc-700">
                  Why this task exists
                </h2>
              </div>
              <div className="space-y-3 px-5 py-4">
                <p className="text-[13px] leading-relaxed text-zinc-600">
                  {taskKind === "deadline"
                    ? `This is a time-bound requirement in a ${doc.documentType}. Acting before the deadline is necessary to fulfill the document's conditions.`
                    : `This action item was identified as a required step in a ${doc.documentType}. Completing it is part of fulfilling the document's obligations.`}
                </p>

                {/* Related risk — only rendered when match confidence is sufficient */}
                {relatedRisk && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/40 px-4 py-3">
                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <div className="min-w-0">
                      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-amber-700">
                        Related risk
                      </p>
                      <p className="text-[12.5px] leading-snug text-zinc-700">
                        {relatedRisk}
                      </p>
                    </div>
                  </div>
                )}

                <Link
                  href={`/docs/${documentId}`}
                  className="inline-block text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-700"
                >
                  View full document context →
                </Link>
              </div>
            </div>

            {/* ── Questions to consider ─────────────────────────────────────
                Surfaced from the document analysis — useful when deciding
                how to approach a task or who to contact before acting. */}
            {result.questionsToAsk.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 px-5 py-3.5">
                  <h2 className="text-[13px] font-semibold text-zinc-700">
                    Questions to consider
                  </h2>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Flagged during document analysis
                  </p>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {result.questionsToAsk.slice(0, 3).map((q, i) => (
                    <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-mono text-[10px] font-bold text-zinc-500">
                        {i + 1}
                      </span>
                      <p className="text-[13px] leading-snug text-zinc-700">{q}</p>
                    </li>
                  ))}
                </ul>
                {result.questionsToAsk.length > 3 && (
                  <div className="border-t border-zinc-100 px-5 py-3">
                    <Link
                      href={`/docs/${documentId}?tab=questions`}
                      className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                    >
                      {result.questionsToAsk.length - 3} more{" "}
                      {result.questionsToAsk.length - 3 === 1 ? "question" : "questions"} in document →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ── Other tasks from this document ────────────────────────────
                Compact — shows the obligation set without taking over the page. */}
            {hasSiblings && (
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 px-5 py-3.5">
                  <h2 className="text-[13px] font-semibold text-zinc-700">
                    {taskKind === "deadline"
                      ? "Other deadlines"
                      : "Other action items"}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    From this document
                  </p>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {taskKind === "deadline"
                    ? siblingDeadlines.map((d) => {
                        const pd = d.date ? parseDate(d.date) : null;
                        return (
                          <li key={d.index}>
                            <Link
                              href={`/tasks/${documentId}/deadline/${d.index}`}
                              className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-zinc-50"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12.5px] text-zinc-700">
                                  {d.description}
                                </p>
                                {pd ? (
                                  <p className="mt-0.5 font-mono text-[10.5px] text-zinc-400">
                                    {formatDeadlineDate(pd)}
                                  </p>
                                ) : d.date ? (
                                  <p className="mt-0.5 font-mono text-[10.5px] text-zinc-400">
                                    {d.date}
                                  </p>
                                ) : null}
                              </div>
                              <span className="shrink-0 pt-px text-[11px] text-zinc-300">
                                →
                              </span>
                            </Link>
                          </li>
                        );
                      })
                    : siblingActions.map((a) => (
                        <li key={a.index}>
                          <Link
                            href={`/tasks/${documentId}/action_item/${a.index}`}
                            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-zinc-50"
                          >
                            <p className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-700">
                              {a.label}
                            </p>
                            <span className="shrink-0 text-[11px] text-zinc-300">
                              →
                            </span>
                          </Link>
                        </li>
                      ))}
                </ul>
              </div>
            )}

            {/* ── Risks from this document ──────────────────────────────────
                Broader document risk context — reference, not the focus. */}
            {visibleRisks.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 px-5 py-3.5">
                  <h2 className="text-[13px] font-semibold text-zinc-700">
                    Risks from this document
                  </h2>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {visibleRisks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-3 px-5 py-3">
                      <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <p className="text-[13px] leading-snug text-zinc-700">
                        {risk}
                      </p>
                    </li>
                  ))}
                </ul>
                {hiddenRisks > 0 && (
                  <div className="border-t border-zinc-100 px-5 py-3">
                    <Link
                      href={`/docs/${documentId}?tab=risks`}
                      className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                    >
                      {hiddenRisks} more {hiddenRisks === 1 ? "risk" : "risks"} in document →
                    </Link>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
