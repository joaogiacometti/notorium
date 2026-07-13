"use client";

import {
  GraduationCap,
  Loader2,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { ReviewGradeButtons } from "@/components/flashcards/review/review-grade-buttons";
import { ReviewSessionCardContent } from "@/components/flashcards/review/review-session-card-content";
import { ReviewSessionShell } from "@/components/flashcards/review/review-session-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { getFlashcardReviewPreviewLabels } from "@/features/flashcard-review/preview";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewState,
  SubjectEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";
import { isSubjectOption } from "@/lib/utils";

type ReviewCard = FlashcardReviewState["cards"][number];

interface FocusModeOverlayProps {
  currentCard: ReviewCard | null;
  reviewState: FlashcardReviewState;
  subjects: Array<SubjectEntity | SubjectOption>;
  progress: number;
  revealed: boolean;
  isPending: boolean;
  pendingGrade: ReviewGrade | null;
  previewLabels: ReturnType<typeof getFlashcardReviewPreviewLabels> | null;
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
  canUndoReview: boolean;
  onUndoReview: () => void;
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
 * <FocusModeOverlay currentCard={card} reviewState={state} subjects={subjects} progress={0} revealed={false} isPending={false} pendingGrade={null} previewLabels={null} onReveal={showBack} onGrade={gradeCard} onExitFocusMode={exit} />
 */
export function FocusModeOverlay(props: Readonly<FocusModeOverlayProps>) {
  if (!props.currentCard) {
    return (
      <ReviewSessionEmptyState
        isPending={props.isPending}
        canUndoReview={props.canUndoReview}
        onUndoReview={props.onUndoReview}
        onExit={props.onExitFocusMode}
      />
    );
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
  subjects,
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
  canUndoReview,
  onUndoReview,
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
          canUndoReview={canUndoReview}
          onUndoReview={onUndoReview}
          onEditFlashcard={onEditFlashcard}
          onResetFlashcard={onResetFlashcard}
          onDeleteFlashcard={onDeleteFlashcard}
        />
      }
      footer={footer}
    >
      <ReviewSessionCardContent
        card={currentCard}
        subjectLabel={getSubjectLabel(currentCard, subjects)}
        revealed={revealed}
      />
    </ReviewSessionShell>
  );
}

function ExamFocusModeOverlay({
  currentCard,
  subjects,
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
  onUndoReview,
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
          canUndoReview={false}
          onUndoReview={onUndoReview}
          onEditFlashcard={onEditFlashcard}
          onResetFlashcard={onResetFlashcard}
          onDeleteFlashcard={onDeleteFlashcard}
        />
      }
      footer={footer}
    >
      <ReviewSessionCardContent
        card={currentCard}
        subjectLabel={getSubjectLabel(currentCard, subjects)}
        revealed={revealed}
      />
    </ReviewSessionShell>
  );
}

interface FocusModeCardActionsProps {
  isPending: boolean;
  canUndoReview: boolean;
  cardActions?: boolean;
  onUndoReview: () => void;
  onEditFlashcard?: () => void;
  onResetFlashcard?: () => void;
  onDeleteFlashcard?: () => void;
}

function FocusModeCardActions({
  isPending,
  canUndoReview,
  cardActions = true,
  onUndoReview,
  onEditFlashcard,
  onResetFlashcard,
  onDeleteFlashcard,
}: Readonly<FocusModeCardActionsProps>) {
  if (isPending) {
    return <FocusModeCardActionsPendingButton />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          aria-label="Open review actions"
        >
          <MoreVertical className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-120">
        {canUndoReview ? (
          <>
            <DropdownMenuItem onClick={onUndoReview} className="cursor-pointer">
              <Undo2 className="size-4" />
              Undo last review
            </DropdownMenuItem>
            {cardActions ? <DropdownMenuSeparator /> : null}
          </>
        ) : null}
        {cardActions ? (
          <>
            <DropdownMenuItem
              onClick={onEditFlashcard}
              className="cursor-pointer"
            >
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onResetFlashcard}
              className="cursor-pointer"
            >
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
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FocusModeCardActionsPendingButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10"
      aria-label="Review action in progress"
      aria-busy="true"
      disabled
    >
      <Loader2 className="size-5 animate-spin" />
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
      <Button
        size="lg"
        className="h-12 w-full text-base sm:h-14"
        onClick={onReveal}
        aria-keyshortcuts="Enter"
      >
        Show answer
      </Button>
    );
  }

  return (
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
  );
}

interface ReviewSessionEmptyStateProps {
  isPending: boolean;
  canUndoReview: boolean;
  onUndoReview: () => void;
  onExit: () => void;
}

function ReviewSessionEmptyState({
  isPending,
  canUndoReview,
  onUndoReview,
  onExit,
}: Readonly<ReviewSessionEmptyStateProps>) {
  return (
    <div className="fixed inset-0 z-110 flex flex-col overflow-hidden bg-background">
      {canUndoReview ? (
        <div className="absolute top-3 right-4">
          <FocusModeCardActions
            isPending={isPending}
            canUndoReview
            cardActions={false}
            onUndoReview={onUndoReview}
          />
        </div>
      ) : null}
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          All caught up
        </h1>
        <p className="mb-8 max-w-sm text-muted-foreground">
          No due flashcards in this scope right now.
        </p>
        <Button onClick={onExit}>Exit focus mode</Button>
      </div>
    </div>
  );
}

function ExamBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-[var(--intent-info-border)] bg-[var(--intent-info-bg)] px-2 py-1 text-xs font-semibold tracking-wider text-[var(--intent-info-text)] uppercase">
      <GraduationCap className="size-3.5" />
      <span>Exam</span>
    </div>
  );
}

function getSubjectLabel(
  currentCard: ReviewCard,
  subjects: Array<SubjectEntity | SubjectOption>,
) {
  if (currentCard.subjectPath) {
    return currentCard.subjectPath;
  }

  const currentSubject = subjects?.find(
    (subject) => subject.id === currentCard.subjectId,
  );

  if (!currentSubject) {
    return "";
  }

  return isSubjectOption(currentSubject)
    ? currentSubject.path
    : currentSubject.name;
}

function getDueReviewHeaderText(reviewState: FlashcardReviewState) {
  if (reviewState.summary.dueCount === 0) {
    return "No cards due right now";
  }

  return `${reviewState.summary.dueCount} due of ${reviewState.summary.totalCount} total cards`;
}
