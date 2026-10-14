export type FlashcardSchedulingState =
  | "new"
  | "learning"
  | "review"
  | "relearning";

export interface FlashcardReviewSchedulingSnapshot {
  state: FlashcardSchedulingState;
  dueAt: string;
  stability: string | null;
  difficulty: string | null;
  intervalDays: number;
  learningStep: number | null;
  lastReviewedAt: string | null;
  reviewCount: number;
  lapseCount: number;
}
