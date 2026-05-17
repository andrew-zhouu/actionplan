export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, taskCompletions } from "@/lib/db/schema";
import { Topbar } from "@/components/shell/topbar";
import { CalendarView, type CalendarDeadline } from "@/components/calendar/calendar-view";
import { parseDate } from "@/lib/utils/dates";

// ─── helpers ─────────────────────────────────────────────────────────────────

function isTableMissing(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("no such table") ||
      err.message.toLowerCase().includes("sqlite_error"))
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateKey(d: Date): string {
  // Local-tz day key — deadlines are floating (no time component)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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
        {" "}then refresh. Completion state is hidden until the schema is up to date.
      </p>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function CalendarPage() {
  // 1. Fetch documents (same 50-row cap as /tasks) ─────────────────────────────
  let docs: { id: string; documentType: string; result: string }[] = [];
  try {
    docs = await db
      .select({
        id:           documents.id,
        documentType: documents.documentType,
        result:       documents.result,
      })
      .from(documents)
      .orderBy(desc(documents.createdAt))
      .limit(50);
  } catch (err) {
    return (
      <>
        <Topbar crumbs={["Calendar"]} />
        <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-50">
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

  // 2. Fetch completions — graceful degrade if table missing ──────────────────
  const completionKeys = new Set<string>();
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
      console.error("[/calendar] Failed to load task_completions:", err);
    }
  }

  // 3. Derive CalendarDeadline[] — only parseable-date deadlines ──────────────
  const deadlines: CalendarDeadline[] = [];
  for (const doc of docs) {
    let parsed: { deadlines?: { description: string; date?: string }[] };
    try {
      parsed = JSON.parse(doc.result);
    } catch {
      continue;
    }

    const list = parsed.deadlines ?? [];
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      if (!d || typeof d.description !== "string" || d.description.trim().length === 0) continue;
      const pd = parseDate(d.date);
      if (!pd) continue; // Unparseable dates stay on /tasks but don't land on the calendar
      deadlines.push({
        documentId:   doc.id,
        documentType: doc.documentType,
        taskIndex:    i,
        description:  d.description,
        rawDate:      d.date ?? "",
        dateKey:      toDateKey(pd),
        done:         completionKeys.has(`${doc.id}:deadline:${i}`),
      });
    }
  }

  return (
    <>
      <Topbar crumbs={["Calendar"]} />
      <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-50">
        {completionsTableMissing && <SchemaWarning />}
        {/* Suspense is required because CalendarView uses useSearchParams() */}
        <Suspense fallback={null}>
          <CalendarView deadlines={deadlines} />
        </Suspense>
      </div>
    </>
  );
}
