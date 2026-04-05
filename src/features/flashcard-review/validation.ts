import { z } from "zod";
import { reviewGradeValues } from "@/features/flashcards/fsrs";

export const reviewGradeSchema = z.enum(reviewGradeValues);

export const reviewFlashcardSchema = z.object({
  id: z.string().min(1),
  grade: reviewGradeSchema,
});

export type ReviewFlashcardForm = z.infer<typeof reviewFlashcardSchema>;
