import type { InferSelectModel } from "drizzle-orm";
import type {
  flashcard,
  flashcardReviewLog,
  flashcardSchedulerSettings,
  folder,
  note,
  pdfDocument,
} from "@/db/schema";
import type { FlashcardSourceLink } from "@/features/flashcards/source-contract";
import type { RichTextDocument } from "@/lib/editor/document";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export type FolderEntity = InferSelectModel<typeof folder>;
export type FolderAncestor = Pick<FolderEntity, "id" | "name">;
export interface FolderOption extends FolderEntity {
  path: string;
}
export interface FolderTreeNode extends FolderEntity {
  documentCount: number;
  // Cards due now in this folder and all descendants. Drives the sidebar
  // review indicator; 0 when nothing is due.
  dueFlashcardCount: number;
  children: FolderTreeNode[];
  path: string;
}
export type NoteEntity = Omit<InferSelectModel<typeof note>, "contentText">;
/** Enough of a note to title and link to it. */
export type NoteLinkTarget = Pick<NoteEntity, "id" | "title" | "folderId">;
/** Links in and out of one note. */
export type NoteConnections = {
  backlinks: NoteLinkTarget[];
  outgoing: NoteLinkTarget[];
  missingIds: string[];
};
export type FlashcardEntity = Omit<
  InferSelectModel<typeof flashcard>,
  "frontText" | "backText"
>;
/** A stored card plus its resolved source link. */
export type FlashcardWithSourceEntity = FlashcardEntity & {
  source: FlashcardSourceLink | null;
};
export type FlashcardDetailEntity = FlashcardWithSourceEntity & {
  folderName: string;
  folderPath: string;
};
export type FlashcardManageItem = Pick<
  FlashcardEntity,
  "id" | "folderId" | "updatedAt" | "studyLaterAt" | "lapseCount"
> & {
  front: RichTextDocument;
  frontExcerpt: string;
  frontTitle: string | null;
  folderName: string;
  folderPath: string;
};
/** A card's full content plus its folder, as copy reads it. */
export type FlashcardContentItem = Pick<
  FlashcardEntity,
  "id" | "front" | "back" | "folderId"
> & {
  folderName: string;
  folderPath: string;
};
export interface FlashcardManagePage {
  items: FlashcardManageItem[];
  total: number;
  folderCardCount: number | null;
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
  | "folderId"
  | "state"
  | "dueAt"
  | "stability"
  | "difficulty"
  | "intervalDays"
  | "learningStep"
  | "lastReviewedAt"
  | "reviewCount"
  | "lapseCount"
  | "studyLaterAt"
> & {
  source?: FlashcardSourceLink | null;
  folderName?: string;
  folderPath?: string;
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
  fsrsOptimization: FlashcardOptimizationSettings;
}

export interface ReviewActivityPoint {
  date: string;
  count: number;
}

export interface ReviewActivityStreak {
  current: number;
  longest: number;
}

/**
 * Daily review counts for the trailing year plus the derived study streaks.
 * Powers the "Review activity" heatmap on the home dashboard.
 */
export interface FlashcardReviewActivity {
  heatmap: ReviewActivityPoint[];
  streak: ReviewActivityStreak;
}

export type SearchNoteResult = Pick<
  NoteEntity,
  "id" | "title" | "content" | "folderId"
> & {
  folderName: string;
};

export type SearchPdfResult = Pick<
  InferSelectModel<typeof pdfDocument>,
  "id" | "title" | "folderId"
> & {
  folderName: string;
};

export type SearchFlashcardResult = Pick<
  FlashcardEntity,
  "id" | "front" | "back" | "folderId"
> & {
  folderName: string;
  folderPath: string;
};

export type SearchData = {
  notes: SearchNoteResult[];
  pdfs: SearchPdfResult[];
  flashcards: SearchFlashcardResult[];
};

export type FolderEditDto = Pick<FolderEntity, "id" | "name">;

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
export type MoveFolderResult =
  | {
      success: true;
      id: string;
      previousParentFolderId: string | null;
      newParentFolderId: string | null;
    }
  | ActionErrorResult;
export type ReviewFlashcardResult =
  | {
      success: true;
      reviewedCardId: string;
      reviewLogId: string;
      flashcard: FlashcardReviewEntity;
    }
  | ActionErrorResult;
export type UndoFlashcardReviewResult =
  | {
      success: true;
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
      previousFolderId: string | null;
    }
  | ActionErrorResult;
export type DeleteFlashcardResult =
  | {
      success: true;
      id: string;
      folderId: string | null;
    }
  | ActionErrorResult;
export type BulkDeleteFlashcardsResult =
  | {
      success: true;
      ids: string[];
      folderIds: string[];
    }
  | ActionErrorResult;
export type BulkResetFlashcardsResult =
  | {
      success: true;
      ids: string[];
      folderIds: string[];
    }
  | ActionErrorResult;
export type BulkMoveFlashcardsResult =
  | {
      success: true;
      ids: string[];
      folderId: string;
      previousFolderIds: string[];
    }
  | ActionErrorResult;
export type SetFlashcardStudyLaterResult =
  | {
      success: true;
      studyLaterAt: Date | null;
    }
  | ActionErrorResult;
export type ResetFlashcardResult =
  | {
      success: true;
      flashcard: FlashcardEntity;
    }
  | ActionErrorResult;
