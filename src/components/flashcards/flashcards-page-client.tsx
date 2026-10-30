"use client";

import { useState } from "react";
import { FlashcardsManager } from "@/components/flashcards/manage/flashcards-manager";
import { FlashcardsManagerTableSkeleton } from "@/components/flashcards/manage/flashcards-manager-table";
import { FlashcardReviewActionCardSkeleton } from "@/components/flashcards/review/flashcard-review-loading";
import { ReviewHubView } from "@/components/flashcards/review/review-hub-view";
import { SubjectScopeFilter } from "@/components/flashcards/shared/subject-scope-filter";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlashcardManageFilter } from "@/features/flashcards/validation";
import type { FlashcardsView } from "@/features/flashcards/view";
import {
  getFlashcardExamSessionHref,
  getFlashcardReviewSessionHref,
} from "@/lib/navigation/detail-page-back-link";
import type {
  FlashcardManagePage,
  FlashcardReviewSummary,
  SubjectOption,
} from "@/lib/server/api-contracts";

interface FlashcardsPageClientProps {
  currentView: FlashcardsView;
  scopedSubjectId?: string;
  initialSearch?: string;
  initialFilter?: FlashcardManageFilter;
  initialPageSize: number;
  subjects: SubjectOption[];
  initialManagePageData: FlashcardManagePage;
  reviewSummary: FlashcardReviewSummary;
  aiEnabled: boolean;
}

/**
 * Flashcards hub. There is no in-page tree: review runs globally (or scoped
 * when the sidebar deep-links a subject), and manage lists every card with a
 * subject filter. Scope lives in the `?subjectId` URL param.
 */
export function FlashcardsPageClient({
  currentView,
  scopedSubjectId,
  initialSearch,
  initialFilter,
  initialPageSize,
  subjects,
  initialManagePageData,
  reviewSummary,
  aiEnabled,
}: Readonly<FlashcardsPageClientProps>) {
  const scopeKey = `${currentView}:${scopedSubjectId ?? "all"}`;
  const [isSubjectChanging, setIsSubjectChanging] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:h-full lg:min-h-0">
      <SubjectScopeFilter
        subjects={subjects}
        view={currentView}
        selectedSubjectId={scopedSubjectId}
        onPendingChange={setIsSubjectChanging}
      />
      {currentView === "review" && isSubjectChanging && (
        <div className="flex h-full min-h-0 flex-col overflow-y-auto">
          <div className="grid gap-3 lg:grid-cols-2">
            {(["review", "exam"] as const).map((key) => (
              <FlashcardReviewActionCardSkeleton key={key} />
            ))}
          </div>
        </div>
      )}
      {currentView === "review" && !isSubjectChanging && (
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">
          <ReviewHubView
            hasDueCards={reviewSummary.dueCount > 0}
            dueBadgeText={`${reviewSummary.dueCount} due`}
            hasExamCards={reviewSummary.totalCount > 0}
            examBadgeText={`${reviewSummary.totalCount} ${
              reviewSummary.totalCount === 1 ? "card" : "cards"
            }`}
            examScopeLabel={
              scopedSubjectId ? "All cards in subject" : "All flashcards"
            }
            reviewHref={getFlashcardReviewSessionHref(scopedSubjectId)}
            examHref={getFlashcardExamSessionHref(scopedSubjectId)}
          />
        </div>
      )}
      {currentView === "manage" && isSubjectChanging && (
        <div
          className="flex flex-col gap-3 lg:h-full lg:min-h-0"
          data-testid="flashcards-manage-loading"
        >
          <div className="rounded-lg border bg-card">
            <div className="relative px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1 lg:max-w-3xl">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-28 rounded-lg" />
                    <Skeleton className="h-10 w-36 rounded-lg" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-between">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem]">
                    <Skeleton className="h-6 w-44 rounded-full" />
                  </div>
                  <div className="ml-auto min-h-8 sm:min-w-34" />
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card lg:min-h-0 lg:flex-1">
            <FlashcardsManagerTableSkeleton />
          </div>
        </div>
      )}
      {currentView === "manage" && !isSubjectChanging && (
        <FlashcardsManager
          key={scopeKey}
          initialPageData={initialManagePageData}
          initialSubjectId={scopedSubjectId}
          initialSearch={initialSearch}
          initialFilter={initialFilter}
          initialPageSize={initialPageSize}
          aiEnabled={aiEnabled}
        />
      )}
    </div>
  );
}
