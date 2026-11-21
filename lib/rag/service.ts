import { z } from "zod";
import { chunkDocument } from "./chunk";
import { noAnswer, validateAnswer } from "./answer";
import { RagStore } from "./store";
import { MAX_DOCUMENTS, MAX_REQUEST_CHUNKS, RagError, type Embedder, type Generator } from "./types";

export const AskRequestSchema = z.object({
  question: z.string().trim().min(3, "Enter a question of at least 3 characters.").max(1000),
  documentIds: z.array(z.string().min(1).max(100)).min(1).max(MAX_DOCUMENTS).transform(ids => [...new Set(ids)]),
});

export async function askDocuments(input: {
  userId: string;
  question: string;
  documentIds: string[];
  store: RagStore;
  embed: Embedder;
  generate: Generator;
}) {
  const { userId, store, embed, generate } = input;
  const { question, documentIds } = AskRequestSchema.parse(input);
  const started = Date.now();
  const docs = await store.loadDocuments(userId, documentIds);
  const chunked = docs.map(doc => ({ doc, chunks: chunkDocument(doc.text) }));
  if (chunked.reduce((n, d) => n + d.chunks.length, 0) > MAX_REQUEST_CHUNKS) {
    throw new RagError("selection_too_large", "These documents are too long to search together. Select fewer documents.");
  }
  const lease = await store.acquireRequest(userId);
  let indexedChunks = 0;
  try {
    for (const { doc, chunks } of chunked) {
      if (!await store.isIndexed(userId, doc)) {
        const vectors = chunks.length ? await embed(chunks.map(c => c.text), "RETRIEVAL_DOCUMENT") : [];
        await store.replaceIndex(userId, doc, chunks, vectors);
        indexedChunks += chunks.length;
      }
    }
    const [queryVector] = await embed([question], "RETRIEVAL_QUERY");
    const sources = await store.retrieve(userId, documentIds, queryVector);
    let answer = noAnswer();
    if (sources.length) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const raw = await generate(question, sources);
        try { answer = validateAnswer(raw, sources); break; }
        catch (error) { if (attempt === 1) throw error; }
      }
    }
    // Don't return cached passages if the document was deleted/edited during generation.
    const current = await store.loadDocuments(userId, documentIds);
    if (docs.some(doc => current.find(d => d.id === doc.id)?.text !== doc.text)) {
      throw new RagError("document_changed", "A document changed. Refresh and try again.", 409);
    }
    return { ...answer, metrics: { elapsedMs: Date.now() - started, indexedChunks, retrievedChunks: sources.length } };
  } finally {
    // A stale request must not release a newer request's lease.
    await store.releaseRequest(userId, lease);
  }
}
