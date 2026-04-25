export const dynamic = "force-dynamic";

import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { Topbar } from "@/components/shell/topbar";

// ─── helpers ────────────────────────────────────────────────────────────────

type ComplexityLevel = "Low" | "Medium" | "High";

const COMPLEXITY_COLORS: Record<ComplexityLevel, string> = {
  Low:    "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  High:   "bg-red-100 text-red-800",
};

function formatDate(date: Date): string {
  const now     = new Date();
  const diffMs  = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours   = Math.floor(diffMs / 3_600_000);
  const days    = Math.floor(diffMs / 86_400_000);

  if (minutes < 1)  return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours   < 24) return `${hours}h ago`;
  if (days    <  7) return `${days}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

function getSummary(resultJson: string): string {
  try {
    const r = JSON.parse(resultJson) as { summary?: string };
    const s = r.summary ?? "";
    return s.length > 140 ? s.slice(0, 140).trimEnd() + "…" : s;
  } catch {
    return "";
  }
}

// ─── empty state ────────────────────────────────────────────────────────────

function EmptyInbox() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-300"
        >
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
        </svg>
      </div>
      <h2 className="mb-3 font-display text-[26px] font-normal tracking-[-0.01em] text-zinc-800">
        Your inbox is empty
      </h2>
      <p className="mb-8 max-w-[340px] text-[15px] leading-relaxed text-zinc-500">
        Paste any complex document and ActionPlan extracts what you need to
        do, by when, and what to watch out for.
      </p>
      <Link
        href="/new"
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
      >
        Analyze your first document →
      </Link>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

type Row = {
  id:           string;
  createdAt:    Date;
  documentType: string;
  complexity:   string;
  result:       string;
};

export default async function InboxPage() {
  let rows: Row[] = [];

  try {
    rows = await db
      .select({
        id:           documents.id,
        createdAt:    documents.createdAt,
        documentType: documents.documentType,
        complexity:   documents.complexity,
        result:       documents.result,
      })
      .from(documents)
      .orderBy(desc(documents.createdAt))
      .limit(50);
  } catch {
    // DB not yet initialised or unavailable — fall through to empty state
  }

  return (
    <>
      <Topbar crumbs={["Inbox"]} />
      <div className="flex flex-1 flex-col overflow-y-auto bg-white">
        {rows.length === 0 ? (
          <EmptyInbox />
        ) : (
          <>
            {/* list header */}
            <div className="border-b border-zinc-100 px-6 py-3">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-400">
                {rows.length} {rows.length === 1 ? "document" : "documents"}
              </p>
            </div>

            {/* rows */}
            <ul>
              {rows.map((row) => {
                const summary = getSummary(row.result);
                const badgeClass =
                  COMPLEXITY_COLORS[row.complexity as ComplexityLevel] ??
                  "bg-zinc-100 text-zinc-500";

                return (
                  <li key={row.id}>
                    <Link
                      href={`/docs/${row.id}`}
                      className="group flex gap-4 border-b border-zinc-100 px-6 py-4 transition-colors hover:bg-zinc-50 last:border-b-0"
                    >
                      {/* main content */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}
                          >
                            {row.complexity}
                          </span>
                          <span className="truncate text-sm font-medium text-zinc-900 group-hover:text-zinc-700">
                            {row.documentType}
                          </span>
                        </div>
                        {summary && (
                          <p className="text-[13px] leading-relaxed text-zinc-500 line-clamp-2">
                            {summary}
                          </p>
                        )}
                      </div>

                      {/* date */}
                      <div className="shrink-0 pt-px">
                        <span className="font-mono text-[10.5px] text-zinc-400">
                          {formatDate(row.createdAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
