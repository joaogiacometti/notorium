"use client";

import { DeckTreeSidebar } from "@/components/decks/deck-tree-sidebar";
import { FlashcardsManager } from "@/components/flashcards/manage/flashcards-manager";
import { FlashcardReviewClient } from "@/components/flashcards/review/flashcard-review-client";
import { FlashcardsStatistics } from "@/components/flashcards/shared/flashcards-statistics";
import type { FlashcardsView } from "@/features/flashcards/view";
import type {
  DeckEntity,
  DeckTreeNode,
  FlashcardManagePage,
  FlashcardReviewState,
  FlashcardStatisticsState,
} from "@/lib/server/api-contracts";

interface FlashcardsPageClientProps {
  currentView: FlashcardsView;
  scopedDeckId?: string;
  initialSearch?: string;
  deckTree: DeckTreeNode[];
  decks: DeckEntity[];
  initialManagePageData: FlashcardManagePage;
  initialReviewState: FlashcardReviewState;
  statistics: FlashcardStatisticsState;
  aiEnabled: boolean;
}

export function FlashcardsPageClient({
  currentView,
  scopedDeckId,
  initialSearch,
  deckTree,
  decks,
  initialManagePageData,
  initialReviewState,
  statistics,
  aiEnabled,
}: Readonly<FlashcardsPageClientProps>) {
  const scopeKey = `${currentView}:${scopedDeckId ?? "all"}`;

  return (
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <DeckTreeSidebar
        deckTree={deckTree}
        selectedDeckId={scopedDeckId}
        currentView={currentView}
      />
      {currentView === "review" && (
        <FlashcardReviewClient
          key={scopeKey}
          initialState={initialReviewState}
          deckId={scopedDeckId}
          decks={decks}
          aiEnabled={aiEnabled}
          embedded
        />
      )}
      {currentView === "statistics" && (
        <FlashcardsStatistics
          statistics={statistics}
          decks={decks}
          deckId={scopedDeckId}
        />
      )}
      {currentView === "manage" && (
        <FlashcardsManager
          key={scopeKey}
          initialPageData={initialManagePageData}
          initialDeckId={scopedDeckId}
          initialSearch={initialSearch}
          aiEnabled={aiEnabled}
        />
      )}
    </div>
  );
}
