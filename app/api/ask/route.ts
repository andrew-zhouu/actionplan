import { getSession } from "@/lib/auth/session";
import { loadTrialUser } from "@/lib/auth/trial";
import { client } from "@/lib/db";
import { askDocuments, AskRequestSchema } from "@/lib/rag/service";
import { embedGemini, generateAnswer, ragConfigured } from "@/lib/rag/providers";
import { RagStore } from "@/lib/rag/store";
import { RagError } from "@/lib/rag/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "invalid_origin" }, 403);
  const session = await getSession();
  if (!session || !await loadTrialUser(session.userId)) return json({ error: "not_signed_in", message: "Please sign in again." }, 401);
  if (!ragConfigured()) return json({ error: "not_configured", message: "Document questions are not available yet." }, 503);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "invalid_request" }, 415);
  let body: unknown;
  try {
    // Bounded stream read: Content-Length alone is not trustworthy.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "invalid_request" }, 400);
    const decoder = new TextDecoder();
    let raw = "", length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16_000) { await reader.cancel(); return json({ error: "request_too_large" }, 413); }
      raw += decoder.decode(value, { stream: true });
    }
    body = JSON.parse(raw + decoder.decode());
  } catch { return json({ error: "invalid_request", message: "Please enter a valid question." }, 400); }
  const parsed = AskRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", message: parsed.error.issues[0].message }, 400);

  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(100_000)]);
    const answer = await askDocuments({
      ...parsed.data, userId: session.userId, store: new RagStore(client),
      embed: (texts, task) => embedGemini(texts, task, signal),
      generate: (question, sources) => generateAnswer(question, sources, signal),
    });
    // Counts/timing only: never log question text, passages, answers or keys.
    console.info("[rag]", JSON.stringify(answer.metrics));
    return json(answer);
  } catch (error) {
    if (error instanceof RagError) return json({ error: error.code, message: error.message }, error.status);
    console.error("[rag] Request failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "ask_failed", message: "Couldn't complete the question. Please try again shortly." }, 503);
  }
}
