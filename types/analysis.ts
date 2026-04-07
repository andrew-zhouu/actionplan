import type { z } from "zod";
import type {
  AnalysisResultSchema,
  AIOutputSchema,
  DeadlineSchema,
  ComplexityLevelSchema,
} from "@/lib/validations/analysis-schema";

export type ComplexityLevel = z.infer<typeof ComplexityLevelSchema>;
export type Deadline = z.infer<typeof DeadlineSchema>;
export type AIOutput = z.infer<typeof AIOutputSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
