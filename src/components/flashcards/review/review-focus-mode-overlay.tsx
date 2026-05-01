"use client";

import { GraduationCap, X } from "lucide-react";
import { ReviewGradeButtons } from "@/components/flashcards/review/review-grade-buttons";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { Button } from "@/components/ui/button";
import type { FlashcardReviewSyncStatus } from "@/features/flashcard-review/offline-store";
import type { getFlashcardReviewPreviewLabels } from "@/features/flashcard-review/preview";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type {
  DeckEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import { isDeckOption } from "@/lib/utils";

type ReviewCard = FlashcardReviewState["cards"][number];

interface FocusModeOverlayProps {
  currentCard: ReviewCard | null;
  reviewState: FlashcardReviewState;
  decks: DeckEntity[];
  progress: number;
  revealed: boolean;
  isPending: boolean;
  pendingGrade: ReviewGrade | null;
  syncStatus: FlashcardReviewSyncStatus;
  pendingSyncCount: number;
  previewLabels: ReturnType<typeof getFlashcardReviewPreviewLabels> | null;
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
  onExitFocusMode: () => void;
  isExamMode?: boolean;
  examCurrentIndex?: number;
  examTotalCards?: number;
}

const reviewRichTextClassName =
  "flashcard-review-tiptap-content min-w-0 max-w-full wrap-break-word hyphens-auto";

export function FocusModeOverlay({
  currentCard,
  reviewState,
  decks,
  progress,
  revealed,
  isPending,
  pendingGrade,
  syncStatus,
  pendingSyncCount,
  previewLabels,
  onReveal,
  onGrade,
  onExitFocusMode,
  isExamMode = false,
  examCurrentIndex = 0,
  examTotalCards = 0,
}: Readonly<FocusModeOverlayProps>) {
  const currentDeck = decks.find((deck) => deck.id === currentCard?.deckId);
  const currentDeckLabel =
    currentCard?.deckPath ??
    (currentDeck
      ? isDeckOption(currentDeck)
        ? currentDeck.path
        : currentDeck.name
      : "");
  const focusDueCountText =
    reviewState.summary.dueCount === 0
      ? "No cards due right now"
      : `${reviewState.summary.dueCount} due of ${reviewState.summary.totalCount} total cards`;
  const headerText = isExamMode
    ? `Card ${examCurrentIndex + 1} of ${examTotalCards}`
    : focusDueCountText;
  const syncText =
    syncStatus === "error"
      ? "Sync failed"
      : pendingSyncCount > 0
        ? `${pendingSyncCount} pending sync`
        : syncStatus === "syncing"
          ? "Syncing"
          : "";

  if (!currentCard) {
    return (
      <div className="fixed inset-0 z-110 flex flex-col overflow-hidden bg-background">
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">All caught up!</h1>
          <p className="mb-8 text-muted-foreground">
            There are no due flashcards to review.
          </p>
          <Button onClick={onExitFocusMode}>Exit Focus Mode</Button>
        </div>
      </div>
    );
  }

  const examBadgeClassName =
    "flex items-center gap-1.5 rounded-md border-2 border-[var(--intent-info-border)] bg-[var(--intent-info-bg)] px-2 py-1 text-xs font-bold tracking-wider text-[var(--intent-info-text)] uppercase";
  return (
    <div className="fixed inset-0 z-110 flex flex-col overflow-hidden bg-background">
      <div className="flex h-full flex-col">
        <progress
          className="h-1 w-full appearance-none overflow-hidden bg-muted [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
          value={Math.round(progress * 100)}
          max={100}
          aria-label="Review progress"
        />

        <div className="flex items-center justify-between px-4 py-3">
          {isExamMode ? (
            <div className={examBadgeClassName}>
              <GraduationCap className="size-3.5" />
              <span>EXAM</span>
            </div>
          ) : (
            <div className="size-10" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {headerText}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            aria-label="Exit Focus Mode"
            onClick={onExitFocusMode}
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
          {currentDeck && (
            <p className="mb-3 text-xs font-semibold tracking-wider text-primary/80 uppercase">
              {currentDeckLabel}
            </p>
          )}
          {syncText ? (
            <p className="mb-3 text-xs font-semibold tracking-wider text-(--intent-warning-text) uppercase">
              {syncText}
            </p>
          ) : null}

          <div className="relative flex flex-col rounded-xl border border-border/60 bg-card">
            <div className="flex flex-col p-6">
              <div className="flex flex-col">
                <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Front
                </h3>
                <div className="max-h-[40vh] overflow-y-auto pr-1 pb-3">
                  <TiptapRenderer
                    content={currentCard.front}
                    className={`${reviewRichTextClassName} text-lg leading-relaxed`}
                  />
                </div>
              </div>

              {revealed ? (
                <div className="flex flex-col border-t border-border/60 pt-4">
                  <h3 className="mb-2 text-xs font-semibold tracking-wider text-primary/80 uppercase">
                    Answer
                  </h3>
                  <div className="max-h-[40vh] overflow-y-auto pr-1 pb-3">
                    <TiptapRenderer
                      content={currentCard.back}
                      className={`${reviewRichTextClassName} text-lg leading-relaxed text-primary`}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 px-4 py-4">
          {revealed ? (
            <div className="w-full">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                <ReviewGradeButtons
                  pendingGrade={pendingGrade}
                  previewLabels={previewLabels}
                  isPending={isPending}
                  onGrade={onGrade}
                />
              </div>
            </div>
          ) : (
            <Button
              onClick={onReveal}
              disabled={isPending}
              className="h-14 w-full text-base"
            >
              Show Answer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
