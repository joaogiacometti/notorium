import { z } from "zod";
import { reviewGradeValues } from "@/features/flashcards/fsrs";

export const reviewGradeSchema = z.enum(reviewGradeValues);

export const reviewFlashcardSchema = z.object({
  id: z.string().min(1),
  grade: reviewGradeSchema,
  clientReviewId: z.string().min(1).optional(),
});

export type ReviewFlashcardForm = z.infer<typeof reviewFlashcardSchema>;

export const syncFlashcardReviewEventSchema = z.object({
  clientReviewId: z.string().min(1),
  flashcardId: z.string().min(1),
  grade: reviewGradeSchema,
  reviewedAt: z.coerce.date(),
});

export const syncFlashcardReviewsSchema = z.object({
  events: z.array(syncFlashcardReviewEventSchema).max(100),
});

export type SyncFlashcardReviewEventForm = z.infer<
  typeof syncFlashcardReviewEventSchema
>;
export type SyncFlashcardReviewsForm = z.infer<
  typeof syncFlashcardReviewsSchema
>;
