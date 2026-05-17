import { type NextRequest } from "next/server";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { analyzeDocument } from "@/lib/ai/analyze-document";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { loadTrialUser, enforceLimit, incrementUsage } from "@/lib/auth/trial";

const MIN_TEXT_LENGTH = 50;

const RequestSchema = z.object({
  text: z
    .string()
    .min(MIN_TEXT_LENGTH, {
      message: `Please paste at least ${MIN_TEXT_LENGTH} characters of text to analyze.`,
    }),
});

/**
 * Persistent-processing analyze endpoint.
 *
 * Flow:
 *   1. Validate input + session + trial limit
 *   2. INSERT documents row with status="processing" and placeholder
 *      values for documentType/complexity/result
 *   3. Increment usage immediately (so concurrent tab clicks can't
 *      double-spend within the model-call window)
 *   4. Return { id, status: "processing" } — fast response, client navigates
 *   5. `after()` runs the actual model call and UPDATEs the row to
 *      "complete" (with real result) or "failed". This continues even
 *      if the client disconnects.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // ── Session gate ─────────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "not_signed_in", message: "Please sign in at /early-access to continue." },
      { status: 401 },
    );
  }

  const user = await loadTrialUser(session.userId);
  if (!user) {
    return Response.json(
      { error: "account_not_found", message: "Your session is no longer valid. Please sign in again at /early-access." },
      { status: 401 },
    );
  }

  // ── Trial limit ──────────────────────────────────────────────────────────
  const limitDenial = enforceLimit(user);
  if (limitDenial) {
    return Response.json(
      {
        error:         "limit_reached",
        message:       `You've used all ${limitDenial.documentLimit} of your trial analyses. Email us if you'd like more access.`,
        documentsUsed: limitDenial.documentsUsed,
        documentLimit: limitDenial.documentLimit,
      },
      { status: 403 },
    );
  }

  // ── Insert placeholder row ──────────────────────────────────────────────
  const id   = crypto.randomUUID();
  const text = parsed.data.text;

  try {
    await db.insert(documents).values({
      id,
      userId:       session.userId,
      status:       "processing",
      documentType: "Processing…",
      complexity:   "Unknown",
      result:       "{}",
      sourceText:   text,
      createdAt:    new Date(),
    });
  } catch (dbErr) {
    console.error("[/api/analyze] DB insert failed:", dbErr);
    return Response.json(
      { error: "save_failed", message: "Could not save your document. Please try again." },
      { status: 500 },
    );
  }

  // ── Claim trial slot upfront so concurrent clicks can't double-spend ───
  try {
    await incrementUsage(session.userId);
  } catch (usageErr) {
    console.error("[/api/analyze] incrementUsage failed:", usageErr);
    // Continue — usage tracking is best-effort, not blocking.
  }

  // ── Schedule the model call to run after the response is sent ──────────
  //    `after()` keeps the function alive on Vercel until the promise
  //    resolves, so the analysis completes even if the client disconnects.
  after(async () => {
    try {
      const result = await analyzeDocument(text);
      await db
        .update(documents)
        .set({
          status:       "complete",
          documentType: result.documentType,
          complexity:   result.complexityLevel,
          result:       JSON.stringify(result),
        })
        .where(eq(documents.id, id));
    } catch (err) {
      console.error(`[/api/analyze after()] Analysis failed for ${id}:`, err);
      try {
        await db
          .update(documents)
          .set({ status: "failed" })
          .where(eq(documents.id, id));
      } catch (updateErr) {
        console.error(`[/api/analyze after()] Failed to mark ${id} as failed:`, updateErr);
      }
    }
  });

  return Response.json({ id, status: "processing" });
}
