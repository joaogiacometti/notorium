import { FlashcardsPageClient } from "@/components/flashcards/flashcards-page-client";
import { FlashcardsViewSwitch } from "@/components/flashcards/shared/flashcards-view-switch";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { getFlashcardReviewStateForUser } from "@/features/flashcard-review/queries";
import { getFlashcardsManagePageForUser } from "@/features/flashcards/queries";
import { resolveFlashcardsView } from "@/features/flashcards/view";
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
    focus?: string;
  }>;
}

export default async function FlashcardsPage({
  searchParams,
}: Readonly<FlashcardsPageProps>) {
  const session = await requireSession();
  const aiEnabled = isAiEnabled();
  const { view, subjectId, search, pageSize, focus } = await searchParams;
  const currentView = resolveFlashcardsView(view);
  const autoStartReview = currentView === "review" && focus === "1";
  const initialPageSize = resolvePageSize(pageSize);
  const subjects = await getAllSubjectsWithPathsForUser(session.user.id);

  const scopedSubjectId =
    subjectId && subjects.some((subject) => subject.id === subjectId)
      ? subjectId
      : undefined;
  const initialManageSearch =
    currentView === "manage" ? search?.trim() : undefined;

  const initialManagePageData = getFlashcardsManagePageForUser(
    session.user.id,
    {
      pageIndex: 0,
      pageSize: initialPageSize,
      subjectId: scopedSubjectId,
      search: initialManageSearch,
    },
  );

  const initialReviewState = getFlashcardReviewStateForUser(session.user.id, {
    subjectId: scopedSubjectId,
    limit: 50,
  });

  const [initialManagePageDataResult, initialReviewStateResult] =
    await Promise.all([initialManagePageData, initialReviewState]);

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
        autoStartReview={autoStartReview}
        initialSearch={initialManageSearch}
        initialPageSize={initialPageSize}
        subjects={subjects}
        initialManagePageData={initialManagePageDataResult}
        initialReviewState={initialReviewStateResult}
        aiEnabled={aiEnabled}
      />
    </FeaturePageShell>
  );
}
