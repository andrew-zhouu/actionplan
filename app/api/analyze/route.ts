import { type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeDocument, ModelOutputError } from "@/lib/ai/analyze-document";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

const MIN_TEXT_LENGTH = 50;

const RequestSchema = z.object({
  text: z
    .string()
    .min(MIN_TEXT_LENGTH, {
      message: `Please paste at least ${MIN_TEXT_LENGTH} characters of text to analyze.`,
    }),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeDocument(parsed.data.text);

    try {
      const id = crypto.randomUUID();
      await db.insert(documents).values({
        id,
        createdAt: new Date(),
        documentType: result.documentType,
        complexity: result.complexityLevel,
        sourceText: parsed.data.text,
        result: JSON.stringify(result),
      });
      return Response.json({ ...result, id });
    } catch (dbErr) {
      console.error("[/api/analyze] DB write failed, returning without id:", dbErr);
      return Response.json(result);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("ANTHROPIC_API_KEY")) {
      console.error("[/api/analyze] Configuration error:", message);
      return Response.json(
        { error: "Server configuration error. Contact the site administrator." },
        { status: 500 }
      );
    }

    if (err instanceof ModelOutputError) {
      console.error("[/api/analyze] Model output error:", message);
      return Response.json(
        { error: "The model returned an unexpected response. Please try again." },
        { status: 502 }
      );
    }

    console.error("[/api/analyze] Unexpected error:", err);
    return Response.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
