"use client";

import { useState } from "react";
import { FlashcardsManager } from "@/components/flashcards/manage/flashcards-manager";
import { FlashcardsManagerTableSkeleton } from "@/components/flashcards/manage/flashcards-manager-table";
import { FlashcardReviewClient } from "@/components/flashcards/review/flashcard-review-client";
import { FlashcardReviewActionCardSkeleton } from "@/components/flashcards/review/flashcard-review-loading";
import { SubjectScopeFilter } from "@/components/flashcards/shared/subject-scope-filter";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlashcardsView } from "@/features/flashcards/view";
import type {
  FlashcardManagePage,
  FlashcardReviewState,
  SubjectOption,
} from "@/lib/server/api-contracts";

interface FlashcardsPageClientProps {
  currentView: FlashcardsView;
  scopedSubjectId?: string;
  /** Jump straight into the full-screen focus session (review view only). */
  autoStartReview?: boolean;
  initialSearch?: string;
  initialPageSize: number;
  subjects: SubjectOption[];
  initialManagePageData: FlashcardManagePage;
  initialReviewState: FlashcardReviewState;
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
  autoStartReview,
  initialSearch,
  initialPageSize,
  subjects,
  initialManagePageData,
  initialReviewState,
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
        <FlashcardReviewClient
          key={scopeKey}
          initialState={initialReviewState}
          subjectId={scopedSubjectId}
          subjects={subjects}
          aiEnabled={aiEnabled}
          autoStartReview={autoStartReview}
          embedded
        />
      )}
      {currentView === "manage" && isSubjectChanging && (
        <div
          className="flex flex-col gap-3 lg:h-full lg:min-h-0"
          data-testid="flashcards-manage-loading"
        >
          <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card/85">
            <div className="relative px-4 py-3 sm:px-5 sm:py-4">
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
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/85 lg:min-h-0 lg:flex-1">
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
          initialPageSize={initialPageSize}
          aiEnabled={aiEnabled}
          hasSubjects={subjects.length > 0}
        />
      )}
    </div>
  );
}
