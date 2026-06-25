import type { InferSelectModel } from "drizzle-orm";
import type {
  assessment,
  assessmentAttachment,
  attendanceMiss,
  flashcard,
  flashcardReviewLog,
  flashcardSchedulerSettings,
  libraryBook,
  mindmap,
  note,
  subject,
} from "@/db/schema";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export type SubjectEntity = InferSelectModel<typeof subject>;
export interface SubjectOption extends SubjectEntity {
  path: string;
}
export interface SubjectTreeNode extends SubjectEntity {
  documentCount: number;
  // Cards due now in this subject and all descendants. Drives the sidebar
  // review indicator; 0 when nothing is due.
  dueFlashcardCount: number;
  children: SubjectTreeNode[];
  path: string;
}
export type NoteEntity = InferSelectModel<typeof note>;
export type MindmapEntity = InferSelectModel<typeof mindmap>;
export type MindmapListItem = Pick<MindmapEntity, "id" | "title" | "updatedAt">;
export type AttendanceMissEntity = InferSelectModel<typeof attendanceMiss>;
export type AssessmentEntity = InferSelectModel<typeof assessment>;
export type AssessmentAttachmentEntity = InferSelectModel<
  typeof assessmentAttachment
>;
export type LibraryBookEntity = InferSelectModel<typeof libraryBook>;
export interface AssessmentDetailEntity {
  assessment: AssessmentEntity;
  subject: Pick<SubjectEntity, "id" | "name">;
  attachments: AssessmentAttachmentEntity[];
}
export interface PlanningAssessmentsPage {
  items: AssessmentEntity[];
  total: number;
  hasAnyAssessments: boolean;
  subjectAssessmentCount: number | null;
  subjectFinalGrade: number | null;
}
export type FlashcardEntity = InferSelectModel<typeof flashcard>;
export type FlashcardDetailEntity = FlashcardEntity & {
  subjectName: string;
  subjectPath: string;
};
export type FlashcardManageItem = Pick<
  FlashcardEntity,
  "id" | "subjectId" | "updatedAt" | "type"
> & {
  front: string;
  frontExcerpt: string;
  frontTitle: string | null;
  subjectName: string;
  subjectPath: string;
  // Occlusion notes collapse their per-mask sibling rows into one list row.
  occlusionImagePathname: string | null;
  maskCount: number | null;
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
export type FlashcardReviewEntity = Pick<
  FlashcardEntity,
  | "id"
  | "front"
  | "back"
  | "type"
  | "clozeSource"
  | "occlusionImagePathname"
  | "occlusionRegions"
  | "occlusionMaskId"
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
> & {
  subjectName?: string;
  subjectPath?: string;
};

export interface FlashcardReviewSummary {
  dueCount: number;
  totalCount: number;
}

export interface FlashcardReviewSchedulerSettings {
  desiredRetention: number;
  weights: number[];
}

export interface FlashcardOptimizationSettings {
  automaticOptimizationEnabled: boolean;
  lastOptimizedAt: string | null;
  optimizedReviewCount: number;
  reviewCount: number;
}

export interface FlashcardReviewState {
  cards: FlashcardReviewEntity[];
  summary: FlashcardReviewSummary;
  scheduler: FlashcardReviewSchedulerSettings;
}

/**
 * Everything the account settings dialog renders, fetched lazily when the
 * dialog opens so no app page pays for these queries on every navigation.
 */
export interface AccountSettings {
  name: string;
  email: string;
  createdAt: string;
  emailEnabled: boolean;
  workflowsEnabled: boolean;
  notificationsEnabled: boolean;
  notificationDaysBefore: number;
  readerColorInverted: boolean;
  fsrsOptimization: FlashcardOptimizationSettings;
}

export interface FlashcardStatisticsTrendPoint {
  date: string;
  count: number;
}

export interface FlashcardStatisticsStreak {
  current: number;
  longest: number;
}

/**
 * Daily review counts for the trailing year plus the derived study streaks.
 * Powers the "Review activity" heatmap on the home dashboard.
 */
export interface FlashcardReviewActivity {
  heatmap: FlashcardStatisticsTrendPoint[];
  streak: FlashcardStatisticsStreak;
}

export type SearchSubjectResult = Pick<SubjectEntity, "id" | "name">;

export interface SubjectListItem extends SubjectEntity {
  notesCount: number;
}

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
  subjectPath: string;
};

export type SearchMindmapResult = Pick<
  MindmapEntity,
  "id" | "title" | "subjectId"
> & {
  subjectName: string;
  matchedNodeLabel?: string;
};

export type SearchBookResult = Pick<
  LibraryBookEntity,
  "id" | "title" | "author" | "subjectId"
>;

export type SearchData = {
  subjects: SearchSubjectResult[];
  notes: SearchNoteResult[];
  flashcards: SearchFlashcardResult[];
  mindmaps: SearchMindmapResult[];
  books: SearchBookResult[];
};

export type SubjectEditDto = Pick<SubjectEntity, "id" | "name" | "kind">;

export type MutationResult = { success: true } | ActionErrorResult;
export type FlashcardOptimizationResult =
  | {
      success: true;
      optimizedReviewCount: number;
      lastOptimizedAt: Date;
    }
  | ActionErrorResult;
export type AuthRedirectSuccessResult = {
  success: true;
  data: {
    redirectTo: string;
  };
};
export type AuthRedirectResult = AuthRedirectSuccessResult | ActionErrorResult;
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
export type BulkDeleteAssessmentsResult =
  | {
      success: true;
      ids: string[];
      subjectIds: string[];
    }
  | ActionErrorResult;
export type BulkUpdateAssessmentStatusResult =
  | {
      success: true;
      ids: string[];
      status: AssessmentEntity["status"];
      subjectIds: string[];
    }
  | ActionErrorResult;
export type BulkSubjectMutationResult =
  | {
      success: true;
      ids: string[];
    }
  | ActionErrorResult;
export type MoveSubjectResult =
  | {
      success: true;
      id: string;
      previousParentSubjectId: string | null;
      newParentSubjectId: string | null;
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
      previousSubjectId: string | null;
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
      subjectId: string | null;
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
  subjectPath?: string;
  subjectId: string | null;
}
