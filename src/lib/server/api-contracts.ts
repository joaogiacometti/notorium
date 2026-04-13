import type { InferSelectModel } from "drizzle-orm";
import type {
  assessment,
  attendanceMiss,
  deck,
  flashcard,
  flashcardReviewLog,
  flashcardSchedulerSettings,
  note,
  subject,
  userAiSettings,
} from "@/db/schema";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export type SubjectEntity = InferSelectModel<typeof subject>;
export type NoteEntity = InferSelectModel<typeof note>;
export type AttendanceMissEntity = InferSelectModel<typeof attendanceMiss>;
export type AssessmentEntity = InferSelectModel<typeof assessment>;
export type DeckEntity = InferSelectModel<typeof deck>;
export interface DeckWithCount extends DeckEntity {
  flashcardCount: number;
}
export interface AssessmentDetailEntity {
  assessment: AssessmentEntity;
  subject: Pick<SubjectEntity, "id" | "name">;
}
export interface PlanningAssessmentsPage {
  items: AssessmentEntity[];
  total: number;
  allCount: number;
  subjectAssessmentCount: number | null;
  subjectFinalGrade: number | null;
}
export type FlashcardEntity = InferSelectModel<typeof flashcard>;
export type FlashcardDetailEntity = FlashcardEntity & {
  subjectName: string;
  deckName: string | null;
};
export type FlashcardListEntity = FlashcardEntity & {
  subjectName: string;
  deckName: string | null;
};
export type FlashcardManageItem = Pick<
  FlashcardEntity,
  "id" | "subjectId" | "deckId" | "updatedAt"
> & {
  front: string;
  backExcerpt: string;
  subjectName: string;
  deckName: string | null;
};
export interface FlashcardManagePage {
  items: FlashcardManageItem[];
  total: number;
  subjectCardCount: number | null;
}
export type FlashcardReviewLogEntity = InferSelectModel<
  typeof flashcardReviewLog
>;
export type FlashcardSchedulerSettingsEntity = InferSelectModel<
  typeof flashcardSchedulerSettings
>;
export type UserAiSettingsEntity = InferSelectModel<typeof userAiSettings>;
export interface UserAiSettingsSummary {
  provider: "openrouter";
  model: string;
  hasApiKey: boolean;
  apiKeyLastFour: string | null;
}
export type FlashcardReviewEntity = Pick<
  FlashcardEntity,
  | "id"
  | "front"
  | "back"
  | "subjectId"
  | "deckId"
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
> & {
  subjectName?: string;
  deckName?: string | null;
};

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

export interface FlashcardStatisticsSummary {
  totalCards: number;
  dueCards: number;
  reviewedCards: number;
  neverReviewedCards: number;
  totalReviews: number;
  totalLapses: number;
  averageReviewsPerCard: number;
  averageLapsesPerReviewedCard: number;
}

export interface FlashcardStatisticsBreakdownItem {
  key: string;
  label: string;
  count: number;
}

export interface FlashcardStatisticsTrendPoint {
  date: string;
  count: number;
}

export interface FlashcardStatisticsState {
  summary: FlashcardStatisticsSummary;
  states: FlashcardStatisticsBreakdownItem[];
  ratings: FlashcardStatisticsBreakdownItem[];
  trend: FlashcardStatisticsTrendPoint[];
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
export type CreateAssessmentResult =
  | {
      success: true;
      assessment: AssessmentEntity;
    }
  | ActionErrorResult;
export type EditAssessmentResult =
  | {
      success: true;
      assessment: AssessmentEntity;
    }
  | ActionErrorResult;
export type DeleteAssessmentResult =
  | {
      success: true;
      id: string;
    }
  | ActionErrorResult;
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
      previousSubjectId: string;
    }
  | ActionErrorResult;
export type GenerateFlashcardBackResult =
  | {
      success: true;
      back: string;
    }
  | ActionErrorResult;
export type DeleteFlashcardResult =
  | {
      success: true;
      id: string;
      subjectId: string;
    }
  | ActionErrorResult;
export type BulkDeleteFlashcardsResult =
  | {
      success: true;
      ids: string[];
      subjectIds: string[];
    }
  | ActionErrorResult;
export type BulkResetFlashcardsResult =
  | {
      success: true;
      ids: string[];
      subjectIds: string[];
    }
  | ActionErrorResult;
export type BulkMoveFlashcardsResult =
  | {
      success: true;
      ids: string[];
      subjectId: string;
      previousSubjectIds: string[];
    }
  | ActionErrorResult;
export type ResetFlashcardResult =
  | {
      success: true;
      flashcard: FlashcardEntity;
    }
  | ActionErrorResult;
export type CheckFlashcardDuplicateResult =
  | {
      success: true;
      duplicate: boolean;
    }
  | ActionErrorResult;

export interface FlashcardValidationIssue {
  id: string;
  issueType: "incorrect" | "confusing" | "duplicate";
  explanation: string;
  relatedFlashcardId?: string;
}

export interface FlashcardValidationItem {
  id: string;
  front: string;
  subjectName: string;
  subjectId: string;
}

export type ValidateFlashcardsResult =
  | {
      success: true;
      issues: FlashcardValidationIssue[];
      flashcards: FlashcardValidationItem[];
    }
  | ActionErrorResult;

export type CreateDeckResult =
  | {
      success: true;
      deck: DeckEntity;
    }
  | ActionErrorResult;
export type EditDeckResult =
  | {
      success: true;
      deck: DeckEntity;
    }
  | ActionErrorResult;
export type DeleteDeckResult =
  | {
      success: true;
      id: string;
      subjectId: string;
    }
  | ActionErrorResult;
