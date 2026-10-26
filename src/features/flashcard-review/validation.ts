import { z } from "zod";
import { reviewGradeValues } from "@/features/flashcards/fsrs";
import { LIMITS } from "@/lib/config/limits";
import { idSchema } from "@/lib/validations/schemas";

export const reviewGradeSchema = z.enum(reviewGradeValues);

export const reviewFlashcardSchema = z.object({
  id: z.string().min(1),
  grade: reviewGradeSchema,
  clientReviewId: z.string().min(1).optional(),
});

export type ReviewFlashcardForm = z.infer<typeof reviewFlashcardSchema>;

export const undoFlashcardReviewSchema = z.object({
  id: z.string().min(1),
  reviewLogId: z.string().min(1),
});

export type UndoFlashcardReviewForm = z.infer<typeof undoFlashcardReviewSchema>;

export const flashcardExamScopeSchema = z.object({
  subjectId: idSchema.optional(),
});

export const flashcardReviewStateQuerySchema = flashcardExamScopeSchema.extend({
  limit: z.number().int().positive().max(LIMITS.reviewDueLimitMax).optional(),
});

export type FlashcardReviewStateQueryInput = z.infer<
  typeof flashcardReviewStateQuerySchema
>;
