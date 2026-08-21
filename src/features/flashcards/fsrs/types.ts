import type { FlashcardEntity } from "@/lib/server/api-contracts";

export const reviewGradeValues = ["again", "hard", "good", "easy"] as const;
export type ReviewGrade = (typeof reviewGradeValues)[number];

export const gradeLabels: Record<ReviewGrade, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

export interface ScheduleFlashcardReviewInput {
  card: Pick<
    FlashcardEntity,
    | "state"
    | "dueAt"
    | "stability"
    | "difficulty"
    | "intervalDays"
    | "learningStep"
    | "lastReviewedAt"
    | "reviewCount"
    | "lapseCount"
  >;
  grade: ReviewGrade;
  now?: Date;
  desiredRetention?: number;
  weights?: number[];
  enableFuzz?: boolean;
}

export interface SchedulerOutput {
  state: FlashcardEntity["state"];
  dueAt: Date;
  stability: string;
  difficulty: string;
  ease: number;
  intervalDays: number;
  learningStep: number | null;
  lastReviewedAt: Date;
  reviewCount: number;
  lapseCount: number;
  updatedAt: Date;
  daysElapsed: number;
}

export interface ParsedFsrsWeightsResult {
  weights: number[];
  isValid: boolean;
}

export interface FsrsSchedulerValidationInput {
  desiredRetention: number;
  weights: number[];
  maxNewCardEasyIntervalDays?: number;
}
