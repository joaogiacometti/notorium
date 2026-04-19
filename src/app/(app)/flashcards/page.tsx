import { Layers3 } from "lucide-react";
import { FlashcardsPageClient } from "@/components/flashcards/flashcards-page-client";
import { FlashcardsViewSwitch } from "@/components/flashcards/shared/flashcards-view-switch";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import {
  getAllDecksWithPathsForUser,
  getDeckTreeForUser,
} from "@/features/decks/queries";
import {
  getFlashcardReviewStateForUser,
  getFlashcardStatisticsForUser,
} from "@/features/flashcard-review/queries";
import { getFlashcardsManagePageForUser } from "@/features/flashcards/queries";
import { resolveFlashcardsView } from "@/features/flashcards/view";
import { isAiEnabled } from "@/lib/ai/config";
import { requireSession } from "@/lib/auth/auth";

interface FlashcardsPageProps {
  searchParams: Promise<{
    view?: string;
    deckId?: string;
  }>;
}

export default async function FlashcardsPage({
  searchParams,
}: Readonly<FlashcardsPageProps>) {
  const session = await requireSession();
  const aiEnabled = isAiEnabled();
  const { view, deckId } = await searchParams;
  const currentView = resolveFlashcardsView(view);
  const [decks, deckTree] = await Promise.all([
    getAllDecksWithPathsForUser(session.user.id),
    getDeckTreeForUser(session.user.id),
  ]);

  const scopedDeckId =
    deckId && decks.some((deck) => deck.id === deckId) ? deckId : undefined;

  const initialManagePageData = getFlashcardsManagePageForUser(
    session.user.id,
    {
      pageIndex: 0,
      pageSize: 25,
      deckId: scopedDeckId,
      search: "",
    },
  );

  const initialReviewState = getFlashcardReviewStateForUser(
    session.user.id,
    { deckId: scopedDeckId, limit: 50 },
  );

  const statistics = getFlashcardStatisticsForUser(
    session.user.id,
    new Date(),
    { deckId: scopedDeckId },
  );

  const [initialManagePageDataResult, initialReviewStateResult, statisticsResult] =
    await Promise.all([initialManagePageData, initialReviewState, statistics]);

  return (
    <FeaturePageShell
      title="Flashcards"
      description="Review due cards, manage your library, or inspect study statistics."
      icon={Layers3}
      switcher={
        <FlashcardsViewSwitch
          currentView={currentView}
          manageLabel="Manage"
          reviewLabel="Review"
          statisticsLabel="Statistics"
          deckId={scopedDeckId}
        />
      }
    >
      <FlashcardsPageClient
        currentView={currentView}
        scopedDeckId={scopedDeckId}
        deckTree={deckTree}
        decks={decks}
        initialManagePageData={initialManagePageDataResult}
        initialReviewState={initialReviewStateResult}
        statistics={statisticsResult}
        aiEnabled={aiEnabled}
      />
    </FeaturePageShell>
  );
}