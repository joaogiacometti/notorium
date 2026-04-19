"use client";

import { useEffect, useState } from "react";
import { isEditableTarget } from "@/lib/shortcuts/registry";
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
import { cn } from "@/lib/utils";

const STORAGE_KEY = "flashcards-sidebar-visible";

interface FlashcardsPageClientProps {
  currentView: FlashcardsView;
  scopedDeckId?: string;
  deckTree: DeckTreeNode[];
  decks: DeckEntity[];
  initialManagePageData: FlashcardManagePage;
  initialReviewState: FlashcardReviewState;
  statistics: FlashcardStatisticsState;
  aiEnabled: boolean;
}

function readSidebarVisible(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

function writeSidebarVisible(visible: boolean): void {
  localStorage.setItem(STORAGE_KEY, visible ? "true" : "false");
}

export function FlashcardsPageClient({
  currentView,
  scopedDeckId,
  deckTree,
  decks,
  initialManagePageData,
  initialReviewState,
  statistics,
  aiEnabled,
}: Readonly<FlashcardsPageClientProps>) {
  const [sidebarVisible, setSidebarVisible] = useState(() =>
    readSidebarVisible(),
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "b") return;
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.altKey) return;
      if (e.repeat) return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      setSidebarVisible((prev) => {
        const next = !prev;
        writeSidebarVisible(next);
        return next;
      });
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const scopeKey = `${currentView}:${scopedDeckId ?? "all"}`;

  return (
    <div
      className={cn(
        "grid gap-4 lg:h-full lg:min-h-0",
        sidebarVisible
          ? "lg:grid-cols-[18rem_minmax(0,1fr)]"
          : "lg:grid-cols-[1fr]",
      )}
    >
      {sidebarVisible && (
        <DeckTreeSidebar
          deckTree={deckTree}
          selectedDeckId={scopedDeckId}
          currentView={currentView}
        />
      )}
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
          aiEnabled={aiEnabled}
        />
      )}
    </div>
  );
}
