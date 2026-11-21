import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import { contentHash } from "./chunk";
import { EMBEDDING_DIMENSIONS, INDEX_VERSION, RagError, type Chunk, type DocumentSource, type RetrievedSource } from "./types";

function placeholders(count: number) { return Array(count).fill("?").join(","); }

export function validateVectors(vectors: number[][], count: number) {
  if (vectors.length !== count || vectors.some(v => v.length !== EMBEDDING_DIMENSIONS || v.some(n => !Number.isFinite(n)) || !v.some(n => n !== 0))) {
    throw new RagError("invalid_embeddings", "The search service returned invalid data. Please try again.", 502);
  }
}

export class RagStore {
  constructor(private readonly client: Client) {}

  async loadDocuments(userId: string, ids: string[]): Promise<DocumentSource[]> {
    if (!ids.length) throw new RagError("not_found", "Document not found.", 404);
    const rows = (await this.client.execute({
      sql: `SELECT id, document_type, source_text FROM documents WHERE user_id = ? AND status = 'complete' AND id IN (${placeholders(ids.length)})`,
      args: [userId, ...ids],
    })).rows;
    // An unauthorized selection fails as a whole, before any provider call.
    if (rows.length !== new Set(ids).size) throw new RagError("not_found", "Document not found.", 404);
    return rows.map(r => ({ id: String(r.id), title: String(r.document_type), text: String(r.source_text) }));
  }

  async isIndexed(userId: string, doc: DocumentSource) {
    const result = await this.client.execute({
      sql: "SELECT document_id FROM document_indexes WHERE document_id = ? AND user_id = ? AND source_hash = ? AND model = ?",
      args: [doc.id, userId, contentHash(doc.text), INDEX_VERSION],
    });
    return result.rows.length > 0;
  }

  async replaceIndex(userId: string, doc: DocumentSource, chunks: Chunk[], vectors: number[][]) {
    validateVectors(vectors, chunks.length);
    const tx = await this.client.transaction("write");
    try {
      // Recheck inside the transaction: deletion/edit during embedding must not resurrect data.
      const current = (await tx.execute({ sql: "SELECT source_text FROM documents WHERE id = ? AND user_id = ? AND status = 'complete'", args: [doc.id, userId] })).rows[0];
      if (!current || current.source_text !== doc.text) throw new RagError("document_changed", "A document changed. Refresh and try again.", 409);
      await tx.execute({ sql: "DELETE FROM document_chunks WHERE document_id = ? AND user_id = ?", args: [doc.id, userId] });
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        await tx.execute({
          sql: "INSERT INTO document_chunks (id, document_id, user_id, ordinal, content, start_offset, end_offset, embedding) VALUES (?, ?, ?, ?, ?, ?, ?, vector32(?))",
          args: [randomUUID(), doc.id, userId, c.ordinal, c.text, c.start, c.end, JSON.stringify(vectors[i])],
        });
      }
      await tx.execute({
        sql: "INSERT INTO document_indexes (document_id, user_id, source_hash, model, chunk_count) VALUES (?, ?, ?, ?, ?) ON CONFLICT(document_id) DO UPDATE SET user_id=excluded.user_id, source_hash=excluded.source_hash, model=excluded.model, chunk_count=excluded.chunk_count",
        args: [doc.id, userId, contentHash(doc.text), INDEX_VERSION, chunks.length],
      });
      await tx.commit();
    } catch (error) { await tx.rollback(); throw error; }
    finally { tx.close(); }
  }

  async retrieve(userId: string, ids: string[], vector: number[], minSimilarity = 0.35): Promise<RetrievedSource[]> {
    validateVectors([vector], 1);
    // Exact search over selected, owned documents. A global ANN top-k followed
    // by filtering could lose all matches to other users' documents.
    const rows = (await this.client.execute({
      sql: `SELECT c.document_id, d.document_type, c.ordinal, c.content, c.start_offset, c.end_offset,
        1 - vector_distance_cos(c.embedding, vector32(?)) AS similarity
        FROM document_chunks c JOIN documents d ON d.id = c.document_id
        JOIN document_indexes i ON i.document_id = d.id
        WHERE c.user_id = ? AND d.user_id = ? AND i.user_id = ? AND i.model = ? AND d.status = 'complete'
          AND c.document_id IN (${placeholders(ids.length)})
        ORDER BY similarity DESC, c.document_id, c.ordinal LIMIT 24`,
      args: [JSON.stringify(vector), userId, userId, userId, INDEX_VERSION, ...ids],
    })).rows;
    const sources: RetrievedSource[] = [];
    for (const r of rows) {
      if (r.similarity === null || Number(r.similarity) < minSimilarity) continue;
      const documentId = String(r.document_id);
      const start = Number(r.start_offset), end = Number(r.end_offset);
      // Drop mostly duplicated passages, preserving context from different documents.
      if (sources.some(s => s.documentId === documentId && Math.max(0, Math.min(s.end, end) - Math.max(s.start, start)) > (end - start) * 0.7)) continue;
      if (sources.filter(s => s.documentId === documentId).length >= 3) continue;
      sources.push({ sourceId: `S${sources.length + 1}`, documentId, documentTitle: String(r.document_type), ordinal: Number(r.ordinal), text: String(r.content), start, end, similarity: Number(r.similarity) });
      if (sources.length === 8) break;
    }
    return sources;
  }

  async acquireRequest(userId: string, now = Date.now()): Promise<string> {
    const lease = randomUUID();
    const result = await this.client.execute({
      // Atomic across server instances; max one request, 5s cooldown, 30/hour.
      sql: `INSERT INTO rag_request_limits (user_id, lease_id, busy_until, next_allowed_at, window_start, request_count)
        VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT(user_id) DO UPDATE SET lease_id=excluded.lease_id, busy_until=excluded.busy_until,
        next_allowed_at=excluded.next_allowed_at,
        window_start=CASE WHEN rag_request_limits.window_start <= ? THEN ? ELSE rag_request_limits.window_start END,
        request_count=CASE WHEN rag_request_limits.window_start <= ? THEN 1 ELSE rag_request_limits.request_count + 1 END
        WHERE rag_request_limits.busy_until <= ? AND rag_request_limits.next_allowed_at <= ?
          AND (rag_request_limits.window_start <= ? OR rag_request_limits.request_count < 30)
        RETURNING lease_id`,
      args: [userId, lease, now + 180_000, now + 5000, now, now - 3_600_000, now, now - 3_600_000, now, now, now - 3_600_000],
    });
    if (!result.rows.length) throw new RagError("rate_limited", "Please wait before asking again. Questions are limited to 30 per hour.", 429);
    return lease;
  }

  async releaseRequest(userId: string, lease: string) {
    await this.client.execute({ sql: "UPDATE rag_request_limits SET busy_until = 0 WHERE user_id = ? AND lease_id = ?", args: [userId, lease] });
  }
}
