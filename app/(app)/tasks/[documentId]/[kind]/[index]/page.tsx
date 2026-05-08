export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { documents, taskCompletions } from "@/lib/db/schema";
import type { AnalysisResult } from "@/types/analysis";
import { Topbar } from "@/components/shell/topbar";
import { TaskWorkspaceToggle } from "@/components/tasks/task-workspace-toggle";
import { COMPLEXITY_COLORS } from "@/lib/constants";
import { parseDate, formatDeadlineDate } from "@/lib/utils/dates";

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

  // ── Related risks (up to 4 from same document) ────────────────────────────
  const visibleRisks  = result.risks.slice(0, 4);
  const hiddenRisks   = result.risks.length - visibleRisks.length;

  return (
    <>
      <Topbar
        crumbs={[
          { label: "Inbox", href: "/" },
          { label: doc.documentType, href: `/docs/${documentId}` },
          taskKind === "deadline" ? "Deadline" : "Action item",
        ]}
      />

      <div className="flex-1 overflow-y-auto bg-zinc-50">
        <main className="mx-auto max-w-2xl px-6 py-10">
          <div className="space-y-5">

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

            {/* ── Source document context ───────────────────────────────── */}
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

            {/* ── Why this task exists ──────────────────────────────────── */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-3.5">
                <h2 className="text-[13px] font-semibold text-zinc-700">
                  Why this task exists
                </h2>
              </div>
              <div className="px-5 py-4">
                <p className="text-[13px] leading-relaxed text-zinc-500">
                  This task was identified during analysis of{" "}
                  <span className="font-medium text-zinc-700">
                    {doc.documentType}
                  </span>
                  . Open the source document to see the specific clause or
                  requirement that generated it.
                </p>
                <Link
                  href={`/docs/${documentId}`}
                  className="mt-3 inline-block text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  View full document context →
                </Link>
              </div>
            </div>

            {/* ── Risks from this document ──────────────────────────────── */}
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
