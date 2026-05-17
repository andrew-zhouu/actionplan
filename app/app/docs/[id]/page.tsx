import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, taskCompletions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { DocProcessingPage } from "@/components/docs/doc-processing-page";
import type { AnalysisResult } from "@/types/analysis";
import { Topbar } from "@/components/shell/topbar";
import { DocWorkspace } from "@/components/workspace/doc-workspace";
import { StartHereCard, type StartHereProps } from "@/components/docs/start-here-card";
import { parseDate, formatDeadlineDate } from "@/lib/utils/dates";

// ─── helpers ──────────────────────────────────────────────────────────────────

function isTableMissing(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("no such table") ||
      err.message.toLowerCase().includes("sqlite_error"))
  );
}

/**
 * Conservative title clean-up for deadline labels surfaced in the Next step
 * card. Removes trailing date phrases like "by April 15", "before May 1",
 * "due April 15" — the support line already conveys urgency, so repeating the
 * date in the title is pure duplication and contributes to visual heaviness.
 *
 * Only trims at the end of the string and only when the raw date matches
 * exactly, so the meaning is preserved in edge cases (mid-sentence dates,
 * different formatting). Falls back to the original text if the trim would
 * leave nothing behind.
 */
function trimTrailingDatePhrase(text: string, rawDate: string | undefined): string {
  if (!rawDate) return text;
  const escapedDate = rawDate.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\s+(?:by|before|on|until|due(?:\\s+by)?|no\\s+later\\s+than)\\s+${escapedDate}[.,;:!?]?\\s*$`,
    "i",
  );
  const cleaned = text.replace(pattern, "").replace(/[.,;:]+$/, "").trim();
  return cleaned || text;
}

/**
 * Strip leading "subject + modal" phrases so the title reads as an imperative
 * action. Common in AI-extracted task sentences:
 *   "Andrew must respond"          → "Respond"
 *   "You should submit Form A4"    → "Submit Form A4"
 *   "It is important to call"      → "Call"
 *   "The applicant must reply"     → "Reply"
 * Falls back to the original text when no pattern matches, so already-imperative
 * titles stay intact ("Submit Form A4" → "Submit Form A4").
 */
function makeImperative(text: string): string {
  const patterns: RegExp[] = [
    // Proper-name subject (1–3 capitalized tokens) + modal
    /^(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:must|should|needs?\s+to|has\s+to|have\s+to|will\s+need\s+to|will\s+have\s+to|will|shall)\s+/,
    // Pronoun subject + modal
    /^(?:You|They|We|He|She|It|I)\s+(?:must|should|needs?\s+to|need\s+to|have\s+to|has\s+to|will\s+need\s+to|will|shall)\s+/i,
    // "It is important/required/necessary to" — modal-flavored opening
    /^It\s+(?:is|will\s+be)\s+(?:important|necessary|required|critical|essential|advisable|recommended)\s+to\s+/i,
    // "The [role] must/should" — generic actor framing
    /^The\s+[a-z]+\s+(?:must|should|needs?\s+to|has\s+to|have\s+to|will|shall)\s+/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const rest = text.slice(match[0].length);
      if (rest.length === 0) continue;
      // Re-capitalize the first letter of the remaining verb phrase
      return rest.charAt(0).toUpperCase() + rest.slice(1);
    }
  }

  return text;
}

/**
 * Split off a trailing consequence/qualifier clause. Returns the head clause
 * and the raw consequence string (or null if none found).
 *
 * - "or else X" / "otherwise X": strong consequence indicators, matched loosely
 *   ("Apply or else lose your spot" → head: "Apply", consequence: "or else lose your spot")
 *
 * - "before X" / "until X": matched ONLY when the clause starts with a pronoun
 *   or article + word, so trailing date phrases like "before May 1" don't
 *   false-trigger here (trimTrailingDatePhrase handles those when the parsed
 *   date is available).
 */
function extractConsequence(text: string): { head: string; consequence: string | null } {
  const patterns: RegExp[] = [
    // "or else X" / "otherwise X"
    /^(.+?)[,;]?\s+((?:or\s+else|otherwise)\s+.+?)\.?\s*$/i,
    // "before X" / "until X" — clause must start with pronoun/article + word
    /^(.+?)[,;]?\s+((?:before|until)\s+(?:they|we|he|she|it|you|i|the|a|an|that|this)\s+\w+(?:\s+\w+)*)\.?\s*$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const head        = match[1].trim().replace(/[.,;:]+$/, "");
      const consequence = match[2].trim();
      if (head.length === 0) continue;
      return { head, consequence };
    }
  }

  return { head: text, consequence: null };
}

/**
 * Reformat an extracted consequence clause for use as a support-line phrase.
 *   "before they notify Duke and UNC" → "Before they notify Duke and UNC"
 *   "until they confirm"              → "Until they confirm"
 *   "or else lose your spot"          → "Lose your spot"
 *   "otherwise miss the deadline"     → "Miss the deadline"
 *
 * Conservative: capitalizes the first letter and strips "or else" / "otherwise"
 * prefixes (which read awkward at the start of a standalone fragment). Leaves
 * "before" / "until" prefixes intact since they carry the conditional meaning
 * naturally.
 */
function rewriteConsequence(raw: string): string {
  const text = raw.trim().replace(/^(?:or\s+else|otherwise)\s+/i, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Deterministic ranking that chooses the single top-priority task for the
 * Start Here card. Open tasks only (anything in `completionKeys` is dropped).
 *
 * Ordering:
 *   1. Dated deadlines, by parsedDate ASC
 *      (most-overdue first, then earliest-upcoming — single sort, no buckets)
 *   2. Undated deadlines, in document order
 *   3. Action items, in document order
 *
 * Same input ⇒ same top task across renders, so the card never flips
 * unexpectedly between visits.
 */
function buildStartHere(
  result:         AnalysisResult,
  documentId:     string,
  completionKeys: Set<string>,
): StartHereProps {
  type Candidate =
    | { kind: "deadline";    index: number; description: string; date: string | undefined; parsed: Date | null }
    | { kind: "action_item"; index: number; label: string };

  const candidates: Candidate[] = [];

  for (let i = 0; i < result.deadlines.length; i++) {
    if (completionKeys.has(`deadline:${i}`)) continue;
    const d = result.deadlines[i];
    candidates.push({
      kind:        "deadline",
      index:       i,
      description: d.description,
      date:        d.date,
      parsed:      parseDate(d.date),
    });
  }

  for (let i = 0; i < result.actionItems.length; i++) {
    if (completionKeys.has(`action_item:${i}`)) continue;
    candidates.push({
      kind:  "action_item",
      index: i,
      label: result.actionItems[i],
    });
  }

  if (candidates.length === 0) {
    const totalTasks = result.deadlines.length + result.actionItems.length;
    if (totalTasks === 0) return { mode: "none" };
    return { mode: "all-done", documentId };
  }

  candidates.sort((a, b) => {
    const aDated = a.kind === "deadline" && a.parsed !== null;
    const bDated = b.kind === "deadline" && b.parsed !== null;
    if (aDated && bDated) {
      return (a as { parsed: Date }).parsed.getTime() - (b as { parsed: Date }).parsed.getTime();
    }
    if (aDated) return -1;
    if (bDated) return 1;
    // Neither dated — deadlines before action items
    const aDeadline = a.kind === "deadline";
    const bDeadline = b.kind === "deadline";
    if (aDeadline && !bDeadline) return -1;
    if (!aDeadline && bDeadline) return 1;
    return a.index - b.index;
  });

  const top = candidates[0];

  if (top.kind === "action_item") {
    // Action item title pipeline: imperative → consequence-extract
    const imperative           = makeImperative(top.label);
    const { head, consequence } = extractConsequence(imperative);
    return {
      mode:       "task",
      documentId,
      kind:       "action_item",
      taskIndex:  top.index,
      taskLabel:  head,
      // Consequence-bearing action items earn an amber tone — the extracted
      // clause is itself the stakes signal even without a concrete date.
      support:    consequence ? rewriteConsequence(consequence) : undefined,
      tone:       consequence ? "amber" : "neutral",
    };
  }

  // Deadline branch — title pipeline: imperative → date-trim → consequence-extract.
  // Consequence extraction always runs (cleans up the title even when we'll use
  // date-based urgency in the support line).
  const imperative           = makeImperative(top.description);
  const dateTrimmed          = trimTrailingDatePhrase(imperative, top.date);
  const { head, consequence } = extractConsequence(dateTrimmed);
  const taskLabel            = head;

  // Support line priority: date-based urgency > extracted consequence > raw date string.
  let support: string | undefined          = undefined;
  let tone:    "red" | "amber" | "neutral" = "neutral";

  if (top.parsed) {
    const now      = new Date();
    const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target   = new Date(top.parsed.getFullYear(), top.parsed.getMonth(), top.parsed.getDate());
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

    if (diffDays < 0) {
      const days = -diffDays;
      support = `Overdue ${days} day${days === 1 ? "" : "s"} ago`;
      tone    = "red";
    } else if (diffDays === 0) {
      support = "Due today";
      tone    = "amber";
    } else if (diffDays <= 7) {
      support = `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
      tone    = "amber";
    } else {
      support = `Due ${formatDeadlineDate(top.parsed)}`;
      tone    = "neutral";
    }
  } else if (consequence) {
    support = rewriteConsequence(consequence);
    tone    = "amber";
  } else if (top.date) {
    support = top.date;
  }

  return {
    mode:       "task",
    documentId,
    kind:       "deadline",
    taskIndex:  top.index,
    taskLabel,
    support,
    tone,
  };
}

// ─── page ─────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ id: string }> };

export default async function DocPage({ params }: Props) {
  const { id } = await params;

  // Middleware guarantees a session for /app/*, but bail to 404 if it's
  // missing (e.g. cookie expired between middleware check and render).
  const session = await getSession();
  if (!session) notFound();

  // Scope to the signed-in user — strangers shouldn't be able to read each
  // other's documents even with a guessable id.
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, session.userId)))
    .limit(1);

  if (rows.length === 0) notFound();

  const doc = rows[0];

  // ── Branch on status: processing / failed / complete ────────────────────
  // Processing/failed rows have placeholder values for documentType,
  // complexity, and result — we must not try to render the full workspace
  // until status === "complete".
  if (doc.status === "processing") {
    return (
      <>
        <Topbar crumbs={[{ label: "Inbox", href: "/app" }, "Analyzing"]} />
        <DocProcessingPage id={doc.id} />
      </>
    );
  }

  if (doc.status === "failed") {
    return (
      <>
        <Topbar crumbs={[{ label: "Inbox", href: "/app" }, "Failed"]} />
        <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-50">
          <div className="mx-auto w-full max-w-2xl px-6 py-16">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-8 py-12 text-center">
              <h2 className="font-display text-[22px] font-normal tracking-tight text-amber-900">
                Analysis failed
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-amber-800">
                Something went wrong while analyzing this document. Try
                starting another, or come back later — server hiccups
                sometimes resolve on their own.
              </p>
              <div className="mt-7 flex items-center justify-center gap-3">
                <Link
                  href="/app/new"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700"
                >
                  Start another
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/app"
                  className="text-[12.5px] font-medium text-amber-800 transition-colors hover:text-amber-900"
                >
                  Back to inbox
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // status === "complete" — render full workspace
  const result = JSON.parse(doc.result) as AnalysisResult;

  // ── Task completions — graceful degrade if table is missing ──────────────
  const completionKeys = new Set<string>();
  try {
    const completionRows = await db
      .select()
      .from(taskCompletions)
      .where(eq(taskCompletions.documentId, id));
    for (const r of completionRows) {
      completionKeys.add(`${r.kind}:${r.taskIndex}`);
    }
  } catch (err) {
    if (!isTableMissing(err)) {
      console.error("[DocPage] Failed to load task completions:", err);
    }
    // Missing table is expected in dev — proceed with an empty set
  }

  const startHere = buildStartHere(result, id, completionKeys);

  // Render the card on the server and pass it as a slot through the client
  // tree. When the document has no tasks the slot is null and PlanPanel
  // skips its section wrapper, so no empty stanza appears.
  const startHereSlot = startHere.mode === "none"
    ? null
    : <StartHereCard {...startHere} />;

  return (
    <>
      <Topbar crumbs={[{ label: "Inbox", href: "/app" }, result.documentType]} />
      <DocWorkspace
        text={doc.sourceText}
        result={result}
        startHereSlot={startHereSlot}
      />
    </>
  );
}
