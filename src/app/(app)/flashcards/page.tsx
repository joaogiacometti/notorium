import { FlashcardsPageClient } from "@/components/flashcards/flashcards-page-client";
import { FlashcardsViewSwitch } from "@/components/flashcards/shared/flashcards-view-switch";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { getFlashcardReviewSummaryForUser } from "@/features/flashcard-review/queries";
import { getFlashcardsManagePageForUser } from "@/features/flashcards/queries";
import { resolveScopedFolderId } from "@/features/flashcards/scope";
import {
  resolveFlashcardManageFilter,
  resolveFlashcardsView,
} from "@/features/flashcards/view";
import { getAllFoldersWithPathsForUser } from "@/features/folders/queries";
import { requireSession } from "@/lib/auth/auth";
import { resolvePageSize } from "@/lib/pagination/page-size";

interface FlashcardsPageProps {
  searchParams: Promise<{
    view?: string;
    folderId?: string;
    search?: string;
    pageSize?: string;
    filter?: string;
  }>;
}

export default async function FlashcardsPage({
  searchParams,
}: Readonly<FlashcardsPageProps>) {
  const session = await requireSession();
  const { view, folderId, search, pageSize, filter } = await searchParams;
  const currentView = resolveFlashcardsView(view);
  const initialPageSize = resolvePageSize(pageSize);
  const folders = await getAllFoldersWithPathsForUser(session.user.id);

  const scopedFolderId = resolveScopedFolderId(folders, folderId);
  const initialManageSearch =
    currentView === "manage" ? search?.trim() : undefined;
  const initialManageFilter =
    currentView === "manage" ? resolveFlashcardManageFilter(filter) : undefined;

  const initialManagePageData = getFlashcardsManagePageForUser(
    session.user.id,
    {
      pageIndex: 0,
      pageSize: initialPageSize,
      folderId: scopedFolderId,
      search: initialManageSearch,
      filter: initialManageFilter,
    },
  );

  const reviewSummary = getFlashcardReviewSummaryForUser(
    session.user.id,
    new Date(),
    { folderId: scopedFolderId },
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
          folderId={scopedFolderId}
        />
      }
    >
      <FlashcardsPageClient
        currentView={currentView}
        scopedFolderId={scopedFolderId}
        initialSearch={initialManageSearch}
        initialFilter={initialManageFilter}
        initialPageSize={initialPageSize}
        folders={folders}
        initialManagePageData={initialManagePageDataResult}
        reviewSummary={reviewSummaryResult}
      />
    </FeaturePageShell>
  );
}
