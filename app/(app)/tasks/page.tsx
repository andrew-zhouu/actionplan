export const dynamic = "force-dynamic";

import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { documents, taskCompletions } from "@/lib/db/schema";
import { Topbar } from "@/components/shell/topbar";
import { TaskRow } from "@/components/tasks/task-row";
import { parseDate, formatDeadlineDate } from "@/lib/utils/dates";

// ─── helpers ─────────────────────────────────────────────────────────────────

function isTableMissing(err: unknown): boolean {
  return err instanceof Error && err.message.includes("no such table");
}

// ─── small ui pieces ─────────────────────────────────────────────────────────

function SchemaWarning() {
  return (
    <div className="mx-6 mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-medium text-amber-800">
        Table missing:{" "}
        <code className="rounded bg-amber-100 px-1 font-mono text-[12px]">task_completions</code>
      </p>
      <p className="mt-0.5 text-[13px] text-amber-700">
        Run{" "}
        <code className="rounded bg-amber-100 px-1 font-mono text-[12px]">npm run db:push</code>
        {" "}then refresh. Checkboxes are disabled until the schema is up to date.
      </p>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-2.5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-400">
        {title}
        <span className="ml-2 text-zinc-300">{count}</span>
      </p>
    </div>
  );
}

function EmptyTasks() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-300"
        >
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      </div>
      <h2 className="mb-3 font-display text-[26px] font-normal tracking-[-0.01em] text-zinc-800">
        No tasks yet
      </h2>
      <p className="mb-8 max-w-[320px] text-[15px] leading-relaxed text-zinc-500">
        Analyze a document to generate action items and deadlines.
      </p>
      <Link
        href="/new"
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
      >
        Analyze a document →
      </Link>
    </div>
  );
}

// ─── types ───────────────────────────────────────────────────────────────────

type TaskItem = {
  documentId:   string;
  documentType: string;
  kind:         "action_item" | "deadline";
  taskIndex:    number;
  label:        string;
  meta?:        string;
  parsedDate?:  Date;
  done:         boolean;
  overdue:      boolean;
};

// ─── page ─────────────────────────────────────────────────────────────────────

type Props = { searchParams: Promise<{ show?: string }> };

export default async function TasksPage({ searchParams }: Props) {
  const { show } = await searchParams;
  const showCompleted = show === "all";

  // 1. Fetch documents
  let docs: { id: string; documentType: string; result: string }[] = [];
  try {
    docs = await db
      .select({ id: documents.id, documentType: documents.documentType, result: documents.result })
      .from(documents)
      .orderBy(desc(documents.createdAt))
      .limit(50);
  } catch (err) {
    return (
      <>
        <Topbar crumbs={["Tasks"]} />
        <div className="flex flex-1 flex-col overflow-y-auto bg-white">
          <div className="mx-6 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-800">
              {isTableMissing(err)
                ? "Documents table missing. Run npm run db:push then refresh."
                : "Failed to load documents. Check the server logs."}
            </p>
          </div>
        </div>
      </>
    );
  }

  // 2. Fetch completions — missing table is an expected dev-time state
  let completionKeys = new Set<string>();
  let completionsTableMissing = false;
  try {
    const rows = await db.select().from(taskCompletions);
    for (const r of rows) {
      completionKeys.add(`${r.documentId}:${r.kind}:${r.taskIndex}`);
    }
  } catch (err) {
    if (isTableMissing(err)) {
      completionsTableMissing = true;
    } else {
      console.error("[/tasks] Failed to load task_completions:", err);
    }
  }

  // 3. Derive tasks from stored result JSON
  const now = new Date();
  const deadlines: TaskItem[] = [];
  const actionItems: TaskItem[] = [];

  for (const doc of docs) {
    let parsed: {
      actionItems?: string[];
      deadlines?:   { description: string; date?: string }[];
    };
    try {
      parsed = JSON.parse(doc.result);
    } catch {
      continue;
    }

    for (let i = 0; i < (parsed.deadlines ?? []).length; i++) {
      const d = parsed.deadlines![i];
      const pd = parseDate(d.date);
      const done = completionKeys.has(`${doc.id}:deadline:${i}`);
      deadlines.push({
        documentId:   doc.id,
        documentType: doc.documentType,
        kind:         "deadline",
        taskIndex:    i,
        label:        d.description,
        meta:         pd ? formatDeadlineDate(pd) : d.date,
        parsedDate:   pd ?? undefined,
        done,
        overdue:      !!pd && pd < now && !done,
      });
    }

    for (let i = 0; i < (parsed.actionItems ?? []).length; i++) {
      actionItems.push({
        documentId:   doc.id,
        documentType: doc.documentType,
        kind:         "action_item",
        taskIndex:    i,
        label:        parsed.actionItems![i],
        done:         completionKeys.has(`${doc.id}:action_item:${i}`),
        overdue:      false,
      });
    }
  }

  // 4. Sort deadlines: overdue first, then upcoming by date, undated at bottom
  deadlines.sort((a, b) => {
    if (a.parsedDate && b.parsedDate) return a.parsedDate.getTime() - b.parsedDate.getTime();
    if (a.parsedDate) return -1;
    if (b.parsedDate) return 1;
    return 0;
  });

  const hasAnyTask = deadlines.length > 0 || actionItems.length > 0;
  const incompleteCount =
    deadlines.filter(t => !t.done).length + actionItems.filter(t => !t.done).length;

  const visibleDeadlines   = showCompleted ? deadlines   : deadlines.filter(t => !t.done);
  const visibleActionItems = showCompleted ? actionItems : actionItems.filter(t => !t.done);
  const hasVisibleTask = visibleDeadlines.length > 0 || visibleActionItems.length > 0;

  return (
    <>
      <Topbar crumbs={["Tasks"]} />
      <div className="flex flex-1 flex-col overflow-y-auto bg-white">
        {completionsTableMissing && <SchemaWarning />}

        {!hasAnyTask ? (
          <EmptyTasks />
        ) : (
          <>
            {/* Controls bar */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-400">
                {incompleteCount === 0
                  ? "All complete"
                  : `${incompleteCount} remaining`}
              </p>
              <Link
                href={showCompleted ? "/tasks" : "/tasks?show=all"}
                className="text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-700"
              >
                {showCompleted ? "Hide completed" : "Show completed"}
              </Link>
            </div>

            {!hasVisibleTask ? (
              /* All tasks done and hide-completed is on */
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-zinc-400">
                  All tasks complete.{" "}
                  <Link href="/tasks?show=all" className="font-medium text-zinc-600 hover:text-zinc-900">
                    Show completed →
                  </Link>
                </p>
              </div>
            ) : (
              <>
                {visibleDeadlines.length > 0 && (
                  <section>
                    <SectionHeader title="Deadlines" count={visibleDeadlines.length} />
                    <ul>
                      {visibleDeadlines.map((item) => (
                        <li key={`${item.documentId}:${item.taskIndex}`}>
                          <TaskRow
                            documentId={item.documentId}
                            kind="deadline"
                            taskIndex={item.taskIndex}
                            done={item.done}
                            disabled={completionsTableMissing}
                            overdue={item.overdue}
                            label={item.label}
                            meta={item.meta}
                            sourceLabel={item.documentType}
                            sourceHref={`/docs/${item.documentId}`}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {visibleActionItems.length > 0 && (
                  <section>
                    <SectionHeader title="Action items" count={visibleActionItems.length} />
                    <ul>
                      {visibleActionItems.map((item) => (
                        <li key={`${item.documentId}:${item.taskIndex}`}>
                          <TaskRow
                            documentId={item.documentId}
                            kind="action_item"
                            taskIndex={item.taskIndex}
                            done={item.done}
                            disabled={completionsTableMissing}
                            overdue={false}
                            label={item.label}
                            sourceLabel={item.documentType}
                            sourceHref={`/docs/${item.documentId}`}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
