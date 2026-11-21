import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { chunkDocument } from "../../lib/rag/chunk";
import { validateAnswer } from "../../lib/rag/answer";
import { askDocuments } from "../../lib/rag/service";
import { RagStore, validateVectors } from "../../lib/rag/store";
import { RAG_SCHEMA } from "../../lib/rag/schema";
import { EMBEDDING_DIMENSIONS, type RetrievedSource } from "../../lib/rag/types";

function vector(a: number, b = 0, c = 0) { return [a, b, c, ...Array(EMBEDDING_DIMENSIONS - 3).fill(0)]; }

async function setup() {
  // libSQL opens a new connection after explicit transactions. A file-backed
  // fixture matches production; :memory: would create a fresh DB each time.
  const directory = mkdtempSync(join(tmpdir(), "actionplan-rag-test-"));
  testDirectories.push(directory);
  const client = createClient({ url: `file:${join(directory, "test.db")}` });
  await client.execute(`CREATE TABLE documents (id TEXT PRIMARY KEY, user_id TEXT, status TEXT, document_type TEXT, source_text TEXT)`);
  await client.batch(RAG_SCHEMA, "write");
  return { client, store: new RagStore(client) };
}

const testDirectories: string[] = [];
after(() => {
  for (const directory of testDirectories) {
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EBUSY") {
        throw error;
      }
      console.warn(`Temporary test database still locked: ${directory}`);
    }
  }
});

async function add(client: Client, id: string, user = "alice", text = "Submit the scholarship acceptance form by May 15, 2027.") {
  await client.execute({ sql: "INSERT INTO documents VALUES (?, ?, 'complete', ?, ?)", args: [id, user, `Document ${id}`, text] });
}

test("chunks preserve exact source offsets and cover content across boundaries", () => {
  const text = "\n  " + "Scholarship acceptance requires a signed form.\n\n".repeat(180) + "Final condition: GPA 3.5. ";
  const chunks = chunkDocument(text);
  assert.ok(chunks.length > 1);
  const covered = new Set<number>();
  for (const c of chunks) {
    assert.equal(text.slice(c.start, c.end), c.text);
    assert.ok(c.text.length <= 1800);
    for (let i = c.start; i < c.end; i++) covered.add(i);
  }
  for (let i = 0; i < text.length; i++) if (!/\s/.test(text[i])) assert.ok(covered.has(i));
  assert.deepEqual(chunkDocument(" \n\t"), []);
  assert.throws(() => chunkDocument("x".repeat(80_001)), /too long/);
});

test("native vector search filters ownership and explicit document scope before ranking", async () => {
  const { client, store } = await setup();
  try {
    for (const [id, owner, embedding] of [["a", "alice", vector(1, .1)], ["b", "bob", vector(1)], ["c", "alice", vector(1)], ["d", "alice", vector(0, 1)]] as const) {
      await add(client, id, owner);
      const [doc] = await store.loadDocuments(owner, [id]);
      await store.replaceIndex(owner, doc, chunkDocument(doc.text), [embedding]);
    }
    const result = await store.retrieve("alice", ["a", "b", "d"], vector(1));
    assert.deepEqual(result.map(r => r.documentId), ["a"]);
    assert.ok(result[0].similarity > .99);
    await assert.rejects(store.loadDocuments("alice", ["b"]), /Document not found/);
    await assert.rejects(store.loadDocuments("alice", ["nonexistent"]), /Document not found/);
  } finally { client.close(); }
});

test("index cache invalidates on changed text; replacement removes old chunks atomically", async () => {
  const { client, store } = await setup();
  try {
    await add(client, "a", "alice", "Original condition. ".repeat(150));
    const [old] = await store.loadDocuments("alice", ["a"]);
    const chunks = chunkDocument(old.text);
    await store.replaceIndex("alice", old, chunks, chunks.map(() => vector(1)));
    assert.ok(await store.isIndexed("alice", old));
    await client.execute("UPDATE documents SET source_text = 'Updated deadline is June 1, 2027.' WHERE id = 'a'");
    const [fresh] = await store.loadDocuments("alice", ["a"]);
    assert.equal(await store.isIndexed("alice", fresh), false);
    await assert.rejects(store.replaceIndex("alice", old, chunks, chunks.map(() => vector(1))), /changed/);
    await store.replaceIndex("alice", fresh, chunkDocument(fresh.text), [vector(0, 1)]);
    assert.equal((await client.execute("SELECT COUNT(*) n FROM document_chunks")).rows[0].n, 1);
    assert.equal((await store.retrieve("alice", ["a"], vector(0, 1)))[0].text, fresh.text);
  } finally { client.close(); }
});

test("deleting a source during embedding cannot recreate its chunks", async () => {
  const { client, store } = await setup();
  try {
    await add(client, "a");
    const [doc] = await store.loadDocuments("alice", ["a"]);
    await client.execute("DELETE FROM documents WHERE id = 'a'");
    await assert.rejects(store.replaceIndex("alice", doc, chunkDocument(doc.text), [vector(1)]), /changed/);
    assert.equal((await client.execute("SELECT COUNT(*) n FROM document_chunks")).rows[0].n, 0);
  } finally { client.close(); }
});

test("citations require real retrieved IDs and verbatim supporting quotes", () => {
  const source: RetrievedSource = { sourceId: "S1", documentId: "a", documentTitle: "Offer", text: "Acceptance must be submitted by May 15, 2027.", start: 100, end: 144, ordinal: 0, similarity: .9 };
  const raw = { answerable: true, claims: [{ text: "Submit by May 15, 2027.", citations: [{ sourceId: "S1", quote: "submitted by May 15, 2027." }] }] };
  const result = validateAnswer(JSON.stringify(raw), [source]);
  assert.equal(result.claims[0].citations[0].start, 119);
  raw.claims[0].citations[0].quote = "submitted by June 15, 2027.";
  assert.throws(() => validateAnswer(JSON.stringify(raw), [source]), /matched/);
  raw.claims[0].citations[0] = { sourceId: "S9", quote: "submitted by May 15, 2027." };
  assert.throws(() => validateAnswer(JSON.stringify(raw), [source]), /matched/);
  assert.throws(() => validateAnswer('{"answerable":true,"claims":[]}', [source]), /matched/);
  assert.throws(() => validateAnswer('{"answerable":true,"claims":[{"text":"made up","citations":[]}]}', [source]), /matched/);
  assert.equal(validateAnswer('{"answerable":false,"claims":[]}', [source]).answerable, false);
});

test("cross-document service indexes once, retrieves real vectors, and attaches citations", async () => {
  const { client, store } = await setup();
  try {
    await add(client, "a"); await add(client, "b", "alice", "The housing deposit is due June 1, 2027.");
    let indexed = 0;
    const embed = async (texts: string[], task: string) => { if (task === "RETRIEVAL_DOCUMENT") indexed += texts.length; return texts.map(() => vector(1)); };
    const generate = async (_: string, sources: RetrievedSource[]) => JSON.stringify({ answerable: true, claims: sources.map(s => ({ text: s.text, citations: [{ sourceId: s.sourceId, quote: s.text }] })) });
    const args = { userId: "alice", question: "What deadlines are mentioned?", documentIds: ["a", "b"], store, embed, generate };
    const first = await askDocuments(args);
    assert.equal(first.claims.length, 2);
    assert.equal(indexed, 2);
    await client.execute("UPDATE rag_request_limits SET next_allowed_at=0");
    const second = await askDocuments(args);
    assert.equal(indexed, 2);
    assert.equal(second.metrics.indexedChunks, 0);
  } finally { client.close(); }
});

test("unauthorized document IDs cause zero provider calls, including mixed selections", async () => {
  const { client, store } = await setup();
  try {
    await add(client, "a"); await add(client, "b", "bob");
    let calls = 0;
    await assert.rejects(askDocuments({ userId: "alice", question: "Show me the documents", documentIds: ["a", "b"], store,
      embed: async () => { calls++; return []; }, generate: async () => { calls++; return ""; } }), /not found/);
    assert.equal(calls, 0);
  } finally { client.close(); }
});

test("no relevant retrieval returns insufficient evidence without calling generation", async () => {
  const { client, store } = await setup();
  try {
    await add(client, "a");
    let generated = 0;
    const result = await askDocuments({ userId: "alice", question: "What are the dinner options?", documentIds: ["a"], store,
      embed: async (texts, task) => texts.map(() => task === "RETRIEVAL_QUERY" ? vector(0, 1) : vector(1)),
      generate: async () => { generated++; return ""; } });
    assert.equal(result.answerable, false); assert.equal(generated, 0);
  } finally { client.close(); }
});

test("one invalid citation retry is allowed; unrecoverable output is never returned", async () => {
  const { client, store } = await setup();
  try {
    await add(client, "a"); let generated = 0;
    await assert.rejects(askDocuments({ userId: "alice", question: "When is acceptance due?", documentIds: ["a"], store,
      embed: async texts => texts.map(() => vector(1)), generate: async () => { generated++; return '{"answerable":true,"claims":[]}'; } }), /matched/);
    assert.equal(generated, 2);
    assert.equal((await client.execute("SELECT busy_until FROM rag_request_limits")).rows[0].busy_until, 0);
  } finally { client.close(); }
});

test("document deletion during generation prevents returning stale source text", async () => {
  const { client, store } = await setup();
  try {
    await add(client, "a");
    await assert.rejects(askDocuments({ userId: "alice", question: "When is acceptance due?", documentIds: ["a"], store,
      embed: async texts => texts.map(() => vector(1)), generate: async () => {
        await client.execute("DELETE FROM documents WHERE id = 'a'");
        return '{"answerable":false,"claims":[]}';
      } }), /not found/);
  } finally { client.close(); }
});

test("persistent request gate enforces concurrency, cooldown, hourly allowance and lease identity", async () => {
  const { client, store } = await setup();
  try {
    const now = 10_000_000;
    const lease = await store.acquireRequest("alice", now);
    await assert.rejects(store.acquireRequest("alice", now + 6000), /wait/);
    await store.releaseRequest("alice", "wrong-lease");
    await assert.rejects(store.acquireRequest("alice", now + 6000), /wait/);
    await store.releaseRequest("alice", lease);
    await assert.rejects(store.acquireRequest("alice", now + 1000), /wait/);
    for (let i = 1; i < 30; i++) { const token = await store.acquireRequest("alice", now + i * 6000); await store.releaseRequest("alice", token); }
    await assert.rejects(store.acquireRequest("alice", now + 30 * 6000), /wait/);
    const later = await store.acquireRequest("alice", now + 3_600_001);
    await store.releaseRequest("alice", lease);
    await assert.rejects(store.acquireRequest("alice", now + 3_606_001), /wait/);
    await store.releaseRequest("alice", later);
  } finally { client.close(); }
});

test("embedding dimensions and values are validated before storing/searching", () => {
  assert.throws(() => validateVectors([[1, 0]], 1), /invalid data/);
  assert.throws(() => validateVectors([vector(NaN)], 1), /invalid data/);
  assert.throws(() => validateVectors([vector(0)], 1), /invalid data/);
  assert.throws(() => validateVectors([], 1), /invalid data/);
  validateVectors([vector(1)], 1);
});
