"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DeckTreeSidebar } from "@/components/decks/deck-tree-sidebar";
import { LazyCreateFlashcardDialog } from "@/components/flashcards/dialogs/lazy-create-flashcard-dialog";
import { FlashcardsManager } from "@/components/flashcards/manage/flashcards-manager";
import { FlashcardReviewClient } from "@/components/flashcards/review/flashcard-review-client";
import { FlashcardsStatistics } from "@/components/flashcards/shared/flashcards-statistics";
import { MobileDeckScopePicker } from "@/components/flashcards/shared/mobile-deck-scope-picker";
import type { FlashcardsView } from "@/features/flashcards/view";
import type {
  DeckOption,
  DeckTreeNode,
  FlashcardManagePage,
  FlashcardReviewState,
  FlashcardStatisticsState,
} from "@/lib/server/api-contracts";

interface FlashcardsPageClientProps {
  currentView: FlashcardsView;
  scopedDeckId?: string;
  initialSearch?: string;
  initialPageSize: number;
  deckTree: DeckTreeNode[];
  decks: DeckOption[];
  initialManagePageData: FlashcardManagePage;
  initialReviewState: FlashcardReviewState;
  statistics: FlashcardStatisticsState;
  aiEnabled: boolean;
}

export function FlashcardsPageClient({
  currentView,
  scopedDeckId,
  initialSearch,
  initialPageSize,
  deckTree,
  decks,
  initialManagePageData,
  initialReviewState,
  statistics,
  aiEnabled,
}: Readonly<FlashcardsPageClientProps>) {
  const scopeKey = `${currentView}:${scopedDeckId ?? "all"}`;
  const queryClient = useQueryClient();
  const isReviewView = currentView === "review";
  const isStatisticsView = currentView === "statistics";
  const isCompactScopeView = isReviewView || isStatisticsView;

  function handleDeckDeleted() {
    void queryClient.invalidateQueries({
      queryKey: ["flashcards-manage-page"],
    });
  }

  function handleFlashcardCreated() {
    void queryClient.invalidateQueries({
      queryKey: ["flashcards-manage-page"],
    });
  }

  return (
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <DeckTreeSidebar
        deckTree={deckTree}
        selectedDeckId={scopedDeckId}
        currentView={currentView}
        aiEnabled={aiEnabled}
        className={isCompactScopeView ? "hidden lg:block" : undefined}
        CreateFlashcardDialogComponent={LazyCreateFlashcardDialog}
        onFlashcardCreated={handleFlashcardCreated}
        onDeckDeleted={handleDeckDeleted}
      />
      {isCompactScopeView && (
        <div className="min-w-0 space-y-3 lg:min-h-0">
          <MobileDeckScopePicker
            decks={decks}
            view={currentView}
            selectedDeckId={scopedDeckId}
            className="lg:hidden"
          />
          {isReviewView ? (
            <FlashcardReviewClient
              key={scopeKey}
              initialState={initialReviewState}
              deckId={scopedDeckId}
              decks={decks}
              aiEnabled={aiEnabled}
              embedded
            />
          ) : (
            <FlashcardsStatistics
              statistics={statistics}
              decks={decks}
              deckId={scopedDeckId}
            />
          )}
        </div>
      )}
      {currentView === "manage" && (
        <FlashcardsManager
          key={scopeKey}
          initialPageData={initialManagePageData}
          initialDeckId={scopedDeckId}
          initialSearch={initialSearch}
          initialPageSize={initialPageSize}
          aiEnabled={aiEnabled}
          hasDecks={decks.length > 0}
        />
      )}
    </div>
  );
}
