"use client";

import {
  animate,
  motion,
  type PanInfo,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  CheckCircle2,
  CircleAlert,
  Gauge,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
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
  getFlashcardReviewState,
  reviewFlashcard,
} from "@/app/actions/flashcard-review";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { Button } from "@/components/ui/button";
import { getFlashcardReviewPreviewLabels } from "@/features/flashcard-review/preview";
import {
  getFlashcardReviewShortcutAction,
  isEditableFlashcardReviewKeyboardTarget,
} from "@/features/flashcard-review/shortcuts";
import {
  applyReviewedFlashcardToState,
  mergeFlashcardReviewStates,
  shouldRefillFlashcardReviewState,
} from "@/features/flashcard-review/state";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import { triggerRatingHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import type {
  DeckEntity,
  FlashcardReviewState,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";

interface FocusModeClientProps {
  initialState: FlashcardReviewState;
  subjects: SubjectEntity[];
  decks: DeckEntity[];
  subjectId?: string;
  deckId?: string;
}

type FocusGrade = ReviewGrade;

const focusGrades: FocusGrade[] = ["again", "hard", "good", "easy"];
const reviewBatchLimit = 50;
const SWIPE_THRESHOLD = 100;
const _SWIPE_EXIT_DISTANCE = 300;

const gradeButtonStyles: Record<FocusGrade, string> = {
  again:
    "border-[color:var(--review-again-border)] bg-[color:var(--review-again-bg)] text-[color:var(--review-again-text)] hover:border-[color:var(--review-again-border-hover)] hover:bg-[color:var(--review-again-bg-hover)]",
  hard: "border-[color:var(--review-hard-border)] bg-[color:var(--review-hard-bg)] text-[color:var(--review-hard-text)] hover:border-[color:var(--review-hard-border-hover)] hover:bg-[color:var(--review-hard-bg-hover)]",
  good: "border-[color:var(--review-good-border)] bg-[color:var(--review-good-bg)] text-[color:var(--review-good-text)] hover:border-[color:var(--review-good-border-hover)] hover:bg-[color:var(--review-good-bg-hover)]",
  easy: "border-[color:var(--review-easy-border)] bg-[color:var(--review-easy-bg)] text-[color:var(--review-easy-text)] hover:border-[color:var(--review-easy-border-hover)] hover:bg-[color:var(--review-easy-bg-hover)]",
};

const gradeIcons: Record<FocusGrade, typeof CircleAlert> = {
  again: CircleAlert,
  hard: Gauge,
  good: CheckCircle2,
  easy: Sparkles,
};

const gradeLabels: Record<FocusGrade, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

export function FocusModeClient({
  initialState,
  subjects,
  decks,
  subjectId,
  deckId,
}: Readonly<FocusModeClientProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const [reviewState, setReviewState] = useState(initialState);
  const reviewStateRef = useRef(initialState);
  const [revealed, setRevealed] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<FocusGrade | null>(null);
  const [isPending, startTransition] = useTransition();
  const refillRequestIdRef = useRef(0);
  const isRefillingRef = useRef(false);
  const router = useRouter();
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const selectedSubjectId = subjectId;
  const selectedDeckId = deckId;

  const currentCard = reviewState.cards[0] ?? null;
  const totalDue = reviewState.summary.dueCount;
  const totalCount = reviewState.summary.totalCount;
  const progress = totalCount > 0 ? (totalCount - totalDue) / totalCount : 0;

  const previewLabels = currentCard
    ? getFlashcardReviewPreviewLabels({
        card: currentCard,
        scheduler: reviewState.scheduler,
      })
    : null;

  const currentSubject = subjects.find((s) => s.id === currentCard?.subjectId);
  const currentDeck = decks.find((d) => d.id === currentCard?.deckId);

  function commitReviewState(nextState: FlashcardReviewState) {
    reviewStateRef.current = nextState;
    setReviewState(nextState);
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

  function handleGrade(grade: FocusGrade, exitDirection?: "left" | "right") {
    if (!currentCard || isPending || isAnimating) {
      return;
    }

    triggerRatingHaptic();
    setPendingGrade(grade);

    if (exitDirection) {
      setIsAnimating(true);
      animate(x, 0, {
        type: "spring",
        stiffness: 200,
        damping: 25,
        mass: 1,
      });
    } else {
      x.set(0);
    }

    startTransition(async () => {
      try {
        const result = await reviewFlashcard({
          id: currentCard.id,
          grade,
        });

        if (!result.success) {
          toast.error(t(result.errorCode, result.errorParams));
          if (exitDirection) {
            setIsAnimating(false);
          }
          x.set(0);
          setPendingGrade(null);
          return;
        }

        const nextState = applyReviewedFlashcardToState(
          reviewStateRef.current,
          result.reviewedCardId,
          result.flashcard,
        );

        commitReviewState(nextState);
        setRevealed(false);
        setReviewedCount((c) => c + 1);
        setPendingGrade(null);
        if (exitDirection) {
          setIsAnimating(false);
        }

        if (shouldRefillFlashcardReviewState(nextState)) {
          void refillReviewState();
        }
      } catch {
        if (exitDirection) {
          setIsAnimating(false);
        }
        x.set(0);
        setPendingGrade(null);
      }
    });
  }

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-8, 0, 8]);
  const opacity = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.5, 0.8, 1, 0.8, 0.5],
  );
  const backgroundLeft = useTransform(
    x,
    [-150, -50, 0],
    [
      "rgba(239, 68, 68, 0.15)",
      "rgba(239, 68, 68, 0.05)",
      "rgba(239, 68, 68, 0)",
    ],
  );
  const backgroundRight = useTransform(
    x,
    [0, 50, 150],
    [
      "rgba(34, 197, 94, 0)",
      "rgba(34, 197, 94, 0.05)",
      "rgba(34, 197, 94, 0.15)",
    ],
  );

  const handleDragEnd = useEffectEvent(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      const shouldSwipe =
        Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 500;

      if (shouldSwipe && revealed && !isPending && !isAnimating) {
        if (offset < 0) {
          handleGrade("again", "left");
        } else {
          handleGrade("good", "right");
        }
      } else {
        animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
      }
    },
  );

  const handleFocusKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (shortcutsSuspended) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      router.push(buildExitUrl());
      return;
    }

    const action = getFlashcardReviewShortcutAction({
      key: event.key,
      revealed,
      hasCurrentCard: currentCard !== null,
      isPending: isPending || isAnimating,
      isDialogOpen: false,
      isEditableTarget: isEditableFlashcardReviewKeyboardTarget(event.target),
      hasModifierKey: event.altKey || event.ctrlKey || event.metaKey,
      isRepeat: event.repeat,
    });

    if (!action || action.type === "edit" || action.type === "delete") {
      return;
    }

    event.preventDefault();

    if (action.type === "reveal") {
      setRevealed(true);
      return;
    }

    handleGrade(action.grade);
  });

  useEffect(() => {
    document.addEventListener("keydown", handleFocusKeyDown);
    return () => document.removeEventListener("keydown", handleFocusKeyDown);
  }, []);

  function buildExitUrl() {
    const params = new URLSearchParams();
    params.set("view", "review");
    if (subjectId) params.set("subjectId", subjectId);
    if (deckId) params.set("deckId", deckId);
    return `/flashcards?${params.toString()}`;
  }

  if (!currentCard) {
    return (
      <FocusModeCompletion
        reviewedCount={reviewedCount}
        exitUrl={buildExitUrl()}
        onContinue={() => {
          void refillReviewState();
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="h-1 w-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <div className="size-10" />

        <span className="text-sm font-medium text-muted-foreground">
          {totalDue} due of {totalCount} total cards
        </span>

        <Button variant="ghost" size="icon" className="size-10" asChild>
          <Link href={buildExitUrl()} aria-label="Exit Focus Mode">
            <X className="size-5" />
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-hidden px-4 pb-4">
        {(currentSubject || currentDeck) && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary/80">
            {currentSubject?.name}
            {currentDeck ? ` · ${currentDeck.name}` : " · General"}
          </p>
        )}

        <motion.div
          className="relative flex h-full flex-col rounded-xl border border-border/60 bg-card touch-pan-y"
          style={{
            x,
            rotate,
            opacity,
          }}
          drag={revealed && !isPending && !isAnimating ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragEnd={handleDragEnd}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{ backgroundColor: backgroundLeft }}
          />
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{ backgroundColor: backgroundRight }}
          />

          <div className="flex min-h-0 flex-1 flex-col p-6">
            <div className="flex min-h-0 flex-none flex-col max-h-[50%]">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Front
              </h3>
              <div className="pointer-events-none min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-3">
                <TiptapRenderer
                  content={currentCard.front}
                  className="min-w-0 wrap-break-word hyphens-auto text-lg leading-relaxed"
                />
              </div>
            </div>

            {revealed && (
              <div className="flex min-h-0 flex-1 flex-col border-t border-border/60 pt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary/80">
                  Answer
                </h3>
                <div className="pointer-events-none min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-3">
                  <TiptapRenderer
                    content={currentCard.back}
                    className="min-w-0 wrap-break-word hyphens-auto text-lg leading-relaxed text-primary"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="shrink-0 border-t border-border/60 px-4 py-4">
        {revealed ? (
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span aria-hidden="true">←</span>
                <span>Again</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span>Good</span>
                <span aria-hidden="true">→</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
              {focusGrades.map((grade) => {
                const Icon = gradeIcons[grade];
                const isActivePendingGrade = pendingGrade === grade;

                return (
                  <Button
                    key={grade}
                    variant="outline"
                    size="lg"
                    onClick={() => handleGrade(grade)}
                    disabled={isPending || isAnimating}
                    className={cn(
                      "h-auto min-h-14 w-full min-w-0 border-2 px-1 py-0.75 text-[11px] font-semibold leading-tight shadow-xs transition-transform hover:-translate-y-0.5 sm:min-h-16 sm:px-4 sm:py-2 sm:text-sm",
                      gradeButtonStyles[grade],
                    )}
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
                      {previewLabels && (
                        <span className="text-pretty whitespace-normal wrap-break-word text-[9px] leading-tight font-medium opacity-80 sm:text-[11px]">
                          {previewLabels[grade].durationText}
                        </span>
                      )}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <Button
              onClick={() => setRevealed(true)}
              disabled={isPending}
              className="h-14 w-full text-base"
            >
              Show Answer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface FocusModeCompletionProps {
  reviewedCount: number;
  exitUrl: string;
  onContinue: () => void;
}

function FocusModeCompletion({
  reviewedCount,
  exitUrl,
  onContinue,
}: FocusModeCompletionProps) {
  useEffect(() => {
    triggerSuccessHaptic();
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="size-10 text-primary" />
      </div>

      <h1 className="mb-2 text-2xl font-bold">All caught up!</h1>
      <p className="mb-8 text-muted-foreground">
        {reviewedCount === 0
          ? "No cards were due for review."
          : `You reviewed ${reviewedCount} card${reviewedCount === 1 ? "" : "s"} in this session.`}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button onClick={onContinue} variant="outline" className="w-full">
          Check for More Cards
        </Button>
        <Button asChild className="w-full">
          <Link href={exitUrl}>Exit Focus Mode</Link>
        </Button>
      </div>
    </div>
  );
}
