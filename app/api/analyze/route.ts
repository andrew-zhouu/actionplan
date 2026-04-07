import { type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { analyzeDocument } from "@/lib/ai/analyze-document";

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
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (message.includes("ANTHROPIC_API_KEY")) {
      return Response.json(
        { error: "Server configuration error. Contact the site administrator." },
        { status: 500 }
      );
    }

    if (err instanceof ZodError || message.includes("invalid JSON")) {
      return Response.json(
        { error: "The model returned an unexpected response. Please try again." },
        { status: 502 }
      );
    }

    return Response.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
