"use client";

import { useState } from "react";
import { FlashcardsManageLoadingBody } from "@/components/flashcards/manage/flashcards-manage-loading";
import { FlashcardsManager } from "@/components/flashcards/manage/flashcards-manager";
import { FlashcardReviewLoadingBody } from "@/components/flashcards/review/flashcard-review-loading";
import { ReviewHubView } from "@/components/flashcards/review/review-hub-view";
import { FolderScopeFilter } from "@/components/flashcards/shared/folder-scope-filter";
import type { FlashcardManageFilter } from "@/features/flashcards/validation";
import type { FlashcardsView } from "@/features/flashcards/view";
import {
  getFlashcardExamSessionHref,
  getFlashcardReviewSessionHref,
} from "@/lib/navigation/detail-page-back-link";
import type {
  FlashcardManagePage,
  FlashcardReviewSummary,
  FolderOption,
} from "@/lib/server/api-contracts";

interface FlashcardsPageClientProps {
  currentView: FlashcardsView;
  scopedFolderId?: string;
  initialSearch?: string;
  initialFilter?: FlashcardManageFilter;
  initialPageSize: number;
  folders: FolderOption[];
  initialManagePageData: FlashcardManagePage;
  reviewSummary: FlashcardReviewSummary;
}

/**
 * Flashcards hub. There is no in-page tree: review runs globally (or scoped
 * when the sidebar deep-links a folder), and manage lists every card with a
 * folder filter. Scope lives in the `?folderId` URL param.
 */
export function FlashcardsPageClient({
  currentView,
  scopedFolderId,
  initialSearch,
  initialFilter,
  initialPageSize,
  folders,
  initialManagePageData,
  reviewSummary,
}: Readonly<FlashcardsPageClientProps>) {
  const scopeKey = `${currentView}:${scopedFolderId ?? "all"}`;
  const [isFolderChanging, setIsFolderChanging] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:h-full lg:min-h-0">
      <FolderScopeFilter
        folders={folders}
        view={currentView}
        selectedFolderId={scopedFolderId}
        onPendingChange={setIsFolderChanging}
      />
      {currentView === "review" && isFolderChanging && (
        <FlashcardReviewLoadingBody />
      )}
      {currentView === "review" && !isFolderChanging && (
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">
          <ReviewHubView
            hasDueCards={reviewSummary.dueCount > 0}
            dueBadgeText={`${reviewSummary.dueCount} due`}
            hasExamCards={reviewSummary.totalCount > 0}
            examBadgeText={`${reviewSummary.totalCount} ${
              reviewSummary.totalCount === 1 ? "card" : "cards"
            }`}
            examScopeLabel={
              scopedFolderId ? "All cards in folder" : "All flashcards"
            }
            reviewHref={getFlashcardReviewSessionHref(scopedFolderId)}
            examHref={getFlashcardExamSessionHref(scopedFolderId)}
          />
        </div>
      )}
      {currentView === "manage" && isFolderChanging && (
        <FlashcardsManageLoadingBody />
      )}
      {currentView === "manage" && !isFolderChanging && (
        <FlashcardsManager
          key={scopeKey}
          initialPageData={initialManagePageData}
          initialFolderId={scopedFolderId}
          initialSearch={initialSearch}
          initialFilter={initialFilter}
          initialPageSize={initialPageSize}
        />
      )}
    </div>
  );
}
