import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { ragConfigured } from "@/lib/rag/providers";
import { Topbar } from "@/components/shell/topbar";
import { AskDocuments } from "@/components/feature/ask-documents";

export const dynamic = "force-dynamic";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ document?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/early-access?next=/app/ask");
  const params = await searchParams;
  const rows = await db.select({ id: documents.id, title: documents.documentType, createdAt: documents.createdAt })
    .from(documents).where(and(eq(documents.userId, session.userId), eq(documents.status, "complete")))
    .orderBy(desc(documents.createdAt)).limit(100);
  return <>
    <Topbar crumbs={["Ask documents"]} />
    <div className="flex-1 overflow-y-auto bg-zinc-50">
      <AskDocuments documents={rows.map(r => ({ ...r, date: r.createdAt.toISOString().slice(0, 10) }))}
        initialDocumentId={params.document} available={ragConfigured()} />
    </div>
  </>;
}
