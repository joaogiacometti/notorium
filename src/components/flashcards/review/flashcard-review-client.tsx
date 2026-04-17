"use client";

import {
  CheckCircle2,
  CircleAlert,
  Gauge,
  GraduationCap,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  getExamFlashcards,
  getFlashcardReviewState,
  reviewFlashcard,
} from "@/app/actions/flashcard-review";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/dialogs/lazy-edit-flashcard-dialog";
import { ExamResultsScreen } from "@/components/flashcards/review/exam-results-screen";
import { useExamSession } from "@/components/flashcards/review/use-exam-session";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getFlashcardReviewPreviewLabels } from "@/features/flashcard-review/preview";
import {
  getFlashcardReviewShortcutAction,
  isEditableFlashcardReviewKeyboardTarget,
} from "@/features/flashcard-review/shortcuts";
import {
  applyReviewedFlashcardToState,
  mergeFlashcardReviewStates,
  replaceFlashcardInReviewState,
  shouldRefillFlashcardReviewState,
} from "@/features/flashcard-review/state";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type {
  DeckEntity,
  DeckOption,
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface FlashcardReviewClientProps {
  initialState: FlashcardReviewState;
  decks: Array<DeckEntity | DeckOption>;
  deckId?: string;
  embedded?: boolean;
  aiEnabled: boolean;
}

function getExamScopeKey(deckId?: string) {
  return deckId ?? "all";
}

const reviewGrades: ReviewGrade[] = ["again", "hard", "good", "easy"];
const reviewBatchLimit = 50;
const reviewRichTextClassName =
  "flashcard-review-tiptap-content min-w-0 max-w-full wrap-break-word hyphens-auto";
const gradeButtonStyles: Record<ReviewGrade, string> = {
  again:
    "border-[color:var(--intent-danger-border)] bg-[color:var(--intent-danger-bg)] text-[color:var(--intent-danger-text)] hover:border-[color:var(--intent-danger-border-hover)] hover:bg-[color:var(--intent-danger-bg-hover)]",
  hard: "border-[color:var(--intent-warning-border)] bg-[color:var(--intent-warning-bg)] text-[color:var(--intent-warning-text)] hover:border-[color:var(--intent-warning-border-hover)] hover:bg-[color:var(--intent-warning-bg-hover)]",
  good: "border-[color:var(--intent-info-border)] bg-[color:var(--intent-info-bg)] text-[color:var(--intent-info-text)] hover:border-[color:var(--intent-info-border-hover)] hover:bg-[color:var(--intent-info-bg-hover)]",
  easy: "border-[color:var(--intent-success-border)] bg-[color:var(--intent-success-bg)] text-[color:var(--intent-success-text)] hover:border-[color:var(--intent-success-border-hover)] hover:bg-[color:var(--intent-success-bg-hover)]",
};
const gradeIcons: Record<ReviewGrade, typeof CircleAlert> = {
  again: CircleAlert,
  hard: Gauge,
  good: CheckCircle2,
  easy: Sparkles,
};
const gradeLabels: Record<ReviewGrade, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

type ReviewCard = FlashcardReviewState["cards"][number];

interface ReviewGradeButtonsProps {
  pendingGrade: ReviewGrade | null;
  previewLabels: ReturnType<typeof getFlashcardReviewPreviewLabels> | null;
  isPending: boolean;
  onGrade: (grade: ReviewGrade) => void;
}

interface FocusModeOverlayProps {
  currentCard: ReviewCard | null;
  reviewState: FlashcardReviewState;
  decks: DeckEntity[];
  progress: number;
  revealed: boolean;
  isPending: boolean;
  pendingGrade: ReviewGrade | null;
  previewLabels: ReturnType<typeof getFlashcardReviewPreviewLabels> | null;
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
  onExitFocusMode: () => void;
  isExamMode?: boolean;
  examCurrentIndex?: number;
  examTotalCards?: number;
}

function isDeckOption(deck: DeckEntity | DeckOption): deck is DeckOption {
  return "path" in deck && typeof deck.path === "string";
}

function ReviewGradeButtons({
  pendingGrade,
  previewLabels,
  isPending,
  onGrade,
}: Readonly<ReviewGradeButtonsProps>) {
  return (
    <>
      {reviewGrades.map((grade) => {
        const Icon = gradeIcons[grade];
        const isActivePendingGrade = pendingGrade === grade;

        return (
          <Button
            key={grade}
            variant="outline"
            size="lg"
            onClick={() => onGrade(grade)}
            disabled={isPending}
            className={`h-auto min-h-14 w-full min-w-0 border-2 px-1 py-0.75 text-[11px] font-semibold leading-tight shadow-xs transition-transform hover:-translate-y-0.5 sm:min-h-16 sm:px-4 sm:py-2 sm:text-sm ${gradeButtonStyles[grade]}`}
          >
            <span className="flex min-w-0 flex-col items-center justify-center gap-px text-center">
              <span className="flex min-w-0 items-center gap-1 sm:gap-1.5">
                {isActivePendingGrade ? (
                  <Loader2 className="size-3.5 animate-spin sm:size-4" />
                ) : (
                  <Icon className="hidden size-4 sm:inline-flex" />
                )}
                <span className="truncate">{gradeLabels[grade]}</span>
              </span>
              {previewLabels ? (
                <span className="text-pretty whitespace-normal wrap-break-word text-[9px] leading-tight font-medium opacity-80 sm:text-[11px]">
                  {previewLabels[grade].durationText}
                </span>
              ) : null}
            </span>
          </Button>
        );
      })}
    </>
  );
}

function ReviewHubCardsLoading() {
  return (
    <div
      className="grid gap-4 lg:grid-cols-2"
      data-testid="flashcard-review-hub-loading"
    >
      {(["review", "exam"] as const).map((key) => (
        <Card key={key} className="gap-0 rounded-xl py-0 shadow-none">
          <CardContent className="flex h-full flex-col gap-3 p-4 sm:gap-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-7 w-32 sm:h-8" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-10/12" />
            </div>
            <div className="hidden space-y-1.5 sm:block">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="mt-auto h-10 w-full rounded-lg sm:h-11" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FocusModeOverlay({
  currentCard,
  reviewState,
  decks,
  progress,
  revealed,
  isPending,
  pendingGrade,
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

  const newLocal =
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
            <div className={newLocal}>
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

export function FlashcardReviewClient({
  initialState,
  decks,
  deckId,
  embedded = false,
  aiEnabled,
}: Readonly<FlashcardReviewClientProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const [reviewState, setReviewState] = useState(initialState);
  const reviewStateRef = useRef(initialState);
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<ReviewGrade | null>(null);
  const [isActionPending, startActionTransition] = useTransition();
  const isScopeSwitchLoading = false;
  const isPending = isActionPending;
  const refillRequestIdRef = useRef(0);
  const isRefillingRef = useRef(false);
  const [selectedDeckId, setSelectedDeckId] = useState(deckId);
  const [examCards, setExamCards] = useState<FlashcardReviewEntity[] | null>(
    null,
  );
  const [isLoadingExamCards, setIsLoadingExamCards] = useState(false);
  const examScopeRef = useRef<{ deckId?: string }>({});
  const examCardsRequestIdRef = useRef(0);
  const examCardsRequestRef = useRef<{
    scopeKey: string;
    promise: Promise<FlashcardReviewEntity[] | null>;
  } | null>(null);
  const examSession = useExamSession();
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const examSessionData = examSession.session;
  const isExamMode = !!examSessionData;

  useEffect(() => {
    setSelectedDeckId(deckId);
  }, [deckId]);

  useEffect(() => {
    if (examScopeRef.current.deckId !== selectedDeckId) {
      setExamCards(null);
      examScopeRef.current = { deckId: selectedDeckId };
      examCardsRequestIdRef.current += 1;
      examCardsRequestRef.current = null;
      setIsLoadingExamCards(false);
    }
  }, [selectedDeckId]);

  async function ensureExamCardsLoaded(): Promise<
    FlashcardReviewEntity[] | null
  > {
    if (examCards !== null) {
      return examCards;
    }

    const scopeKey = getExamScopeKey(selectedDeckId);
    if (examCardsRequestRef.current?.scopeKey === scopeKey) {
      return examCardsRequestRef.current.promise;
    }

    const requestId = examCardsRequestIdRef.current + 1;
    examCardsRequestIdRef.current = requestId;

    setIsLoadingExamCards(true);
    const request = getExamFlashcards({
      deckId: selectedDeckId,
    })
      .then((cards) => {
        if (examCardsRequestIdRef.current === requestId) {
          setExamCards(cards);
        }

        return cards;
      })
      .catch(() => {
        if (examCardsRequestIdRef.current === requestId) {
          toast.error("Could not load exam cards. Please try again.");
        }

        return null;
      })
      .finally(() => {
        if (examCardsRequestIdRef.current === requestId) {
          setIsLoadingExamCards(false);
          examCardsRequestRef.current = null;
        }
      });

    examCardsRequestRef.current = {
      scopeKey,
      promise: request,
    };

    return request;
  }

  const currentCard = isExamMode
    ? examSession.currentCard
    : (reviewState.cards[0] ?? null);
  const hasDueCards = reviewState.summary.dueCount > 0;
  const hasExamCards = reviewState.summary.totalCount > 0;
  const dueBadgeText = `${reviewState.summary.dueCount} due`;
  const examBadgeText = `${reviewState.summary.totalCount} ${
    reviewState.summary.totalCount === 1 ? "card" : "cards"
  }`;
  const examScopeLabel = selectedDeckId
    ? "All cards in deck"
    : "All flashcards";

  const progress = isExamMode
    ? examSession.progress
    : reviewState.summary.totalCount > 0
      ? (reviewState.summary.totalCount - reviewState.summary.dueCount) /
        reviewState.summary.totalCount
      : 0;
  const previewLabels = useMemo(
    () =>
      currentCard
        ? getFlashcardReviewPreviewLabels({
            card: currentCard,
            scheduler: reviewState.scheduler,
          })
        : null,
    [currentCard, reviewState.scheduler],
  );
  function commitReviewState(nextState: FlashcardReviewState) {
    reviewStateRef.current = nextState;
    setReviewState(nextState);
  }

  function resetFocusViewState() {
    setRevealed(false);
    setEditOpen(false);
    setDeleteOpen(false);
  }

  function closeFocusMode() {
    examSession.endSession();
    setIsFocusMode(false);
    resetFocusViewState();
  }

  async function handleFlashcardUpdated(
    updatedFlashcard: FlashcardReviewState["cards"][number],
  ) {
    if (isExamMode) {
      examSession.updateCard(updatedFlashcard);
      resetFocusViewState();
      return;
    }

    if (deckId && updatedFlashcard.deckId !== deckId) {
      const nextState = await getFlashcardReviewState({
        deckId: selectedDeckId,
        limit: reviewBatchLimit,
      });

      commitReviewState(nextState);
      resetFocusViewState();
      return;
    }

    commitReviewState(
      replaceFlashcardInReviewState(reviewStateRef.current, updatedFlashcard),
    );
    resetFocusViewState();
  }

  async function handleFlashcardDeleted(deletedId: string) {
    if (isExamMode) {
      examSession.removeCard(deletedId);
      resetFocusViewState();
      return;
    }

    const nextState = {
      ...reviewStateRef.current,
      cards: reviewStateRef.current.cards.filter(
        (card) => card.id !== deletedId,
      ),
      summary: {
        ...reviewStateRef.current.summary,
        dueCount: Math.max(0, reviewStateRef.current.summary.dueCount - 1),
        totalCount: Math.max(0, reviewStateRef.current.summary.totalCount - 1),
      },
    };

    commitReviewState(nextState);
    resetFocusViewState();

    if (shouldRefillFlashcardReviewState(nextState)) {
      void refillReviewState();
    }
  }

  async function refillReviewState(retryCount = 0) {
    if (isRefillingRef.current) {
      return;
    }
    isRefillingRef.current = true;

    try {
      const requestId = refillRequestIdRef.current + 1;
      refillRequestIdRef.current = requestId;

      const nextState = await getFlashcardReviewState({
        deckId: selectedDeckId,
        limit: reviewBatchLimit,
      });

      if (refillRequestIdRef.current !== requestId) {
        return;
      }

      commitReviewState(
        mergeFlashcardReviewStates(
          reviewStateRef.current,
          nextState,
          new Date(),
        ),
      );
    } finally {
      isRefillingRef.current = false;
      if (
        shouldRefillFlashcardReviewState(reviewStateRef.current) &&
        retryCount < 3
      ) {
        void refillReviewState(retryCount + 1);
      }
    }
  }

  function handleStartReviewMode() {
    examSession.endSession();
    resetFocusViewState();
    setIsFocusMode(true);
  }

  async function handleStartExamMode() {
    const cards = examCards ?? (await ensureExamCardsLoaded());

    if (!cards || cards.length === 0) {
      return;
    }

    examSession.startSession(cards, { deckId: selectedDeckId });
    resetFocusViewState();
    setIsFocusMode(true);
  }

  function handleGradeInExamMode(grade: ReviewGrade) {
    if (!currentCard || isPending) {
      return;
    }

    examSession.rateCard(grade);
    resetFocusViewState();
  }

  function handleExitExamMode() {
    if (examSession.hasStarted && !examSession.sessionComplete) {
      setShowExitConfirmation(true);
    } else {
      closeFocusMode();
    }
  }

  function handleConfirmExitExam() {
    setShowExitConfirmation(false);
    closeFocusMode();
  }

  function handleCloseResults() {
    closeFocusMode();
  }

  function handleRetryWeakCards() {
    if (!examSession.session) {
      return;
    }

    const weakCards = examSession.session.cards.filter((_card, index) => {
      const rating = examSession.session?.ratings[index];
      return rating === "again" || rating === "hard";
    });

    if (weakCards.length === 0) {
      return;
    }

    examSession.startSession(weakCards, { deckId: selectedDeckId });
    resetFocusViewState();
    setIsFocusMode(true);
  }

  function handleGrade(grade: ReviewGrade) {
    if (isExamMode) {
      handleGradeInExamMode(grade);
      return;
    }

    if (!currentCard || isPending) {
      return;
    }

    setPendingGrade(grade);
    startActionTransition(async () => {
      try {
        const result = await reviewFlashcard({ id: currentCard.id, grade });

        if (!result.success) {
          toast.error(t(result.errorCode, result.errorParams));
          return;
        }

        const nextState = applyReviewedFlashcardToState(
          reviewStateRef.current,
          result.reviewedCardId,
          result.flashcard,
        );

        commitReviewState(nextState);
        resetFocusViewState();

        if (shouldRefillFlashcardReviewState(nextState)) {
          void refillReviewState();
        }
      } finally {
        setPendingGrade(null);
      }
    });
  }

  const handleReviewKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (shortcutsSuspended) {
      return;
    }

    if (isFocusMode && event.key === "Escape") {
      event.preventDefault();
      if (isExamMode) {
        handleExitExamMode();
      } else {
        setIsFocusMode(false);
      }
      return;
    }

    if (!isFocusMode) {
      return;
    }

    const action = getFlashcardReviewShortcutAction({
      key: event.key,
      revealed,
      hasCurrentCard: currentCard !== null,
      isPending,
      isDialogOpen: editOpen || deleteOpen,
      isEditableTarget: isEditableFlashcardReviewKeyboardTarget(event.target),
      hasModifierKey: event.altKey || event.ctrlKey || event.metaKey,
      isRepeat: event.repeat,
    });

    if (!action) {
      return;
    }

    event.preventDefault();

    if (action.type === "reveal") {
      setRevealed(true);
      return;
    }

    if (action.type === "edit") {
      setEditOpen(true);
      return;
    }

    if (action.type === "delete") {
      setDeleteOpen(true);
      return;
    }

    handleGrade(action.grade);
  });

  useEffect(() => {
    document.addEventListener("keydown", handleReviewKeyDown);

    return () => document.removeEventListener("keydown", handleReviewKeyDown);
  }, []);

  const content = (
    <>
      {isScopeSwitchLoading ? (
        <ReviewHubCardsLoading />
      ) : (
        <div
          className="grid min-w-0 gap-4 lg:grid-cols-2"
          data-testid="flashcard-review-hub"
        >
          <Card className="gap-0 rounded-xl border-border/70 py-0 shadow-none">
            <CardContent className="flex h-full flex-col gap-3 p-4 sm:gap-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                  {hasDueCards ? "Due now" : "No due cards"}
                </span>
                <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {dueBadgeText}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Review
                </h2>
                <p className="text-pretty text-sm text-muted-foreground">
                  Go through cards that are due based on your spaced repetition
                  schedule.
                </p>
              </div>

              <ul className="hidden space-y-1.5 text-sm text-muted-foreground sm:block">
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary/70" />
                  <span>Spaced repetition</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary/70" />
                  <span>Again · Hard · Good · Easy</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary/70" />
                  <span>Tracks your progress</span>
                </li>
              </ul>

              <Button
                data-testid="flashcard-review-start-button"
                variant="outline"
                onClick={handleStartReviewMode}
                disabled={isPending || !hasDueCards}
                className="mt-auto h-10 w-full text-base sm:h-11"
              >
                Start review
              </Button>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-xl border-border/70 py-0 shadow-none">
            <CardContent className="flex h-full flex-col gap-3 p-4 sm:gap-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center rounded-md border border-[var(--intent-success-border)] bg-[var(--intent-success-bg)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--intent-success-text)] uppercase">
                  All cards
                </span>
                <span className="inline-flex items-center rounded-md border border-[var(--intent-success-border)] bg-[var(--intent-success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--intent-success-text)]">
                  {examBadgeText}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Exam mode
                </h2>
                <p className="text-pretty text-sm text-muted-foreground">
                  Practice all cards regardless of schedule. Good for cramming
                  before a test.
                </p>
              </div>

              <ul className="hidden space-y-1.5 text-sm text-muted-foreground sm:block">
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--intent-success-fill)]" />
                  <span>{examScopeLabel}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--intent-success-fill)]" />
                  <span>No scheduling impact</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--intent-success-fill)]" />
                  <span>Randomized order</span>
                </li>
              </ul>

              <Button
                data-testid="flashcard-exam-start-button"
                variant="outline"
                onClick={() => void handleStartExamMode()}
                disabled={
                  isLoadingExamCards ||
                  isScopeSwitchLoading ||
                  isPending ||
                  !hasExamCards
                }
                className="mt-auto h-10 w-full text-base sm:h-11"
              >
                <AsyncButtonContent
                  pending={isLoadingExamCards}
                  idleLabel="Start exam"
                  pendingLabel="Loading exam..."
                />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );

  if (isFocusMode) {
    return (
      <>
        <FocusModeOverlay
          currentCard={currentCard}
          reviewState={reviewState}
          decks={decks}
          progress={progress}
          revealed={revealed}
          isPending={isPending}
          pendingGrade={pendingGrade}
          previewLabels={previewLabels}
          onReveal={() => setRevealed(true)}
          onGrade={handleGrade}
          onExitFocusMode={
            isExamMode ? handleExitExamMode : () => setIsFocusMode(false)
          }
          isExamMode={isExamMode}
          examCurrentIndex={examSessionData?.currentIndex ?? 0}
          examTotalCards={examSessionData?.cards.length ?? 0}
        />
        {currentCard ? (
          <>
            <EditFlashcardDialog
              key={currentCard.id}
              flashcard={currentCard}
              open={editOpen}
              onOpenChange={setEditOpen}
              aiEnabled={aiEnabled}
              onUpdated={handleFlashcardUpdated}
              onDeleted={handleFlashcardDeleted}
              className="z-120"
              overlayClassName="z-120"
            />
            <DeleteFlashcardDialog
              flashcardId={currentCard.id}
              flashcardFront={currentCard.front}
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              onDeleted={handleFlashcardDeleted}
              className="z-120"
              overlayClassName="z-120"
            />
          </>
        ) : null}
        {examSession.sessionComplete && examSessionData ? (
          <ExamResultsScreen
            totalCards={examSessionData.cards.length}
            ratings={examSessionData.ratings}
            duration={Math.floor(
              (Date.now() - examSessionData.startedAt.getTime()) / 1000,
            )}
            onClose={handleCloseResults}
            onRetryWeak={handleRetryWeakCards}
          />
        ) : null}
        <Dialog
          open={showExitConfirmation}
          onOpenChange={setShowExitConfirmation}
        >
          <DialogContent
            className="z-120 sm:max-w-md"
            overlayClassName="z-120"
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Exit Exam</DialogTitle>
              <DialogDescription>
                Are you sure you want to exit? Your progress won&apos;t be
                saved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExitConfirmation(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmExitExam}>
                Exit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return embedded ? (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">
      {content}
    </div>
  ) : (
    <AppPageContainer>{content}</AppPageContainer>
  );
}
