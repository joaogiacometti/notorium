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
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
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
import { AppPageContainer } from "@/components/shared/app-page-container";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { SubjectText } from "@/components/shared/subject-text";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_DECK_NAME } from "@/features/decks/constants";
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
  FlashcardReviewEntity,
  FlashcardReviewState,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";
import { DeleteFlashcardDialog } from "./delete-flashcard-dialog";
import { ExamResultsScreen } from "./exam-results-screen";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "./lazy-edit-flashcard-dialog";
import { useExamSession } from "./use-exam-session";

interface FlashcardReviewClientProps {
  initialState: FlashcardReviewState;
  subjects: SubjectEntity[];
  decks: DeckEntity[];
  subjectId?: string;
  deckId?: string;
  embedded?: boolean;
}

function getExamScopeKey(subjectId?: string, deckId?: string) {
  return `${subjectId ?? "all"}:${deckId ?? "all"}`;
}

const reviewGrades: ReviewGrade[] = ["again", "hard", "good", "easy"];
const reviewBatchLimit = 50;
const reviewRichTextClassName =
  "flashcard-review-tiptap-content min-w-0 max-w-full wrap-break-word hyphens-auto";
const gradeButtonStyles: Record<ReviewGrade, string> = {
  again:
    "border-[color:var(--review-again-border)] bg-[color:var(--review-again-bg)] text-[color:var(--review-again-text)] hover:border-[color:var(--review-again-border-hover)] hover:bg-[color:var(--review-again-bg-hover)]",
  hard: "border-[color:var(--review-hard-border)] bg-[color:var(--review-hard-bg)] text-[color:var(--review-hard-text)] hover:border-[color:var(--review-hard-border-hover)] hover:bg-[color:var(--review-hard-bg-hover)]",
  good: "border-[color:var(--review-good-border)] bg-[color:var(--review-good-bg)] text-[color:var(--review-good-text)] hover:border-[color:var(--review-good-border-hover)] hover:bg-[color:var(--review-good-bg-hover)]",
  easy: "border-[color:var(--review-easy-border)] bg-[color:var(--review-easy-bg)] text-[color:var(--review-easy-text)] hover:border-[color:var(--review-easy-border-hover)] hover:bg-[color:var(--review-easy-bg-hover)]",
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
  subjects: SubjectEntity[];
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
  subjects,
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
  const currentSubject = subjects.find(
    (subject) => subject.id === currentCard?.subjectId,
  );
  const currentDeck = decks.find((deck) => deck.id === currentCard?.deckId);
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
    "flex items-center gap-1.5 rounded-md border-2 border-(--assessment-exam-border) bg-(--assessment-exam-bg) px-2 py-1 text-xs font-bold tracking-wider text-[var(--assessment-exam-text)] uppercase";
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

        <div className="flex-1 overflow-hidden px-4 pb-4">
          {(currentSubject || currentDeck) && (
            <p className="mb-3 text-xs font-semibold tracking-wider text-primary/80 uppercase">
              {currentSubject?.name}
              {currentDeck
                ? ` · ${currentDeck.name}`
                : ` · ${DEFAULT_DECK_NAME}`}
            </p>
          )}

          <div className="relative flex h-full flex-col rounded-xl border border-border/60 bg-card">
            <div className="flex min-h-0 flex-1 flex-col p-6">
              <div className="flex min-h-0 flex-none flex-col max-h-[50%]">
                <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Front
                </h3>
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pr-1 pb-3">
                  <TiptapRenderer
                    content={currentCard.front}
                    className={`${reviewRichTextClassName} text-lg leading-relaxed`}
                  />
                </div>
              </div>

              {revealed ? (
                <div className="flex min-h-0 flex-1 flex-col border-t border-border/60 pt-4">
                  <h3 className="mb-2 text-xs font-semibold tracking-wider text-primary/80 uppercase">
                    Answer
                  </h3>
                  <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pr-1 pb-3">
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
  subjects,
  decks,
  subjectId,
  deckId,
  embedded = false,
}: Readonly<FlashcardReviewClientProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const [reviewState, setReviewState] = useState(initialState);
  const reviewStateRef = useRef(initialState);
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<ReviewGrade | null>(null);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const [isScopeSwitchPending, startScopeSwitchTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const isScopeSwitchLoading = isScopeLoading || isScopeSwitchPending;
  const isPending = isScopeSwitchLoading || isActionPending;
  const refillRequestIdRef = useRef(0);
  const isRefillingRef = useRef(false);
  const router = useRouter();
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId);
  const [selectedDeckId, setSelectedDeckId] = useState(deckId);
  const subjectChangeRequestIdRef = useRef(0);
  const [examCards, setExamCards] = useState<FlashcardReviewEntity[] | null>(
    null,
  );
  const [isLoadingExamCards, setIsLoadingExamCards] = useState(false);
  const examScopeRef = useRef<{ subjectId?: string; deckId?: string }>({});
  const examCardsRequestIdRef = useRef(0);
  const examCardsRequestRef = useRef<{
    scopeKey: string;
    promise: Promise<FlashcardReviewEntity[] | null>;
  } | null>(null);
  const examSession = useExamSession();
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  useEffect(() => {
    setSelectedSubjectId(subjectId);
    setSelectedDeckId(deckId);
  }, [subjectId, deckId]);

  useEffect(() => {
    const scopeChanged =
      examScopeRef.current.subjectId !== selectedSubjectId ||
      examScopeRef.current.deckId !== selectedDeckId;

    if (scopeChanged) {
      setExamCards(null);
      examScopeRef.current = {
        subjectId: selectedSubjectId,
        deckId: selectedDeckId,
      };
      examCardsRequestIdRef.current += 1;
      examCardsRequestRef.current = null;
      setIsLoadingExamCards(false);
    }
  }, [selectedSubjectId, selectedDeckId]);

  async function ensureExamCardsLoaded(): Promise<
    FlashcardReviewEntity[] | null
  > {
    if (examCards !== null) {
      return examCards;
    }

    const scopeKey = getExamScopeKey(selectedSubjectId, selectedDeckId);
    if (examCardsRequestRef.current?.scopeKey === scopeKey) {
      return examCardsRequestRef.current.promise;
    }

    const requestId = examCardsRequestIdRef.current + 1;
    examCardsRequestIdRef.current = requestId;

    setIsLoadingExamCards(true);
    const request = getExamFlashcards({
      subjectId: selectedSubjectId,
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

  const currentCard = examSession.session
    ? examSession.currentCard
    : (reviewState.cards[0] ?? null);
  const hasDueCards = reviewState.summary.dueCount > 0;
  const hasExamCards = reviewState.summary.totalCount > 0;
  const dueBadgeText = `${reviewState.summary.dueCount} due`;
  const examBadgeText = `${reviewState.summary.totalCount} ${
    reviewState.summary.totalCount === 1 ? "card" : "cards"
  }`;
  let examScopeLabel: string;
  if (selectedDeckId) {
    examScopeLabel = "All cards in deck";
  } else if (selectedSubjectId) {
    examScopeLabel = "All cards in subject";
  } else {
    examScopeLabel = "All cards in scope";
  }

  let progress: number;
  if (examSession.session) {
    progress = examSession.progress;
  } else if (reviewState.summary.totalCount > 0) {
    progress =
      (reviewState.summary.totalCount - reviewState.summary.dueCount) /
      reviewState.summary.totalCount;
  } else {
    progress = 0;
  }
  const previewLabels = currentCard
    ? getFlashcardReviewPreviewLabels({
        card: currentCard,
        scheduler: reviewState.scheduler,
      })
    : null;
  const filteredDecks = selectedSubjectId
    ? decks.filter((deck) => deck.subjectId === selectedSubjectId)
    : [];

  function commitReviewState(nextState: FlashcardReviewState) {
    reviewStateRef.current = nextState;
    setReviewState(nextState);
  }

  async function handleFlashcardUpdated(
    updatedFlashcard: FlashcardReviewState["cards"][number],
  ) {
    if (examSession.session) {
      examSession.updateCard(updatedFlashcard);
      setRevealed(false);
      return;
    }

    if (subjectId && updatedFlashcard.subjectId !== subjectId) {
      const nextState = await getFlashcardReviewState({
        subjectId,
        deckId: selectedDeckId,
        limit: reviewBatchLimit,
      });

      commitReviewState(nextState);
      setRevealed(false);
      return;
    }

    commitReviewState(
      replaceFlashcardInReviewState(reviewStateRef.current, updatedFlashcard),
    );
    setRevealed(false);
  }

  async function handleFlashcardDeleted(deletedId: string) {
    if (examSession.session) {
      examSession.removeCard(deletedId);
      setRevealed(false);
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
    setRevealed(false);

    if (shouldRefillFlashcardReviewState(nextState)) {
      void refillReviewState();
    }
  }

  function handleSubjectChange(value: string) {
    const newSubjectId = value === "all" ? undefined : value;
    setSelectedSubjectId(newSubjectId);
    setSelectedDeckId(undefined);
    setIsScopeLoading(true);

    const params = new URLSearchParams();
    params.set("view", "review");
    if (newSubjectId) {
      params.set("subjectId", newSubjectId);
    }
    router.replace(`/flashcards?${params.toString()}`);

    const requestId = subjectChangeRequestIdRef.current + 1;
    subjectChangeRequestIdRef.current = requestId;

    startScopeSwitchTransition(async () => {
      try {
        const nextState = await getFlashcardReviewState({
          subjectId: newSubjectId,
          deckId: undefined,
          limit: reviewBatchLimit,
        });

        if (subjectChangeRequestIdRef.current !== requestId) {
          return;
        }

        commitReviewState(nextState);
        setRevealed(false);
      } finally {
        if (subjectChangeRequestIdRef.current === requestId) {
          setIsScopeLoading(false);
        }
      }
    });
  }

  function handleDeckChange(value: string) {
    const newDeckId = value === "all" ? undefined : value;
    setSelectedDeckId(newDeckId);
    setIsScopeLoading(true);

    const params = new URLSearchParams();
    params.set("view", "review");
    if (selectedSubjectId) {
      params.set("subjectId", selectedSubjectId);
    }
    if (newDeckId) {
      params.set("deckId", newDeckId);
    }
    router.replace(`/flashcards?${params.toString()}`);

    const requestId = subjectChangeRequestIdRef.current + 1;
    subjectChangeRequestIdRef.current = requestId;

    startScopeSwitchTransition(async () => {
      try {
        const nextState = await getFlashcardReviewState({
          subjectId: selectedSubjectId,
          deckId: newDeckId,
          limit: reviewBatchLimit,
        });

        if (subjectChangeRequestIdRef.current !== requestId) {
          return;
        }

        commitReviewState(nextState);
        setRevealed(false);
      } finally {
        if (subjectChangeRequestIdRef.current === requestId) {
          setIsScopeLoading(false);
        }
      }
    });
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
        subjectId: selectedSubjectId,
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
    setRevealed(false);
    setIsFocusMode(true);
  }

  async function handleStartExamMode() {
    const cards = examCards ?? (await ensureExamCardsLoaded());

    if (!cards || cards.length === 0) {
      return;
    }

    examSession.startSession(cards, {
      subjectId: selectedSubjectId,
      deckId: selectedDeckId,
    });
    setRevealed(false);
    setIsFocusMode(true);
  }

  function handleGradeInExamMode(grade: ReviewGrade) {
    if (!currentCard || isPending) {
      return;
    }

    examSession.rateCard(grade);
    setRevealed(false);
  }

  function handleExitExamMode() {
    if (examSession.hasStarted && !examSession.sessionComplete) {
      setShowExitConfirmation(true);
    } else {
      examSession.endSession();
      setIsFocusMode(false);
      setRevealed(false);
    }
  }

  function handleConfirmExitExam() {
    setShowExitConfirmation(false);
    examSession.endSession();
    setIsFocusMode(false);
    setRevealed(false);
  }

  function handleCloseResults() {
    examSession.endSession();
    setIsFocusMode(false);
    setRevealed(false);
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

    examSession.startSession(weakCards, {
      subjectId: selectedSubjectId,
      deckId: selectedDeckId,
    });
    setRevealed(false);
    setIsFocusMode(true);
  }

  function handleGrade(grade: ReviewGrade) {
    if (examSession.session) {
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
        setRevealed(false);
        setEditOpen(false);

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
      if (examSession.session) {
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
      <div className="mb-4 grid min-w-0 w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
        <div className="min-w-0">
          <Select
            value={selectedSubjectId ?? "all"}
            onValueChange={handleSubjectChange}
            disabled={isScopeSwitchLoading}
          >
            <SelectTrigger
              className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs sm:w-auto sm:min-w-32 sm:max-w-64"
              data-testid="flashcard-review-subject-filter"
            >
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  <SubjectText
                    value={subject.name}
                    mode="truncate"
                    className="block max-w-full"
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSubjectId && filteredDecks.length > 0 ? (
          <div className="min-w-0">
            <Select
              value={selectedDeckId ?? "all"}
              onValueChange={handleDeckChange}
              disabled={isScopeSwitchLoading}
            >
              <SelectTrigger
                className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs sm:w-auto sm:min-w-32 sm:max-w-64"
                data-testid="flashcard-review-deck-filter"
              >
                <SelectValue placeholder="Filter by deck" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All decks</SelectItem>
                {filteredDecks.map((deck) => (
                  <SelectItem key={deck.id} value={deck.id}>
                    {deck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {isScopeSwitchLoading ? (
        <ReviewHubCardsLoading />
      ) : (
        <div
          className="grid gap-4 lg:grid-cols-2"
          data-testid="flashcard-review-hub"
        >
          <Card className="gap-0 rounded-xl border-(--assessment-exam-border) py-0 shadow-none">
            <CardContent className="flex h-full flex-col gap-3 p-4 sm:gap-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center rounded-md border border-(--assessment-exam-border) bg-(--assessment-exam-bg) px-2 py-0.5 text-[10px] font-semibold tracking-wide text-(--assessment-exam-text) uppercase">
                  {hasDueCards ? "Due now" : "No due cards"}
                </span>
                <span className="inline-flex items-center rounded-md border border-(--assessment-exam-border) bg-(--assessment-exam-bg) px-2 py-0.5 text-xs font-medium text-(--assessment-exam-text)">
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
                  <span className="size-2 rounded-full bg-(--assessment-exam-text)" />
                  <span>Spaced repetition</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-(--assessment-exam-text)" />
                  <span>Again · Hard · Good · Easy</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-(--assessment-exam-text)" />
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

          <Card className="gap-0 rounded-xl border-(--status-success-border) py-0 shadow-none">
            <CardContent className="flex h-full flex-col gap-3 p-4 sm:gap-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center rounded-md border border-(--status-success-border) bg-(--status-success-bg) px-2 py-0.5 text-[10px] font-semibold tracking-wide text-(--status-success-text) uppercase">
                  All cards
                </span>
                <span className="inline-flex items-center rounded-md border border-(--status-success-border) bg-(--status-success-bg) px-2 py-0.5 text-xs font-medium text-(--status-success-text)">
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
                  <span className="size-2 rounded-full bg-(--status-success-fill)" />
                  <span>{examScopeLabel}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-(--status-success-fill)" />
                  <span>No scheduling impact</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-(--status-success-fill)" />
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
          subjects={subjects}
          decks={decks}
          progress={progress}
          revealed={revealed}
          isPending={isPending}
          pendingGrade={pendingGrade}
          previewLabels={previewLabels}
          onReveal={() => setRevealed(true)}
          onGrade={handleGrade}
          onExitFocusMode={
            examSession.session
              ? handleExitExamMode
              : () => setIsFocusMode(false)
          }
          isExamMode={!!examSession.session}
          examCurrentIndex={examSession.session?.currentIndex ?? 0}
          examTotalCards={examSession.session?.cards.length ?? 0}
        />
        {currentCard ? (
          <>
            <EditFlashcardDialog
              key={currentCard.id}
              flashcard={currentCard}
              subjects={subjects}
              open={editOpen}
              onOpenChange={setEditOpen}
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
        {examSession.sessionComplete && examSession.session ? (
          <ExamResultsScreen
            totalCards={examSession.session.cards.length}
            ratings={examSession.session.ratings}
            duration={Math.floor(
              (Date.now() - examSession.session.startedAt.getTime()) / 1000,
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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      {content}
    </div>
  ) : (
    <AppPageContainer>{content}</AppPageContainer>
  );
}
