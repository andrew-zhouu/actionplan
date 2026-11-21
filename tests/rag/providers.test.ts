import assert from "node:assert/strict";
import { test } from "node:test";
import { embedGemini } from "../../lib/rag/providers";
import { EMBEDDING_DIMENSIONS } from "../../lib/rag/types";

test("Gemini adapter batches documents, requests retrieval task/dimensions, and validates output", async () => {
  const oldFetch = global.fetch, oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-placeholder-not-a-real-key";
  const batches: { requests: { taskType: string; outputDimensionality: number; content: { parts: { text: string }[] } }[] }[] = [];
  try {
    global.fetch = async (url, init) => {
      assert.ok(String(url).endsWith("/gemini-embedding-001:batchEmbedContents"));
      assert.equal(init?.cache, "no-store");
      const body = JSON.parse(String(init?.body)); batches.push(body);
      return Response.json({ embeddings: body.requests.map(() => ({ values: [1, ...Array(EMBEDDING_DIMENSIONS - 1).fill(0)] })) });
    };
    const vectors = await embedGemini(Array(33).fill("A document passage."), "RETRIEVAL_DOCUMENT");
    assert.equal(vectors.length, 33);
    assert.deepEqual(batches.map(b => b.requests.length), [32, 1]);
    assert.equal(batches[0].requests[0].taskType, "RETRIEVAL_DOCUMENT");
    assert.equal(batches[0].requests[0].outputDimensionality, 768);
    await embedGemini(["When is the deadline?"], "RETRIEVAL_QUERY");
    assert.equal(batches[2].requests[0].taskType, "RETRIEVAL_QUERY");
    global.fetch = async () => Response.json({ embeddings: [{ values: [1, 0] }] });
    await assert.rejects(embedGemini(["test"], "RETRIEVAL_QUERY"), /invalid data/);
    global.fetch = async () => Response.json({ error: "private provider detail" }, { status: 429 });
    await assert.rejects(embedGemini(["test"], "RETRIEVAL_QUERY"), /temporarily unavailable/);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
  }
});
