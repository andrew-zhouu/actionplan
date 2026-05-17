import { type NextRequest } from "next/server";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import pdfParse from "pdf-parse";
import { analyzeDocument } from "@/lib/ai/analyze-document";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { loadTrialUser, enforceLimit, incrementUsage } from "@/lib/auth/trial";

const MAX_FILE_BYTES  = 5 * 1024 * 1024; // 5 MB
const MIN_TEXT_LENGTH = 50;
const MAX_TEXT_LENGTH = 50_000;

function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" || name.endsWith(".pdf") ||
    file.type === "text/plain"      || name.endsWith(".txt")
  );
}

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name   = file.name.toLowerCase();

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  return buffer.toString("utf-8");
}

/**
 * Persistent-processing upload-analyze endpoint. PDF text extraction
 * stays synchronous (fast enough to be part of the validation phase);
 * the model call runs in `after()` so the response returns immediately
 * with the inserted document id.
 */
export async function POST(request: NextRequest) {
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

  // ── One in-flight per user ──────────────────────────────────────────────
  // Reject if the user already has a "processing" document. Same check as
  // /api/analyze — keeps the file-upload path consistent with the text path.
  const inFlight = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.userId, session.userId), eq(documents.status, "processing")))
    .limit(1);

  if (inFlight.length > 0) {
    return Response.json(
      {
        error:       "analysis_in_flight",
        message:     "You already have an analysis in progress. Please wait for it to complete before starting another.",
        inFlightId:  inFlight[0].id,
      },
      { status: 409 },
    );
  }

  // ── Form data + file validation ──────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Request must be multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }

  if (!isSupportedFile(file)) {
    return Response.json(
      { error: "Unsupported file type. Please upload a PDF or plain text (.txt) file." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json(
      { error: "File is too large. Please upload a file under 5 MB." },
      { status: 400 },
    );
  }

  // ── Extract text (sync, fast for typical files) ─────────────────────────
  let raw: string;
  try {
    raw = (await extractText(file)).trim();
  } catch {
    return Response.json(
      { error: "Could not read this file. It may be corrupted or password-protected." },
      { status: 422 },
    );
  }

  if (raw.length < MIN_TEXT_LENGTH) {
    return Response.json(
      {
        error:
          "No readable text was found in this file. If it is a scanned document, please copy and paste the text instead.",
      },
      { status: 422 },
    );
  }

  const text = raw.length > MAX_TEXT_LENGTH ? raw.slice(0, MAX_TEXT_LENGTH) : raw;

  // ── Insert placeholder row ──────────────────────────────────────────────
  const id = crypto.randomUUID();
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
    console.error("[/api/upload-analyze] DB insert failed:", dbErr);
    return Response.json(
      { error: "save_failed", message: "Could not save your document. Please try again." },
      { status: 500 },
    );
  }

  // ── Claim trial slot upfront ────────────────────────────────────────────
  try {
    await incrementUsage(session.userId);
  } catch (usageErr) {
    console.error("[/api/upload-analyze] incrementUsage failed:", usageErr);
  }

  // ── Background model call ───────────────────────────────────────────────
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
      console.error(`[/api/upload-analyze after()] Analysis failed for ${id}:`, err);
      try {
        await db
          .update(documents)
          .set({ status: "failed" })
          .where(eq(documents.id, id));
      } catch (updateErr) {
        console.error(`[/api/upload-analyze after()] Failed to mark ${id} as failed:`, updateErr);
      }
    }
  });

  return Response.json({ id, status: "processing" });
}
