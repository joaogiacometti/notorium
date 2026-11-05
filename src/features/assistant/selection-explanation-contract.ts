import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";

export const selectionTextSchema = z
  .string()
  .trim()
  .min(1)
  .refine((text) => /[\p{L}\p{N}]/u.test(text));

export const selectionExplanationSchema = z.object({
  text: selectionTextSchema.max(LIMITS.assistantMessageMaxChars),
  context: z.string().trim().max(1000),
});

export const selectionExplanationRequestSchema = z.strictObject({
  intent: z.literal("explain-selection"),
  selection: selectionExplanationSchema,
});

export type ExplanationSelection = z.infer<typeof selectionExplanationSchema>;

export interface SelectionExplanation {
  text: string;
}
