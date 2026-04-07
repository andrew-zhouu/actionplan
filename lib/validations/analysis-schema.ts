import { z } from "zod";

export const ComplexityLevelSchema = z.enum(["Low", "Medium", "High"]);

export const DeadlineSchema = z.object({
  description: z.string(),
  date: z.string().optional(),
});

// Shape of the raw JSON the model is expected to return.
// Does not include deterministic fields (readabilityScore, complexityLevel).
export const AIOutputSchema = z.object({
  documentType: z.string(),
  summary: z.string(),
  actionItems: z.array(z.string()),
  deadlines: z.array(DeadlineSchema),
  risks: z.array(z.string()),
  questionsToAsk: z.array(z.string()),
});

// Full result shape returned to the client.
// Extends AIOutputSchema with deterministic pre-processing fields.
export const AnalysisResultSchema = AIOutputSchema.extend({
  readabilityScore: z.number(),
  complexityLevel: ComplexityLevelSchema,
});
