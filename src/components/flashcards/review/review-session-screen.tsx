"use client";

import {
  Copy,
  Loader2,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { ExamBadge } from "@/components/flashcards/review/exam-badge";
import { ReviewCardEditor } from "@/components/flashcards/review/review-card-editor";
import { ReviewGradeButtons } from "@/components/flashcards/review/review-grade-buttons";
import { ReviewSessionCardContent } from "@/components/flashcards/review/review-session-card-content";
import { ReviewSessionShell } from "@/components/flashcards/review/review-session-shell";
import { copyFlashcardsWithToast } from "@/components/flashcards/shared/copy-flashcards-with-toast";
import { StudyLaterMenuItem } from "@/components/flashcards/shared/study-later-menu-item";
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
  FlashcardEntity,
  FlashcardReviewState,
  FolderEntity,
  FolderOption,
} from "@/lib/server/api-contracts";
import { isFolderOption } from "@/lib/utils";

type ReviewCard = FlashcardReviewState["cards"][number];

interface ReviewSessionScreenProps {
  currentCard: ReviewCard | null;
  headerText: string;
  folders: Array<FolderEntity | FolderOption>;
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
  onToggleStudyLater: () => void;
  isExamMode?: boolean;
  /** The current card is open in the inline editor instead of being reviewed. */
  editing: boolean;
  onStopEditing: () => void;
  onFlashcardUpdated: (flashcard: FlashcardEntity) => void | Promise<void>;
}

/**
 * Routes the session page to the due-review or exam session presentation.
 *
 * @example
 * <ReviewSessionScreen currentCard={card} headerText="3 due of 10 total cards" folders={folders} progress={0} revealed={false} isPending={false} onReveal={showBack} onGrade={gradeCard} onExit={exit} />
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

  return <ActiveSessionScreen {...props} currentCard={props.currentCard} />;
}

interface SessionScreenProps extends ReviewSessionScreenProps {
  currentCard: ReviewCard;
}

function ActiveSessionScreen(props: Readonly<SessionScreenProps>) {
  const { currentCard, folders, isExamMode = false } = props;
  const folderLabel = getFolderLabel(currentCard, folders);
  const shellProps = {
    progress: props.progress,
    headerText: props.headerText,
    exitLabel: isExamMode ? "Exit exam" : "Exit review",
    onExit: props.onExit,
    badge: isExamMode ? <ExamBadge /> : undefined,
  };

  if (props.editing) {
    return (
      <ReviewCardEditor
        key={currentCard.id}
        card={currentCard}
        folderLabel={folderLabel}
        onSaved={props.onFlashcardUpdated}
        onClose={props.onStopEditing}
        renderSession={(content, footer) => (
          <ReviewSessionShell {...shellProps} footer={footer}>
            {content}
          </ReviewSessionShell>
        )}
      />
    );
  }

  return (
    <ReviewSessionShell
      {...shellProps}
      actions={
        <SessionCardActions
          isPending={props.isPending}
          canUndoReview={!isExamMode && props.canUndoReview}
          onUndoReview={props.onUndoReview}
          onCopyFlashcard={() => copyReviewCard(currentCard, folders)}
          studyLaterMarked={currentCard.studyLaterAt !== null}
          onToggleStudyLater={props.onToggleStudyLater}
          onEditFlashcard={props.onEditFlashcard}
          onResetFlashcard={props.onResetFlashcard}
          onDeleteFlashcard={props.onDeleteFlashcard}
        />
      }
      footer={getSessionFooter(props)}
    >
      <ReviewSessionCardContent
        mode={isExamMode ? "exam" : "review"}
        card={currentCard}
        folderLabel={folderLabel}
        revealed={props.revealed}
      />
    </ReviewSessionShell>
  );
}

interface SessionCardActionsProps {
  isPending: boolean;
  canUndoReview: boolean;
  cardActions?: boolean;
  studyLaterMarked?: boolean;
  onUndoReview: () => void;
  onToggleStudyLater?: () => void;
  onCopyFlashcard?: () => void;
  onEditFlashcard?: () => void;
  onResetFlashcard?: () => void;
  onDeleteFlashcard?: () => void;
}

function SessionCardActions({
  isPending,
  canUndoReview,
  cardActions = true,
  studyLaterMarked = false,
  onUndoReview,
  onToggleStudyLater,
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
            <StudyLaterMenuItem
              marked={studyLaterMarked}
              onSelect={() => onToggleStudyLater?.()}
            />
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
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Loader2 className="mb-3 size-6 animate-spin text-muted-foreground" />
          <p className="mb-8 max-w-sm text-muted-foreground">
            Loading more cards…
          </p>
          <Button variant="outline" onClick={onExit}>
            Back to flashcards
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1 className="mb-2 text-xl font-semibold tracking-tight">
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

function copyReviewCard(
  currentCard: ReviewCard,
  folders: Array<FolderEntity | FolderOption>,
): void {
  void copyFlashcardsWithToast([
    {
      front: currentCard.front,
      back: currentCard.back,
      folderPath: getFolderLabel(currentCard, folders),
    },
  ]);
}

function getFolderLabel(
  currentCard: ReviewCard,
  folders: Array<FolderEntity | FolderOption>,
) {
  if (currentCard.folderPath) {
    return currentCard.folderPath;
  }

  const currentFolder = folders?.find(
    (folder) => folder.id === currentCard.folderId,
  );

  if (!currentFolder) {
    return "";
  }

  return isFolderOption(currentFolder)
    ? currentFolder.path
    : currentFolder.name;
}
