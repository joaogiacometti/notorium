"use client";

import { FlashcardsManager } from "@/components/flashcards/manage/flashcards-manager";
import { FlashcardReviewClient } from "@/components/flashcards/review/flashcard-review-client";
import { FlashcardsStatistics } from "@/components/flashcards/shared/flashcards-statistics";
import { SubjectScopeFilter } from "@/components/flashcards/shared/subject-scope-filter";
import type { FlashcardsView } from "@/features/flashcards/view";
import type {
  FlashcardManagePage,
  FlashcardReviewState,
  FlashcardStatisticsState,
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
  statistics: FlashcardStatisticsState;
  aiEnabled: boolean;
}

/**
 * Flashcards hub. There is no in-page tree: review and statistics run globally
 * (or scoped when the sidebar deep-links a subject), and manage lists every
 * card with a subject filter. Scope lives in the `?subjectId` URL param.
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
  statistics,
  aiEnabled,
}: Readonly<FlashcardsPageClientProps>) {
  const scopeKey = `${currentView}:${scopedSubjectId ?? "all"}`;

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:h-full lg:min-h-0">
      <SubjectScopeFilter
        subjects={subjects}
        view={currentView}
        selectedSubjectId={scopedSubjectId}
      />
      {currentView === "review" && (
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
      {currentView === "statistics" && (
        <FlashcardsStatistics statistics={statistics} />
      )}
      {currentView === "manage" && (
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
