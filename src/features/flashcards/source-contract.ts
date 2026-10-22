import { z } from "zod";
import type { DocumentKind } from "@/features/documents/types";
import { idSchema } from "@/lib/validations/schemas";

/** Stable document identity captured when requesting flashcards. */
export const flashcardSourceSchema = z.object({
  kind: z.enum(["note", "mindmap"]) satisfies z.ZodType<DocumentKind>,
  id: idSchema,
});
export type FlashcardSource = z.infer<typeof flashcardSourceSchema>;
export type FlashcardSourceLink = FlashcardSource & {
  title: string;
  subjectId: string;
};
