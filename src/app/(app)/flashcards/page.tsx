import { Layers3 } from "lucide-react";
import type { ReactNode } from "react";
import { DeckTreeSidebar } from "@/components/decks/deck-tree-sidebar";
import { FlashcardsManager } from "@/components/flashcards/manage/flashcards-manager";
import { FlashcardReviewClient } from "@/components/flashcards/review/flashcard-review-client";
import { FlashcardsStatistics } from "@/components/flashcards/shared/flashcards-statistics";
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
  const scopeKey = `${currentView}:${scopedDeckId ?? "all"}`;
  function renderFlashcardsPage(children: ReactNode) {
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
        {children}
      </FeaturePageShell>
    );
  }

  if (currentView === "review") {
    const reviewState = await getFlashcardReviewStateForUser(session.user.id, {
      deckId: scopedDeckId,
      limit: 50,
    });

    return renderFlashcardsPage(
      <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <DeckTreeSidebar
          deckTree={deckTree}
          selectedDeckId={scopedDeckId}
          currentView={currentView}
        />
        <FlashcardReviewClient
          key={scopeKey}
          initialState={reviewState}
          deckId={scopedDeckId}
          decks={decks}
          aiEnabled={aiEnabled}
          embedded
        />
      </div>,
    );
  }

  if (currentView === "statistics") {
    const statistics = await getFlashcardStatisticsForUser(
      session.user.id,
      new Date(),
      { deckId: scopedDeckId },
    );
    return renderFlashcardsPage(
      <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <DeckTreeSidebar
          deckTree={deckTree}
          selectedDeckId={scopedDeckId}
          currentView={currentView}
        />
        <FlashcardsStatistics
          statistics={statistics}
          decks={decks}
          deckId={scopedDeckId}
        />
      </div>,
    );
  }

  const initialPageData = await getFlashcardsManagePageForUser(
    session.user.id,
    {
      pageIndex: 0,
      pageSize: 25,
      deckId: scopedDeckId,
      search: "",
    },
  );

  return renderFlashcardsPage(
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <DeckTreeSidebar
        deckTree={deckTree}
        selectedDeckId={scopedDeckId}
        currentView={currentView}
      />
      <FlashcardsManager
        key={scopeKey}
        initialPageData={initialPageData}
        initialDeckId={scopedDeckId}
        aiEnabled={aiEnabled}
      />
    </div>,
  );
}
