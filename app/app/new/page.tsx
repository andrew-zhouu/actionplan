export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { Topbar } from "@/components/shell/topbar";
import { getSession } from "@/lib/auth/session";
import { loadTrialUser } from "@/lib/auth/trial";
import { NewDocumentClient } from "@/components/feature/new-document-client";
import {
  NewDocumentState,
  type NewDocumentStateProps,
} from "@/components/feature/new-document-state";

const READY_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export default async function NewDocumentPage() {
  // Middleware guarantees a session for /app/*, but bail to early-access
  // defensively if the cookie is invalid between middleware and render.
  const session = await getSession();
  if (!session) redirect("/early-access?next=/app/new");

  const user  = await loadTrialUser(session.userId);
  const usage = user
    ? { documentsUsed: user.documentsUsed, documentLimit: user.documentLimit }
    : null;

  // ── Derive top-of-page state from the user's most recent document ───────
  // We render at most one state card. Processing always shows. Recently
  // complete (≤ 1h) shows. Failed (≤ 1h) shows. Otherwise idle (no card).
  let recentState: NewDocumentStateProps | null = null;
  try {
    const latest = await db
      .select({
        id:           documents.id,
        status:       documents.status,
        documentType: documents.documentType,
        createdAt:    documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.userId, session.userId))
      .orderBy(desc(documents.createdAt))
      .limit(1);

    const row = latest[0];
    if (row) {
      const ageMs = Date.now() - row.createdAt.getTime();
      if (row.status === "processing") {
        recentState = { kind: "processing", id: row.id };
      } else if (row.status === "complete" && ageMs <= READY_WINDOW_MS) {
        recentState = { kind: "ready", id: row.id, documentType: row.documentType };
      } else if (row.status === "failed" && ageMs <= READY_WINDOW_MS) {
        recentState = { kind: "failed", id: row.id };
      }
    }
  } catch {
    // DB not yet initialised or transient error — skip the state card
  }

  return (
    <>
      <Topbar crumbs={[{ label: "Inbox", href: "/app" }, "New document"]} />
      <div className="flex-1 overflow-y-auto bg-zinc-50">
        <main className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-8">
            <p className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-400">
              New document · Inbox
            </p>
            <h1 className="font-display text-[44px] font-normal leading-[1.05] tracking-[-0.015em] text-zinc-900">
              Paste the document. Get a plan you can act on in seconds.
            </h1>
            <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-zinc-500">
              ActionPlan reads admissions letters, leases, aid notices, and
              policies — then pulls out what you must do, by when, and what
              could trip you up.
            </p>
          </div>

          {recentState && <NewDocumentState {...recentState} />}

          <NewDocumentClient usage={usage} />
        </main>
      </div>
    </>
  );
}
