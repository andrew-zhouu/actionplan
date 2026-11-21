/** Live smoke evaluation: synthetic documents only; consumes provider usage. */
import { createClient } from "@libsql/client";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RAG_SCHEMA } from "../lib/rag/schema";
import { RagStore } from "../lib/rag/store";
import { askDocuments } from "../lib/rag/service";
import { embedGemini, generateAnswer } from "../lib/rag/providers";

if (![process.env.GEMINI_API_KEY, process.env.ANTHROPIC_API_KEY].every(key => key && !key.includes("placeholder"))) {
  throw new Error("Set real GEMINI_API_KEY and ANTHROPIC_API_KEY in your local environment before running the live evaluation.");
}

async function main() {
  const directory = mkdtempSync(join(tmpdir(), "actionplan-live-eval-"));
  const client = createClient({ url: `file:${join(directory, "eval.db")}` });
  let passed = 0;
  try {
    await client.execute("CREATE TABLE documents (id TEXT PRIMARY KEY, user_id TEXT, status TEXT, document_type TEXT, source_text TEXT)");
    await client.batch(RAG_SCHEMA, "write");
    for (const doc of [
      ["scholarship", "Scholarship letter", "The scholarship acceptance form must be submitted by May 15, 2027. To renew the scholarship, maintain a cumulative GPA of at least 3.5. Contact the financial aid office if you need to defer."],
      ["housing", "Housing agreement", "A housing deposit of $300 is due June 1, 2027. Move-in begins August 21, 2027. This housing deposit is separate from any tuition or scholarship acceptance requirements."],
    ]) {
      await client.execute({ sql: "INSERT INTO documents VALUES (?, 'synthetic-eval', 'complete', ?, ?)", args: doc });
    }
    const cases = [
      { question: "When do I have to accept my scholarship?", expectedDoc: "scholarship", expectedQuote: "May 15, 2027" },
      { question: "What grade requirement is needed to keep the award?", expectedDoc: "scholarship", expectedQuote: "3.5" },
      { question: "How much must I pay for housing and when?", expectedDoc: "housing", expectedQuote: "$300" },
      { question: "What is my personal bank account PIN?", expectedDoc: null, expectedQuote: null },
    ];
    for (const item of cases) {
      // This is a throwaway fixture database, not an application rate-limit bypass.
      await client.execute("DELETE FROM rag_request_limits");
      const signal = AbortSignal.timeout(100_000);
      const answer = await askDocuments({
        userId: "synthetic-eval", question: item.question, documentIds: ["scholarship", "housing"], store: new RagStore(client),
        embed: (texts, task) => embedGemini(texts, task, signal),
        generate: (question, sources) => generateAnswer(question, sources, signal),
      });
      const ok = item.expectedDoc === null ? !answer.answerable : answer.answerable && answer.claims.some(claim => claim.citations.some(cite => cite.documentId === item.expectedDoc && cite.quote.includes(item.expectedQuote!)));
      if (ok) passed++;
      console.log(JSON.stringify({ question: item.question, pass: ok, ...answer }));
    }
    console.log(`Synthetic live checks: ${passed}/${cases.length}. Manually review entailment and completeness; this is not a benchmark.`);
    if (passed !== cases.length) process.exitCode = 1;
  } finally { client.close(); rmSync(directory, { recursive: true, force: true }); }
}

main().catch(error => { console.error(error instanceof Error ? error.name : "Evaluation failed"); process.exitCode = 1; });
