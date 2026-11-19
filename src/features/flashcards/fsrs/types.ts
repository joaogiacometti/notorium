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
    | "id"
    | "state"
    | "dueAt"
    | "stability"
    | "stabilityFast"
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
  weights?: readonly number[];
  enableFuzz?: boolean;
}

export interface SchedulerOutput {
  state: FlashcardEntity["state"];
  dueAt: Date;
  stability: string;
  stabilityFast: string;
  difficulty: string;
  intervalDays: number;
  learningStep: number;
  lastReviewedAt: Date | null;
  reviewCount: number;
  lapseCount: number;
  updatedAt: Date;
}

export interface ParsedFsrsWeightsResult {
  weights: number[];
  isValid: boolean;
}

export interface FsrsSchedulerValidationInput {
  desiredRetention: number;
  weights: readonly number[];
  maxNewCardEasyIntervalDays?: number;
}
