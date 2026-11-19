export type FlashcardSchedulingState =
  | "new"
  | "learning"
  | "review"
  | "relearning";

export interface FlashcardReviewSchedulingSnapshot {
  state: FlashcardSchedulingState;
  dueAt: string;
  stability: string | null;
  // Absent from snapshots taken before FSRS-7; those reviews cannot be undone
  // because their prior memory state has no fast trace.
  stabilityFast?: string | null;
  difficulty: string | null;
  intervalDays: number;
  learningStep: number | null;
  lastReviewedAt: string | null;
  reviewCount: number;
  lapseCount: number;
}
