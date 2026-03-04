import { z } from "zod";

export const reviewGradeSchema = z.enum(["again", "hard", "good", "easy"]);

export const reviewFlashcardSchema = z.object({
  id: z.string().min(1),
  grade: reviewGradeSchema,
});

export type ReviewFlashcardForm = z.infer<typeof reviewFlashcardSchema>;
