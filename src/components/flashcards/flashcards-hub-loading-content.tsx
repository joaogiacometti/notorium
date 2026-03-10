import { resolveFlashcardsView } from "@/features/flashcards/view";
import { FlashcardReviewLoading } from "./flashcard-review-loading";
import { FlashcardsManageLoading } from "./flashcards-manage-loading";

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
