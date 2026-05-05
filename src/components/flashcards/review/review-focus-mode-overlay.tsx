"use client";

import {
  GraduationCap,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { ReviewGradeButtons } from "@/components/flashcards/review/review-grade-buttons";
import { ReviewSessionCardContent } from "@/components/flashcards/review/review-session-card-content";
import { ReviewSessionShell } from "@/components/flashcards/review/review-session-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FlashcardReviewSyncStatus } from "@/features/flashcard-review/offline-store";
import type { getFlashcardReviewPreviewLabels } from "@/features/flashcard-review/preview";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type {
  DeckEntity,
  DeckOption,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import { isDeckOption } from "@/lib/utils";

type ReviewCard = FlashcardReviewState["cards"][number];

interface FocusModeOverlayProps {
  currentCard: ReviewCard | null;
  reviewState: FlashcardReviewState;
  decks: Array<DeckEntity | DeckOption>;
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
  onEditFlashcard: () => void;
  onResetFlashcard: () => void;
  onDeleteFlashcard: () => void;
  isExamMode?: boolean;
  examCurrentIndex?: number;
  examTotalCards?: number;
}

/**
 * Routes the focus overlay to the due-review or exam session presentation.
 *
 * @example
 * <FocusModeOverlay currentCard={card} reviewState={state} decks={decks} progress={0} revealed={false} isPending={false} pendingGrade={null} syncStatus="idle" pendingSyncCount={0} previewLabels={null} onReveal={showBack} onGrade={gradeCard} onExitFocusMode={exit} />
 */
export function FocusModeOverlay(props: Readonly<FocusModeOverlayProps>) {
  if (!props.currentCard) {
    return <ReviewSessionEmptyState onExit={props.onExitFocusMode} />;
  }

  if (props.isExamMode) {
    return <ExamFocusModeOverlay {...props} currentCard={props.currentCard} />;
  }

  return (
    <DueReviewFocusModeOverlay {...props} currentCard={props.currentCard} />
  );
}

interface SessionOverlayProps extends FocusModeOverlayProps {
  currentCard: ReviewCard;
}

function DueReviewFocusModeOverlay({
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
  onEditFlashcard,
  onResetFlashcard,
  onDeleteFlashcard,
}: Readonly<SessionOverlayProps>) {
  const footer = getSessionFooter({
    revealed,
    isPending,
    pendingGrade,
    previewLabels,
    onReveal,
    onGrade,
  });

  return (
    <ReviewSessionShell
      progress={progress}
      headerText={getDueReviewHeaderText(reviewState)}
      exitLabel="Exit Focus Mode"
      onExit={onExitFocusMode}
      actions={
        <FocusModeCardActions
          isPending={isPending}
          onEditFlashcard={onEditFlashcard}
          onResetFlashcard={onResetFlashcard}
          onDeleteFlashcard={onDeleteFlashcard}
        />
      }
      footer={footer}
    >
      <ReviewStatusText
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
      />
      <ReviewSessionCardContent
        card={currentCard}
        deckLabel={getDeckLabel(currentCard, decks)}
        revealed={revealed}
      />
    </ReviewSessionShell>
  );
}

function ExamFocusModeOverlay({
  currentCard,
  decks,
  progress,
  revealed,
  isPending,
  pendingGrade,
  previewLabels,
  onReveal,
  onGrade,
  onExitFocusMode,
  onEditFlashcard,
  onResetFlashcard,
  onDeleteFlashcard,
  examCurrentIndex = 0,
  examTotalCards = 0,
}: Readonly<SessionOverlayProps>) {
  const footer = getSessionFooter({
    revealed,
    isPending,
    pendingGrade,
    previewLabels,
    onReveal,
    onGrade,
  });

  return (
    <ReviewSessionShell
      progress={progress}
      headerText={`Card ${examCurrentIndex + 1} of ${examTotalCards}`}
      exitLabel="Exit Focus Mode"
      onExit={onExitFocusMode}
      badge={<ExamBadge />}
      actions={
        <FocusModeCardActions
          isPending={isPending}
          onEditFlashcard={onEditFlashcard}
          onResetFlashcard={onResetFlashcard}
          onDeleteFlashcard={onDeleteFlashcard}
        />
      }
      footer={footer}
    >
      <ReviewSessionCardContent
        card={currentCard}
        deckLabel={getDeckLabel(currentCard, decks)}
        revealed={revealed}
      />
    </ReviewSessionShell>
  );
}

interface FocusModeCardActionsProps {
  isPending: boolean;
  onEditFlashcard: () => void;
  onResetFlashcard: () => void;
  onDeleteFlashcard: () => void;
}

function FocusModeCardActions({
  isPending,
  onEditFlashcard,
  onResetFlashcard,
  onDeleteFlashcard,
}: Readonly<FocusModeCardActionsProps>) {
  if (isPending) {
    return <FocusModeCardActionsButton disabled />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          aria-label="Open flashcard actions"
        >
          <MoreVertical className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-120">
        <DropdownMenuItem onClick={onEditFlashcard} className="cursor-pointer">
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResetFlashcard} className="cursor-pointer">
          <RotateCcw className="size-4" />
          Reset
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDeleteFlashcard}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FocusModeCardActionsButton({
  disabled = false,
}: Readonly<{ disabled?: boolean }>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10"
      aria-label="Open flashcard actions"
      disabled={disabled}
    >
      <MoreVertical className="size-5" />
    </Button>
  );
}

interface SessionFooterParams {
  revealed: boolean;
  isPending: boolean;
  pendingGrade: ReviewGrade | null;
  previewLabels: ReturnType<typeof getFlashcardReviewPreviewLabels> | null;
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
}

function getSessionFooter({
  revealed,
  isPending,
  pendingGrade,
  previewLabels,
  onReveal,
  onGrade,
}: Readonly<SessionFooterParams>) {
  if (!revealed) {
    return (
      <Button size="lg" className="h-12 w-full text-base" onClick={onReveal}>
        Show Answer
      </Button>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <ReviewGradeButtons
          pendingGrade={pendingGrade}
          previewLabels={previewLabels}
          isPending={isPending}
          onGrade={onGrade}
        />
      </div>
    </div>
  );
}

function ReviewSessionEmptyState({ onExit }: Readonly<{ onExit: () => void }>) {
  return (
    <div className="fixed inset-0 z-110 flex flex-col overflow-hidden bg-background">
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-2 text-2xl font-bold">All caught up!</h1>
        <p className="mb-8 text-muted-foreground">
          There are no due flashcards to review.
        </p>
        <Button onClick={onExit}>Exit Focus Mode</Button>
      </div>
    </div>
  );
}

function ReviewStatusText({
  syncStatus,
  pendingSyncCount,
}: Readonly<{
  syncStatus: FlashcardReviewSyncStatus;
  pendingSyncCount: number;
}>) {
  const syncText = getReviewSessionSyncText(syncStatus, pendingSyncCount);

  if (!syncText) {
    return null;
  }

  return (
    <p className="mb-3 text-sm font-medium text-muted-foreground">{syncText}</p>
  );
}

function ExamBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-md border-2 border-[var(--intent-info-border)] bg-[var(--intent-info-bg)] px-2 py-1 text-xs font-bold tracking-wider text-[var(--intent-info-text)] uppercase">
      <GraduationCap className="size-3.5" />
      <span>Exam</span>
    </div>
  );
}

function getDeckLabel(
  currentCard: ReviewCard,
  decks: Array<DeckEntity | DeckOption>,
) {
  const currentDeck = decks.find((deck) => deck.id === currentCard.deckId);

  if (currentCard.deckPath) {
    return currentCard.deckPath;
  }

  if (!currentDeck) {
    return "";
  }

  return isDeckOption(currentDeck) ? currentDeck.path : currentDeck.name;
}

function getDueReviewHeaderText(reviewState: FlashcardReviewState) {
  if (reviewState.summary.dueCount === 0) {
    return "No cards due right now";
  }

  return `${reviewState.summary.dueCount} due of ${reviewState.summary.totalCount} total cards`;
}

function getReviewSessionSyncText(
  syncStatus: FlashcardReviewSyncStatus,
  pendingSyncCount: number,
) {
  if (syncStatus === "error") {
    return "Sync failed";
  }

  if (pendingSyncCount > 0) {
    return `${pendingSyncCount} pending sync`;
  }

  return syncStatus === "syncing" ? "Syncing" : "";
}
