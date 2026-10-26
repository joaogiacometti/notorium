"use client";

import {
  Copy,
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
import { copyFlashcardsWithToast } from "@/components/flashcards/shared/copy-flashcards-with-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewState,
  SubjectEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";
import { isSubjectOption } from "@/lib/utils";

type ReviewCard = FlashcardReviewState["cards"][number];

interface ReviewSessionScreenProps {
  currentCard: ReviewCard | null;
  headerText: string;
  subjects: Array<SubjectEntity | SubjectOption>;
  progress: number;
  revealed: boolean;
  isPending: boolean;
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
  canUndoReview: boolean;
  isLoadingMoreCards?: boolean;
  onUndoReview: () => void;
  onExit: () => void;
  onEditFlashcard: () => void;
  onResetFlashcard: () => void;
  onDeleteFlashcard: () => void;
  isExamMode?: boolean;
}

/**
 * Routes the session page to the due-review or exam session presentation.
 *
 * @example
 * <ReviewSessionScreen currentCard={card} headerText="3 due of 10 total cards" subjects={subjects} progress={0} revealed={false} isPending={false} onReveal={showBack} onGrade={gradeCard} onExit={exit} />
 */
export function ReviewSessionScreen(props: Readonly<ReviewSessionScreenProps>) {
  if (!props.currentCard) {
    return (
      <ReviewSessionEmptyState
        isLoadingMoreCards={props.isLoadingMoreCards ?? false}
        isPending={props.isPending}
        canUndoReview={props.canUndoReview}
        onUndoReview={props.onUndoReview}
        onExit={props.onExit}
      />
    );
  }

  if (props.isExamMode) {
    return <ExamSessionScreen {...props} currentCard={props.currentCard} />;
  }

  return <DueReviewSessionScreen {...props} currentCard={props.currentCard} />;
}

interface SessionScreenProps extends ReviewSessionScreenProps {
  currentCard: ReviewCard;
}

function DueReviewSessionScreen({
  currentCard,
  headerText,
  subjects,
  progress,
  revealed,
  isPending,
  onReveal,
  onGrade,
  onExit,
  onEditFlashcard,
  onResetFlashcard,
  onDeleteFlashcard,
  canUndoReview,
  onUndoReview,
}: Readonly<SessionScreenProps>) {
  const footer = getSessionFooter({
    revealed,
    isPending,
    onReveal,
    onGrade,
  });

  return (
    <ReviewSessionShell
      progress={progress}
      headerText={headerText}
      exitLabel="Exit review"
      onExit={onExit}
      actions={
        <SessionCardActions
          isPending={isPending}
          canUndoReview={canUndoReview}
          onUndoReview={onUndoReview}
          onCopyFlashcard={() => copyReviewCard(currentCard, subjects)}
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

function ExamSessionScreen({
  currentCard,
  headerText,
  subjects,
  progress,
  revealed,
  isPending,
  onReveal,
  onGrade,
  onExit,
  onEditFlashcard,
  onResetFlashcard,
  onDeleteFlashcard,
  onUndoReview,
}: Readonly<SessionScreenProps>) {
  const footer = getSessionFooter({
    revealed,
    isPending,
    onReveal,
    onGrade,
  });

  return (
    <ReviewSessionShell
      progress={progress}
      headerText={headerText}
      exitLabel="Exit exam"
      onExit={onExit}
      badge={<ExamBadge />}
      actions={
        <SessionCardActions
          isPending={isPending}
          canUndoReview={false}
          onUndoReview={onUndoReview}
          onCopyFlashcard={() => copyReviewCard(currentCard, subjects)}
          onEditFlashcard={onEditFlashcard}
          onResetFlashcard={onResetFlashcard}
          onDeleteFlashcard={onDeleteFlashcard}
        />
      }
      footer={footer}
    >
      <ReviewSessionCardContent
        mode="exam"
        card={currentCard}
        subjectLabel={getSubjectLabel(currentCard, subjects)}
        revealed={revealed}
      />
    </ReviewSessionShell>
  );
}

interface SessionCardActionsProps {
  isPending: boolean;
  canUndoReview: boolean;
  cardActions?: boolean;
  onUndoReview: () => void;
  onCopyFlashcard?: () => void;
  onEditFlashcard?: () => void;
  onResetFlashcard?: () => void;
  onDeleteFlashcard?: () => void;
}

function SessionCardActions({
  isPending,
  canUndoReview,
  cardActions = true,
  onUndoReview,
  onCopyFlashcard,
  onEditFlashcard,
  onResetFlashcard,
  onDeleteFlashcard,
}: Readonly<SessionCardActionsProps>) {
  if (isPending) {
    return <SessionCardActionsPendingButton />;
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
      <DropdownMenuContent align="end">
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
              onClick={onCopyFlashcard}
              className="cursor-pointer"
            >
              <Copy className="size-4" />
              Copy
            </DropdownMenuItem>
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

function SessionCardActionsPendingButton() {
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
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
}

function getSessionFooter({
  revealed,
  isPending,
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
        <ReviewGradeButtons isPending={isPending} onGrade={onGrade} />
      </div>
    </div>
  );
}

interface ReviewSessionEmptyStateProps {
  isLoadingMoreCards: boolean;
  isPending: boolean;
  canUndoReview: boolean;
  onUndoReview: () => void;
  onExit: () => void;
}

function ReviewSessionEmptyState({
  isLoadingMoreCards,
  isPending,
  canUndoReview,
  onUndoReview,
  onExit,
}: Readonly<ReviewSessionEmptyStateProps>) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      {canUndoReview ? (
        <div className="absolute top-3 right-4">
          <SessionCardActions
            isPending={isPending}
            canUndoReview
            cardActions={false}
            onUndoReview={onUndoReview}
          />
        </div>
      ) : null}
      {isLoadingMoreCards ? (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <Loader2 className="mb-3 size-6 animate-spin text-muted-foreground" />
          <p className="mb-8 max-w-sm text-muted-foreground">
            Loading more cards…
          </p>
          <Button variant="outline" onClick={onExit}>
            Back to flashcards
          </Button>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">
            All caught up
          </h1>
          <p className="mb-8 max-w-sm text-muted-foreground">
            No due flashcards in this scope right now.
          </p>
          <Button onClick={onExit}>Back to flashcards</Button>
        </div>
      )}
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

function copyReviewCard(
  currentCard: ReviewCard,
  subjects: Array<SubjectEntity | SubjectOption>,
): void {
  void copyFlashcardsWithToast([
    {
      front: currentCard.front,
      back: currentCard.back,
      subjectPath: getSubjectLabel(currentCard, subjects),
    },
  ]);
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
