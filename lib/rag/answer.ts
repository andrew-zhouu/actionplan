import { z } from "zod";
import { type Answer, type RetrievedSource, RagError } from "./types";

const RawAnswerSchema = z.object({
  answerable: z.boolean(),
  claims: z.array(z.object({
    text: z.string().trim().min(1).max(1200),
    citations: z.array(z.object({
      sourceId: z.string(),
      quote: z.string().trim().min(12).max(1800),
    })).min(1).max(4),
  })).max(6),
});

export function noAnswer(): Answer {
  return { answerable: false, claims: [], message: "I couldn't find enough information in the retrieved passages to answer that. Try a more specific question or select another document." };
}

/** Reject fabricated source IDs/quotes. This validates provenance, not semantic entailment. */
export function validateAnswer(raw: string, sources: RetrievedSource[]): Answer {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = RawAnswerSchema.parse(JSON.parse(cleaned));
    if (!parsed.answerable) return noAnswer();
    if (!parsed.claims.length) throw new Error("Missing claims");
    return {
      answerable: true,
      claims: parsed.claims.map(claim => ({
        text: claim.text,
        citations: claim.citations.map(citation => {
          const source = sources.find(s => s.sourceId === citation.sourceId);
          const index = source?.text.indexOf(citation.quote) ?? -1;
          if (!source || index < 0) throw new Error("Unsupported citation");
          return {
            sourceId: source.sourceId,
            documentId: source.documentId,
            documentTitle: source.documentTitle,
            quote: citation.quote,
            start: source.start + index,
            end: source.start + index + citation.quote.length,
          };
        }),
      })),
    };
  } catch {
    throw new RagError("invalid_answer", "The answer could not be matched to its sources. Please try a more specific question.", 502);
  }
}
