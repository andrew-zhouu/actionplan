/** Additive migration only. Existing analyses and task tables are untouched. */
export const RAG_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS document_indexes (
    document_id TEXT PRIMARY KEY NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    model TEXT NOT NULL,
    chunk_count INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    ordinal INTEGER NOT NULL,
    content TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    embedding F32_BLOB(768) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS document_chunks_owner ON document_chunks(user_id, document_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS document_chunks_ordinal ON document_chunks(document_id, ordinal)`,
  `CREATE TABLE IF NOT EXISTS rag_request_limits (
    user_id TEXT PRIMARY KEY NOT NULL,
    lease_id TEXT NOT NULL,
    busy_until INTEGER NOT NULL,
    next_allowed_at INTEGER NOT NULL,
    window_start INTEGER NOT NULL,
    request_count INTEGER NOT NULL
  )`,
];
