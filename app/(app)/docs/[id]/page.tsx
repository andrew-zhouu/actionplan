import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import type { AnalysisResult } from "@/types/analysis";
import { Topbar } from "@/components/shell/topbar";
import { DocWorkspace } from "@/components/workspace/doc-workspace";

type Props = { params: Promise<{ id: string }> };

export default async function DocPage({ params }: Props) {
  const { id } = await params;

  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (rows.length === 0) notFound();

  const doc = rows[0];
  const result = JSON.parse(doc.result) as AnalysisResult;

  return (
    <>
      <Topbar crumbs={[{ label: "Inbox", href: "/" }, result.documentType]} />
      <DocWorkspace text={doc.sourceText} result={result} />
    </>
  );
}
