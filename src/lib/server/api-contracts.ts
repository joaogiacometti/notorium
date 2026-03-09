import type { InferSelectModel } from "drizzle-orm";
import type {
  assessment,
  attendanceMiss,
  flashcard,
  flashcardReviewLog,
  flashcardSchedulerSettings,
  note,
  subject,
} from "@/db/schema";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export type SubjectEntity = InferSelectModel<typeof subject>;
export type NoteEntity = InferSelectModel<typeof note>;
export type AttendanceMissEntity = InferSelectModel<typeof attendanceMiss>;
export type AssessmentEntity = InferSelectModel<typeof assessment>;
export type FlashcardEntity = InferSelectModel<typeof flashcard>;
export type FlashcardReviewLogEntity = InferSelectModel<
  typeof flashcardReviewLog
>;
export type FlashcardSchedulerSettingsEntity = InferSelectModel<
  typeof flashcardSchedulerSettings
>;
export type FlashcardReviewEntity = Pick<
  FlashcardEntity,
  | "id"
  | "front"
  | "back"
  | "subjectId"
  | "state"
  | "dueAt"
  | "stability"
  | "difficulty"
  | "ease"
  | "intervalDays"
  | "learningStep"
  | "lastReviewedAt"
  | "reviewCount"
  | "lapseCount"
>;

export interface FlashcardReviewSummary {
  dueCount: number;
  totalCount: number;
}

export interface FlashcardReviewSchedulerSettings {
  desiredRetention: number;
  weights: number[];
}

export interface FlashcardReviewState {
  cards: FlashcardReviewEntity[];
  summary: FlashcardReviewSummary;
  scheduler: FlashcardReviewSchedulerSettings;
}

export type SearchSubjectResult = Pick<
  SubjectEntity,
  "id" | "name" | "description"
>;

export type SearchNoteResult = Pick<
  NoteEntity,
  "id" | "title" | "content" | "subjectId"
> & {
  subjectName: string;
};

export type SearchFlashcardResult = Pick<
  FlashcardEntity,
  "id" | "front" | "back" | "subjectId"
> & {
  subjectName: string;
};

export type SearchData = {
  subjects: SearchSubjectResult[];
  notes: SearchNoteResult[];
  flashcards: SearchFlashcardResult[];
};

export type SubjectEditDto = Pick<SubjectEntity, "id" | "name" | "description">;

export type NoteEditDto = Pick<NoteEntity, "id" | "title" | "content">;

export type MutationResult = { success: true } | ActionErrorResult;
export type ReviewFlashcardResult =
  | {
      success: true;
      reviewedCardId: string;
      flashcard: FlashcardReviewEntity;
    }
  | ActionErrorResult;
export type CreateFlashcardResult =
  | {
      success: true;
      flashcard: FlashcardEntity;
    }
  | ActionErrorResult;
export type EditFlashcardResult =
  | {
      success: true;
      flashcard: FlashcardEntity;
    }
  | ActionErrorResult;
export type DeleteFlashcardResult =
  | {
      success: true;
      id: string;
    }
  | ActionErrorResult;
export type ResetFlashcardResult =
  | {
      success: true;
      flashcard: FlashcardEntity;
    }
  | ActionErrorResult;
