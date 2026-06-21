import { FlashcardsManageLoading } from "@/components/flashcards/manage/flashcards-manage-loading";
import { FlashcardReviewLoading } from "@/components/flashcards/review/flashcard-review-loading";
import { resolveFlashcardsView } from "@/features/flashcards/view";

interface FlashcardsHubLoadingContentProps {
  view?: string | null;
}

export function FlashcardsHubLoadingContent({
  view,
}: Readonly<FlashcardsHubLoadingContentProps>) {
  const currentView = resolveFlashcardsView(view ?? undefined);

  if (currentView === "manage") {
    return <FlashcardsManageLoading />;
  }

  return <FlashcardReviewLoading />;
}
