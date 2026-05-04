export const dynamic = "force-dynamic";

import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { documents, taskCompletions } from "@/lib/db/schema";
import { Topbar } from "@/components/shell/topbar";
import { COMPLEXITY_COLORS } from "@/lib/constants";
import { parseDate } from "@/lib/utils/dates";

// ─── helpers ─────────────────────────────────────────────────────────────────

function isTableMissing(err: unknown): boolean {
  return err instanceof Error && err.message.includes("no such table");
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Tuesday, April 28" — used in the greeting line. */
function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });
}

function daysFromNow(date: Date, now: Date): number {
  return Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function overdueLabel(date: Date, now: Date): string {
  const d = Math.abs(daysFromNow(date, now));
  if (d === 0) return "due today";
  return d === 1 ? "1 day overdue" : `${d} days overdue`;
}

function upcomingLabel(date: Date, now: Date): string {
  const d = daysFromNow(date, now);
  if (d === 0) return "due today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}

function formatCompletedAt(date: Date, now: Date): string {
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7)  return `${days} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Words that indicate a snippet ends on an incomplete thought.
 * riskSnippet appends "..." when the clipped snippet's last word is in this set.
 */
const INCOMPLETE_LAST_WORDS = new Set([
  // Articles
  "a", "an", "the",
  // Coordinating conjunctions
  "and", "or", "but", "nor", "so", "yet",
  // Subordinating conjunctions
  "because", "since", "while", "when", "that", "which", "who", "whom",
  "if", "unless", "until", "after", "before", "although", "though",
  // Common prepositions
  "of", "in", "on", "at", "by", "for", "to", "from", "with", "about",
  "without", "through", "into", "onto", "upon", "over", "under",
  "between", "among", "against", "beyond", "during", "per",
  // Modals
  "may", "might", "will", "would", "could", "should", "must", "shall", "can",
  // Auxiliaries that signal continuation
  "is", "are", "was", "were", "be", "been", "have", "has", "had",
  "do", "does", "did",
  // Common risk-context verbs that feel incomplete as a final word
  "require", "requires",
  "forfeit", "forfeits",
  "void", "voids",
  "trigger", "triggers",
  "apply", "applies",
  "result", "results",
  "affect", "affects",
  "cause", "causes",
  "mean", "means",
  "prevent", "prevents",
  "limit", "limits",
  "allow", "allows",
  "include", "includes",
  "involve", "involves",
  "permit", "permits",
]);

/**
 * Returns a concise, label-style snippet from a risk string.
 * Purely deterministic — no model calls, no extra API usage.
 *
 * Shaping rules (applied in order):
 *   1. "If [condition], [consequence]" → extract the consequence clause,
 *      since that is the actual risk signal.
 *   2. "If you do not/don't/fail to/miss…" with no comma → strip the weak
 *      conditional opener to get a more direct imperative fragment.
 *   3. Strip known attribution/hedge lead-ins: "The email says…",
 *      "It is unclear whether…", "Note that…", etc.
 *   4. Capitalize the result.
 *   5. Return the first complete sentence if it fits within maxLen.
 *   6. Clip at the last clause break (,  ;  —) or word boundary, no ellipsis.
 *
 * Note: transformations that require semantic understanding (e.g. rewriting
 * a conditional fragment into a positive label) cannot be done without a
 * model pass and are explicitly out of scope here.
 */
function riskSnippet(text: string, maxLen = 90): string {
  let s = text.trim();

  // Rule 1 — Conditional consequence extraction.
  // "If [anything], [consequence ≥ 15 chars]" → keep only the consequence.
  const condWithResult = s.match(/^if\s+.+?,\s*(.{15,})/i);
  if (condWithResult) {
    s = condWithResult[1].trim();
  } else if (/^if\s+you\s+(do\s+not|don't|fail\s+to|miss|cannot|can't)\s+/i.test(s)) {
    // Rule 2 — Strip "If you do not / don't / fail to …" opener.
    s = s.replace(/^if\s+you\s+(do\s+not|don't|fail\s+to|miss|cannot|can't)\s+/i, "");
  }

  // Rule 3 — Strip known attribution and hedge lead-ins.
  const LEAD_INS: RegExp[] = [
    /^the\s+(?:email|lease|contract|document|agreement|letter|policy)\s+(?:says|states|notes|indicates|mentions|warns|requires)[:\s]+/i,
    /^it\s+is\s+(?:unclear|ambiguous|worth\s+noting|important\s+to\s+note)\s+(?:whether|if|that)\s+/i,
    /^(?:please\s+)?note\s+that\s+/i,
    /^be\s+aware\s+that\s+/i,
    /^you\s+(?:must|should|need\s+to)\s+(?:ensure|note)\s+that\s+/i,
  ];
  for (const re of LEAD_INS) {
    const stripped = s.replace(re, "");
    if (stripped !== s && stripped.length > 10) { s = stripped; break; }
  }

  // Rule 4 — Capitalize.
  if (s.length > 0) s = s.charAt(0).toUpperCase() + s.slice(1);

  // Rule 5 — Full sentence if it fits (already has terminal punctuation, no tail needed).
  const sentence = s.match(/^[^.!?]+[.!?]/);
  if (sentence && sentence[0].length <= maxLen) return sentence[0].trim();

  // withTail: append "..." when the snippet's last word signals an incomplete thought.
  // Sentence-terminated snippets (Rule 5) are excluded — they already end cleanly.
  function withTail(snippet: string): string {
    const lastWord = snippet.split(/\s+/).pop()
      ?.toLowerCase().replace(/[.,;:!?'")\]]+$/, "") ?? "";
    return INCOMPLETE_LAST_WORDS.has(lastWord) ? snippet + "..." : snippet;
  }

  if (s.length <= maxLen) return withTail(s.trim());

  // Rule 6 — Clause break or word boundary.
  const slice = s.slice(0, maxLen);
  const clauseAt = Math.max(
    slice.lastIndexOf(","),
    slice.lastIndexOf(";"),
    slice.lastIndexOf(" —"),
  );
  if (clauseAt > maxLen * 0.5) return withTail(slice.slice(0, clauseAt).trimEnd());
  const spaceAt = slice.lastIndexOf(" ");
  return withTail((spaceAt > 0 ? slice.slice(0, spaceAt) : slice).trimEnd());
}

// ─── types ───────────────────────────────────────────────────────────────────

type DeadlineItem = {
  description:  string;
  parsedDate:   Date;
  documentId:   string;
  documentType: string;
  complexity:   string; // sourced from the parent document
};

type RiskItem = {
  text:         string;
  documentId:   string;
  documentType: string;
  riskIndex:    number; // position in the source document's risks array
};

/** Risks grouped by source document — for the structured rail display. */
type RiskGroup = {
  documentId:   string;
  documentType: string;
  items:        { text: string; riskIndex: number }[];
};

type ActiveDoc = {
  id:           string;
  documentType: string;
  complexity:   string;
  openCount:    number;
};

type CompletionItem = {
  description:  string;
  documentId:   string;
  documentType: string;
  completedAt:  Date;
};

// ─── ui pieces ───────────────────────────────────────────────────────────────

/**
 * Stacked month-abbreviation + day-number block for deadline list rows.
 * Mirrors the prototype's date column: gives list rows clear visual weight.
 */
function DateBlock({ date, urgent = false }: { date: Date; urgent?: boolean }) {
  return (
    <div className="w-9 shrink-0 text-center">
      <p className={`text-[9px] font-bold uppercase leading-none tracking-wide ${
        urgent ? "text-red-400" : "text-zinc-400"
      }`}>
        {date.toLocaleDateString("en-US", { month: "short" })}
      </p>
      <p className={`mt-0.5 text-[20px] font-bold leading-none tabular-nums ${
        urgent ? "text-red-600" : "text-zinc-800"
      }`}>
        {date.getDate()}
      </p>
    </div>
  );
}

// ─── constants ───────────────────────────────────────────────────────────────

const UPCOMING_MAX    = 8;
const ACTIVE_MAX      = 5;
const MAX_RISKS       = 8; // slightly higher — grouped display can show more
const MAX_COMPLETIONS = 5;
const FOURTEEN_DAYS   = 14 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS      =  7 * 24 * 60 * 60 * 1000;

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const now = new Date();

  // 1. Fetch documents
  type RawDoc = {
    id:           string;
    createdAt:    Date;
    documentType: string;
    complexity:   string;
    result:       string;
  };
  let rawDocs: RawDoc[] = [];
  let fetchError = false;

  try {
    rawDocs = await db
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
  } catch (err) {
    if (!isTableMissing(err)) fetchError = true;
  }

  if (fetchError) {
    return (
      <>
        <Topbar crumbs={["Dashboard"]} />
        <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-50">
          <div className="mx-6 mt-5 max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-800">
              Failed to load dashboard. Check the server logs.
            </p>
          </div>
        </div>
      </>
    );
  }

  // 2. Fetch completions — capture completedAt for "recently done" section
  const doneKeys       = new Set<string>();
  const completedAtMap = new Map<string, Date>();
  try {
    const rows = await db.select().from(taskCompletions);
    for (const r of rows) {
      const key = `${r.documentId}:${r.kind}:${r.taskIndex}`;
      doneKeys.add(key);
      completedAtMap.set(key, r.completedAt);
    }
  } catch {
    // Missing table — doneKeys stays empty.
  }

  // 3. Single-pass derivation.
  //    Upcoming window = 14 days. Complexity is threaded into DeadlineItem
  //    so deadline rows can show the source document's complexity badge.
  const overdue:        DeadlineItem[] = [];
  const upcoming:       DeadlineItem[] = [];
  const risks:          RiskItem[]     = [];
  const allCompletions: CompletionItem[] = [];
  const activeDocIds    = new Set<string>();
  const openTasksPerDoc = new Map<string, number>();
  let totalTaskCount = 0;
  let doneTaskCount  = 0;

  for (const doc of rawDocs) {
    let parsed: {
      actionItems?: string[];
      deadlines?:   { description: string; date?: string }[];
      risks?:       string[];
    };
    try {
      parsed = JSON.parse(doc.result);
    } catch {
      continue;
    }

    const deadlines = parsed.deadlines ?? [];
    for (let i = 0; i < deadlines.length; i++) {
      const d    = deadlines[i];
      const pd   = parseDate(d.date);
      const key  = `${doc.id}:deadline:${i}`;
      const done = doneKeys.has(key);

      totalTaskCount++;

      if (done) {
        doneTaskCount++;
        const completedAt = completedAtMap.get(key);
        if (completedAt) {
          allCompletions.push({
            description:  d.description,
            documentId:   doc.id,
            documentType: doc.documentType,
            completedAt,
          });
        }
      } else {
        activeDocIds.add(doc.id);
        openTasksPerDoc.set(doc.id, (openTasksPerDoc.get(doc.id) ?? 0) + 1);
      }

      if (!pd || done) continue;

      const item: DeadlineItem = {
        description:  d.description,
        parsedDate:   pd,
        documentId:   doc.id,
        documentType: doc.documentType,
        complexity:   doc.complexity,
      };

      if (pd < now) {
        overdue.push(item);
      } else if (pd.getTime() - now.getTime() <= FOURTEEN_DAYS) {
        upcoming.push(item);
      }
    }

    const actionItems = parsed.actionItems ?? [];
    for (let i = 0; i < actionItems.length; i++) {
      const key  = `${doc.id}:action_item:${i}`;
      const done = doneKeys.has(key);

      totalTaskCount++;

      if (done) {
        doneTaskCount++;
        const completedAt = completedAtMap.get(key);
        if (completedAt) {
          allCompletions.push({
            description:  actionItems[i],
            documentId:   doc.id,
            documentType: doc.documentType,
            completedAt,
          });
        }
      } else {
        activeDocIds.add(doc.id);
        openTasksPerDoc.set(doc.id, (openTasksPerDoc.get(doc.id) ?? 0) + 1);
      }
    }

    if (risks.length < MAX_RISKS) {
      const docRisks = parsed.risks ?? [];
      for (let ri = 0; ri < docRisks.length; ri++) {
        if (risks.length >= MAX_RISKS) break;
        risks.push({ text: docRisks[ri], documentId: doc.id, documentType: doc.documentType, riskIndex: ri });
      }
    }
  }

  // 4. Sort
  // Overdue: oldest first (longest outstanding at top).
  // Upcoming: soonest first; when dates tie, High complexity beats Medium beats Low.
  const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
  overdue.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  upcoming.sort((a, b) => {
    const dateDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    return (PRIORITY_ORDER[a.complexity] ?? 3) - (PRIORITY_ORDER[b.complexity] ?? 3);
  });

  const recentCompletions: CompletionItem[] = allCompletions
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, MAX_COMPLETIONS);

  // 5. Active docs — open work in recency order; falls back to most-recent
  const activeDocs: ActiveDoc[] = rawDocs
    .filter(d => activeDocIds.has(d.id))
    .slice(0, ACTIVE_MAX)
    .map(d => ({
      id:           d.id,
      documentType: d.documentType,
      complexity:   d.complexity,
      openCount:    openTasksPerDoc.get(d.id) ?? 0,
    }));
  const displayDocs: ActiveDoc[] = activeDocs.length > 0
    ? activeDocs
    : rawDocs.slice(0, ACTIVE_MAX).map(d => ({
        id:           d.id,
        documentType: d.documentType,
        complexity:   d.complexity,
        openCount:    0,
      }));
  const docsLabel = activeDocs.length > 0 ? "Active documents" : "Recent documents";

  // 6. Group risks by document for the structured rail display.
  //    Each group has a document-name header and left-border-accented items.
  const riskGroups: RiskGroup[] = [];
  for (const risk of risks) {
    const g = riskGroups.find(g => g.documentId === risk.documentId);
    if (g) {
      g.items.push({ text: risk.text, riskIndex: risk.riskIndex });
    } else {
      riskGroups.push({
        documentId:   risk.documentId,
        documentType: risk.documentType,
        items:        [{ text: risk.text, riskIndex: risk.riskIndex }],
      });
    }
  }

  // 7. Derived display values
  const openTaskCount     = totalTaskCount - doneTaskCount;
  const completionPct     = totalTaskCount > 0 ? Math.round((doneTaskCount / totalTaskCount) * 100) : 0;
  const hasAnyDocs        = rawDocs.length > 0;
  const visibleUpcoming   = upcoming.slice(0, UPCOMING_MAX);
  const hiddenUpcoming    = upcoming.length - UPCOMING_MAX;

  // Urgency count: overdue + items due within 7 days
  const weekDeadlines = upcoming.filter(item => item.parsedDate.getTime() - now.getTime() <= SEVEN_DAYS);
  const urgentCount   = overdue.length + weekDeadlines.length;

  // Large computed headline — the anchor of the structural header
  const headlineText =
    urgentCount > 0
      ? `${urgentCount} ${urgentCount === 1 ? "thing needs" : "things need"} your attention.`
      : doneTaskCount === totalTaskCount && totalTaskCount > 0
      ? "All caught up — nothing outstanding."
      : upcoming.length > 0
      ? `${upcoming.length} deadline${upcoming.length === 1 ? "" : "s"} in the next 14 days.`
      : "No upcoming deadlines right now.";

  // Time-based greeting — real clock data, no fake user profile needed
  const hour     = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Stat cards with sub-lines — all derivable from existing computed values
  const statCards = [
    {
      label:   "Overdue",
      value:   overdue.length,
      subline: overdue[0]
        ? `oldest: ${formatShortDate(overdue[0].parsedDate)}`
        : "none right now",
      urgent:  overdue.length > 0,
    },
    {
      label:   "Due soon",
      value:   upcoming.length,
      subline: upcoming[0]
        ? `next: ${formatShortDate(upcoming[0].parsedDate)}`
        : "none in 14 days",
      urgent:  false,
    },
    {
      label:   "Open tasks",
      value:   openTaskCount,
      subline: activeDocIds.size > 0
        ? `across ${activeDocIds.size} doc${activeDocIds.size === 1 ? "" : "s"}`
        : totalTaskCount > 0 ? "all complete" : "none yet",
      urgent:  false,
    },
    {
      label:   "Completed",
      value:   doneTaskCount,
      subline: totalTaskCount > 0 ? `of ${totalTaskCount} total` : "none yet",
      urgent:  false,
    },
  ] as const;

  return (
    <>
      <Topbar crumbs={["Dashboard"]} />

      <div className="flex-1 overflow-y-auto">

        {/* ── STRUCTURAL HEADER ─────────────────────────────────────────────
            Full-bleed white band with hard border-b. Contains the computed
            headline and stat cards. This is the page's visual ground floor —
            everything in the content body hangs below it. */}
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-6">

            {/* Greeting row */}
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.15em] text-zinc-400">
                  {greeting} · {formatHeaderDate(now)}
                </p>
                <h1 className="mt-2 font-display text-[36px] font-normal leading-[1.1] tracking-[-0.01em] text-zinc-900">
                  {headlineText}
                </h1>
              </div>
              <Link
                href="/new"
                className="mt-1 shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-zinc-700"
              >
                + New document
              </Link>
            </div>

            {/* Stat cards — 2-col on mobile, 4-col on sm+.
                Each card: mono label + large number + sub-line.
                Matches the prototype's bordered 4-card stat strip. */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statCards.map(({ label, value, subline, urgent }) => (
                <div
                  key={label}
                  className={`rounded-xl border px-5 py-4 ${
                    urgent ? "border-red-100 bg-red-50" : "border-zinc-200 bg-white"
                  }`}
                >
                  <p className={`font-mono text-[9.5px] uppercase tracking-[0.12em] ${
                    urgent ? "text-red-400" : "text-zinc-400"
                  }`}>
                    {label}
                  </p>
                  <p className={`mt-1.5 text-[26px] font-bold leading-none tabular-nums ${
                    urgent ? "text-red-600" : "text-zinc-900"
                  }`}>
                    {value}
                  </p>
                  <p className={`mt-1.5 text-[11px] ${
                    urgent ? "text-red-400" : "text-zinc-400"
                  }`}>
                    {subline}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── CONTENT BODY ──────────────────────────────────────────────────
            Zinc-50 background. White module panels read as lifted surfaces. */}
        <div className="bg-zinc-50">
          <div className="mx-auto max-w-5xl px-6 py-8">

            {/* Empty state */}
            {!hasAnyDocs && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="mb-6 max-w-sm text-[15px] leading-relaxed text-zinc-500">
                  Analyze a document to see your deadlines and action items here.
                </p>
                <Link
                  href="/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
                >
                  Analyze a document →
                </Link>
              </div>
            )}

            {hasAnyDocs && (
              <div className="space-y-6">

                {/* ── TWO-COLUMN BODY ───────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-6 lg:items-start lg:grid-cols-[1fr_340px]">

                  {/* LEFT / PRIMARY COLUMN ─────────────────────────────── */}
                  <div className="space-y-5">

                    {/* Overdue callout — compact, shown only when overdue > 0 */}
                    {overdue.length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-red-200">
                        <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-4 py-2.5">
                          <h2 className="text-[12.5px] font-semibold text-red-900">Overdue</h2>
                          <span className="font-mono text-[11px] font-bold text-red-500">
                            {overdue.length}
                          </span>
                        </div>
                        <ul className="divide-y divide-red-50 bg-white">
                          {overdue.map((item, i) => (
                            <li key={i} className="flex items-start gap-4 px-4 py-3">
                              <DateBlock date={item.parsedDate} urgent />
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium leading-snug text-zinc-900">
                                  {item.description}
                                </p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span className="text-[11px] font-medium text-red-400">
                                    {overdueLabel(item.parsedDate, now)}
                                  </span>
                                  <span className="select-none text-red-200">·</span>
                                  <Link
                                    href={`/docs/${item.documentId}`}
                                    className="text-[11px] text-zinc-400 transition-colors hover:text-zinc-700"
                                  >
                                    {item.documentType}
                                  </Link>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next 14 days — the main operational panel */}
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3.5">
                        <div>
                          <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-zinc-400">
                            Upcoming
                          </p>
                          <h2 className="mt-0.5 text-[14px] font-semibold text-zinc-900">
                            Next 14 days
                          </h2>
                        </div>
                        <Link
                          href="/tasks?type=deadlines"
                          className="text-[12px] font-medium text-zinc-600 transition-colors hover:text-zinc-900"
                        >
                          View all →
                        </Link>
                      </div>

                      {upcoming.length === 0 ? (
                        <div className="px-4 py-8">
                          <p className="text-[13px] text-zinc-400">
                            No deadlines in the next 14 days.
                          </p>
                        </div>
                      ) : (
                        <>
                          <ul className="divide-y divide-zinc-100">
                            {visibleUpcoming.map((item, i) => (
                              <li key={i} className="flex items-start gap-4 px-4 py-3">
                                <DateBlock date={item.parsedDate} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] font-medium leading-snug text-zinc-900">
                                    {item.description}
                                  </p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className="text-[11px] text-zinc-500">
                                      {item.documentType}
                                    </span>
                                    <span className="select-none text-zinc-300">·</span>
                                    <span className="text-[11px] text-zinc-400">
                                      {upcomingLabel(item.parsedDate, now)}
                                    </span>
                                    {item.complexity === "High" && (
                                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-amber-700">
                                        high
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                          {hiddenUpcoming > 0 && (
                            <div className="border-t border-zinc-100 px-4 py-3">
                              <Link
                                href="/tasks?type=deadlines"
                                className="text-[12px] font-medium text-zinc-600 transition-colors hover:text-zinc-900"
                              >
                                +{hiddenUpcoming} more · View all tasks →
                              </Link>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                  </div>

                  {/* RIGHT RAIL ────────────────────────────────────────────
                      Stacked framed modules. Risks are grouped by source
                      document with left-border accents — matches the
                      prototype's structured right column. */}
                  <div className="space-y-5">

                    {/* Risks to watch — neutral container, per-item amber accents.
                        Scrollable content prevents the rail from expanding to
                        match the left column, eliminating the blank-space problem. */}
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                      {/* Neutral header — no amber wash */}
                      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                        <div>
                          <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-zinc-400">
                            Risks to watch
                          </p>
                          <h3 className="mt-0.5 text-[13px] font-semibold text-zinc-800">
                            Across all documents
                          </h3>
                        </div>
                        {risks.length > 0 && (
                          <span className="font-mono text-[11px] font-semibold text-zinc-400">
                            {risks.length}
                          </span>
                        )}
                      </div>
                      {riskGroups.length === 0 ? (
                        <div className="px-4 py-5">
                          <p className="text-[12.5px] text-zinc-400">
                            No risks flagged in recent documents.
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100">
                          {riskGroups.map((group) => (
                            <div key={group.documentId} className="px-4 py-4">
                              {/* Document group header — slightly stronger so the group
                                  structure reads clearly above the card stack below. */}
                              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-500">
                                {group.documentType}
                              </p>
                              {/* Risk cards — clickable, first-sentence only.
                                  Full detail deferred to the document workspace. */}
                              <div className="space-y-2.5">
                                {group.items.map((item, i) => (
                                  <Link
                                    key={i}
                                    href={`/docs/${group.documentId}?tab=risks&risk=${item.riskIndex}`}
                                    className="group flex overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 transition-colors hover:border-amber-200 hover:bg-amber-50/40"
                                  >
                                    {/* Amber accent bar */}
                                    <div className="w-1 shrink-0 bg-amber-400" />
                                    {/* Two-tier card interior: risk snippet (primary) + affordance (secondary) */}
                                    <div className="flex-1 px-3 py-3">
                                      <p className="text-[12.5px] leading-snug text-zinc-800 group-hover:text-zinc-900">
                                        {riskSnippet(item.text)}
                                      </p>
                                      <p className="mt-1.5 text-[10.5px] text-zinc-400 transition-colors group-hover:text-zinc-600">
                                        View risk →
                                      </p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                      <div className="border-b border-zinc-100 px-4 py-3">
                        <h3 className="text-[12.5px] font-semibold text-zinc-700">Progress</h3>
                      </div>
                      <div className="px-4 py-4">
                        {totalTaskCount === 0 ? (
                          <p className="text-[13px] text-zinc-400">No tasks found.</p>
                        ) : (
                          <>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-display text-[32px] font-normal leading-none text-zinc-900">
                                {doneTaskCount}
                              </span>
                              <span className="text-[13px] text-zinc-500">
                                / {totalTaskCount}
                              </span>
                              <span className="ml-auto font-mono text-[13px] font-semibold text-zinc-500">
                                {completionPct}%
                              </span>
                            </div>
                            <div className="mt-3 space-y-1.5 text-[12.5px] text-zinc-500">
                              {openTaskCount > 0 && (
                                <p>{openTaskCount} task{openTaskCount === 1 ? "" : "s"} remaining</p>
                              )}
                              {activeDocs.length > 0 && (
                                <p>
                                  {activeDocs.length} doc{activeDocs.length === 1 ? "" : "s"} with open work
                                </p>
                              )}
                              {overdue.length > 0 && (
                                <p className="font-semibold text-red-500">
                                  {overdue.length} deadline{overdue.length === 1 ? "" : "s"} overdue
                                </p>
                              )}
                              {doneTaskCount === totalTaskCount && (
                                <p className="font-semibold text-zinc-600">All tasks complete.</p>
                              )}
                            </div>
                            <Link
                              href="/tasks"
                              className="mt-4 block text-[12px] text-zinc-400 transition-colors hover:text-zinc-700"
                            >
                              View all tasks →
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                  {/* end right rail */}

                </div>
                {/* end two-column body */}

                {/* ── LOWER SECTION ─────────────────────────────────────────
                    Quieter supporting tier. border-t creates visual separation
                    from the primary body above. */}
                <div className="grid grid-cols-1 gap-6 border-t border-zinc-200 pt-6 sm:grid-cols-2">

                  {/* Active / Recent documents */}
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    <div className="border-b border-zinc-100 px-4 py-2.5">
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                        {docsLabel}
                      </h3>
                    </div>
                    {displayDocs.length === 0 ? (
                      <div className="px-4 py-4">
                        <p className="text-[12.5px] text-zinc-400">No documents found.</p>
                      </div>
                    ) : (
                      <>
                        <ul className="divide-y divide-zinc-100">
                          {displayDocs.map((doc) => (
                            <li key={doc.id}>
                              <Link
                                href={`/docs/${doc.id}`}
                                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50"
                              >
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    COMPLEXITY_COLORS[doc.complexity] ?? "bg-zinc-100 text-zinc-500"
                                  }`}
                                >
                                  {doc.complexity}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[12.5px] font-medium text-zinc-800">
                                    {doc.documentType}
                                  </p>
                                  {doc.openCount > 0 && (
                                    <p className="text-[11px] text-zinc-400">
                                      {doc.openCount} task{doc.openCount === 1 ? "" : "s"} open
                                    </p>
                                  )}
                                </div>
                                <span className="text-[11px] text-zinc-300">→</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <div className="border-t border-zinc-100 px-4 py-2.5">
                          <Link
                            href="/"
                            className="text-[11.5px] text-zinc-400 transition-colors hover:text-zinc-700"
                          >
                            Open inbox →
                          </Link>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Recently completed */}
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    <div className="border-b border-zinc-100 px-4 py-2.5">
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                        Recently done
                      </h3>
                    </div>
                    {recentCompletions.length === 0 ? (
                      <div className="px-4 py-4">
                        <p className="text-[12.5px] text-zinc-400">No tasks completed yet.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-zinc-100">
                        {recentCompletions.map((item, i) => (
                          <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-zinc-700 bg-zinc-800">
                              <svg
                                width="8" height="8" viewBox="0 0 24 24"
                                fill="none" stroke="white"
                                strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] leading-snug text-zinc-700 line-clamp-2">
                                {item.description}
                              </p>
                              <p className="mt-0.5 text-[11px] text-zinc-400">
                                {item.documentType} · {formatCompletedAt(item.completedAt, now)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                </div>
                {/* end lower section */}

              </div>
            )}

          </div>
        </div>

      </div>
    </>
  );
}
