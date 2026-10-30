import { FlashcardsPageClient } from "@/components/flashcards/flashcards-page-client";
import { FlashcardsViewSwitch } from "@/components/flashcards/shared/flashcards-view-switch";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { getFlashcardReviewSummaryForUser } from "@/features/flashcard-review/queries";
import { getFlashcardsManagePageForUser } from "@/features/flashcards/queries";
import { resolveScopedSubjectId } from "@/features/flashcards/scope";
import {
  resolveFlashcardManageFilter,
  resolveFlashcardsView,
} from "@/features/flashcards/view";
import { getAllSubjectsWithPathsForUser } from "@/features/subjects/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { requireSession } from "@/lib/auth/auth";
import { resolvePageSize } from "@/lib/pagination/page-size";

interface FlashcardsPageProps {
  searchParams: Promise<{
    view?: string;
    subjectId?: string;
    search?: string;
    pageSize?: string;
    filter?: string;
  }>;
}

export default async function FlashcardsPage({
  searchParams,
}: Readonly<FlashcardsPageProps>) {
  const session = await requireSession();
  const aiEnabled = isAiEnabled();
  const { view, subjectId, search, pageSize, filter } = await searchParams;
  const currentView = resolveFlashcardsView(view);
  const initialPageSize = resolvePageSize(pageSize);
  const subjects = await getAllSubjectsWithPathsForUser(session.user.id);

  const scopedSubjectId = resolveScopedSubjectId(subjects, subjectId);
  const initialManageSearch =
    currentView === "manage" ? search?.trim() : undefined;
  const initialManageFilter =
    currentView === "manage" ? resolveFlashcardManageFilter(filter) : undefined;

  const initialManagePageData = getFlashcardsManagePageForUser(
    session.user.id,
    {
      pageIndex: 0,
      pageSize: initialPageSize,
      subjectId: scopedSubjectId,
      search: initialManageSearch,
      filter: initialManageFilter,
    },
  );

  const reviewSummary = getFlashcardReviewSummaryForUser(
    session.user.id,
    new Date(),
    { subjectId: scopedSubjectId },
  );

  const [initialManagePageDataResult, reviewSummaryResult] = await Promise.all([
    initialManagePageData,
    reviewSummary,
  ]);

  return (
    <FeaturePageShell
      title="Flashcards"
      icon="layers-3"
      switcher={
        <FlashcardsViewSwitch
          currentView={currentView}
          manageLabel="Manage"
          reviewLabel="Review"
          subjectId={scopedSubjectId}
        />
      }
    >
      <FlashcardsPageClient
        currentView={currentView}
        scopedSubjectId={scopedSubjectId}
        initialSearch={initialManageSearch}
        initialFilter={initialManageFilter}
        initialPageSize={initialPageSize}
        subjects={subjects}
        initialManagePageData={initialManagePageDataResult}
        reviewSummary={reviewSummaryResult}
        aiEnabled={aiEnabled}
      />
    </FeaturePageShell>
  );
}
