import { type NextRequest } from "next/server";
import pdfParse from "pdf-parse";
import { analyzeDocument, ModelOutputError } from "@/lib/ai/analyze-document";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

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

  // Plain text
  return buffer.toString("utf-8");
}

export async function POST(request: NextRequest) {
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

  // Extract text from the file
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

  // Soft cap — keeps the analysis pipeline working for very large files
  const text = raw.length > MAX_TEXT_LENGTH ? raw.slice(0, MAX_TEXT_LENGTH) : raw;

  try {
    const result = await analyzeDocument(text);

    // DB write — graceful degradation identical to /api/analyze
    try {
      const id = crypto.randomUUID();
      await db.insert(documents).values({
        id,
        createdAt:    new Date(),
        documentType: result.documentType,
        complexity:   result.complexityLevel,
        sourceText:   text,
        result:       JSON.stringify(result),
      });
      // extractedText always included so the client has it for the /workspace fallback
      return Response.json({ ...result, id, extractedText: text });
    } catch (dbErr) {
      console.error("[/api/upload-analyze] DB write failed, returning without id:", dbErr);
      return Response.json({ ...result, extractedText: text });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("ANTHROPIC_API_KEY")) {
      console.error("[/api/upload-analyze] Configuration error:", message);
      return Response.json(
        { error: "Server configuration error. Contact the site administrator." },
        { status: 500 },
      );
    }

    if (err instanceof ModelOutputError) {
      console.error("[/api/upload-analyze] Model output error:", message);
      return Response.json(
        { error: "The model returned an unexpected response. Please try again." },
        { status: 502 },
      );
    }

    console.error("[/api/upload-analyze] Unexpected error:", err);
    return Response.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
