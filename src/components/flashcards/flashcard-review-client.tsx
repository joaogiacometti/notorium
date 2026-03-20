"use client";

import {
  CheckCircle2,
  CircleAlert,
  Gauge,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
import { AppPageContainer } from "@/components/shared/app-page-container";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { SubjectText } from "@/components/shared/subject-text";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  FlashcardReviewState,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import { DeleteFlashcardDialog } from "./delete-flashcard-dialog";
import { EditFlashcardDialog } from "./edit-flashcard-dialog";

interface FlashcardReviewClientProps {
  initialState: FlashcardReviewState;
  subjects: SubjectEntity[];
  subjectId?: string;
  embedded?: boolean;
}

const reviewGrades: ReviewGrade[] = ["again", "hard", "good", "easy"];
const reviewBatchLimit = 50;
const reviewCardHeightClassName = "flex h-full min-h-0 gap-0 overflow-hidden";
const reviewContentFrameClassName = "mx-auto flex w-full max-w-5xl";
const reviewContentMeasureClassName = "w-full max-w-[58rem]";
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

export function FlashcardReviewClient({
  initialState,
  subjects,
  subjectId,
  embedded = false,
}: Readonly<FlashcardReviewClientProps>) {
  const t = useTranslations("FlashcardReviewPage");
  const tErrors = useTranslations("ServerActions");
  const shortcutsSuspended = useShortcutsDialogOpen();
  const [reviewState, setReviewState] = useState(initialState);
  const reviewStateRef = useRef(initialState);
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<ReviewGrade | null>(null);
  const [isPending, startTransition] = useTransition();
  const refillRequestIdRef = useRef(0);

  const currentCard = reviewState.cards[0] ?? null;

  const dueCountText =
    reviewState.summary.dueCount === 0
      ? t("due_empty")
      : t("due_count", {
          due: reviewState.summary.dueCount,
          total: reviewState.summary.totalCount,
        });
  const previewLabels = currentCard
    ? getFlashcardReviewPreviewLabels({
        card: currentCard,
        scheduler: reviewState.scheduler,
      })
    : null;

  function commitReviewState(nextState: FlashcardReviewState) {
    reviewStateRef.current = nextState;
    setReviewState(nextState);
  }

  async function handleFlashcardUpdated(
    updatedFlashcard: FlashcardReviewState["cards"][number],
  ) {
    if (subjectId && updatedFlashcard.subjectId !== subjectId) {
      const nextState = await getFlashcardReviewState({
        subjectId,
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

  async function refillReviewState() {
    const requestId = refillRequestIdRef.current + 1;
    refillRequestIdRef.current = requestId;

    const nextState = await getFlashcardReviewState({
      subjectId,
      limit: reviewBatchLimit,
    });

    if (refillRequestIdRef.current !== requestId) {
      return;
    }

    commitReviewState(
      mergeFlashcardReviewStates(reviewStateRef.current, nextState),
    );
  }

  function handleGrade(grade: ReviewGrade) {
    if (!currentCard || isPending) {
      return;
    }

    setPendingGrade(grade);
    startTransition(async () => {
      try {
        const result = await reviewFlashcard({ id: currentCard.id, grade });

        if (!result.success) {
          toast.error(resolveActionErrorMessage(result, tErrors));
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

  let reviewContent = null;

  if (currentCard) {
    reviewContent = (
      <Card
        className={reviewCardHeightClassName}
        data-testid="flashcard-review-card"
      >
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="flex min-h-0 flex-1 flex-col px-6 pt-0 pb-3 sm:px-8">
            <div
              className={`${reviewContentFrameClassName} min-h-0 flex-1 flex-col`}
            >
              <div className="shrink-0 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  {currentCard.subjectName ? (
                    <p className="flex min-w-0 items-baseline gap-1 text-sm font-medium text-foreground/70">
                      <span className="shrink-0">{t("subject_prefix")}</span>
                      <SubjectText
                        value={currentCard.subjectName}
                        mode="truncate"
                        className="block max-w-full"
                      />
                    </p>
                  ) : (
                    <span className="min-h-5" />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => setEditOpen(true)}
                    disabled={isPending}
                    aria-label={t("edit")}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {t("front_label")}
                </h2>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pt-1.5 pb-5"
                data-testid="flashcard-review-front-scroll"
              >
                <div className={reviewContentMeasureClassName}>
                  <TiptapRenderer
                    content={currentCard.front}
                    className="min-w-0 wrap-break-word hyphens-auto text-base leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {revealed && (
              <div
                className={`${reviewContentFrameClassName} min-h-0 flex-1 flex-col space-y-2 border-t border-border/60 pt-2`}
              >
                <h3 className="shrink-0 text-sm font-semibold text-muted-foreground">
                  {t("back_label")}
                </h3>
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-5"
                  data-testid="flashcard-review-back-scroll"
                >
                  <div className={reviewContentMeasureClassName}>
                    <TiptapRenderer
                      content={currentCard.back}
                      className="min-w-0 wrap-break-word hyphens-auto text-base leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/60 px-6 pt-4 pb-0 sm:px-8">
            <div className={`${reviewContentFrameClassName} pb-0`}>
              {revealed ? (
                <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-1.5 sm:gap-3">
                  {reviewGrades.map((grade) => {
                    const Icon = gradeIcons[grade];
                    const isActivePendingGrade = pendingGrade === grade;

                    return (
                      <Button
                        key={grade}
                        variant="outline"
                        size="lg"
                        onClick={() => handleGrade(grade)}
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
                            <span className="truncate">
                              {t(`grade_${grade}`)}
                            </span>
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
                </div>
              ) : (
                <Button
                  onClick={() => setRevealed(true)}
                  disabled={isPending}
                  className="w-full"
                >
                  {t("show_answer")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  } else {
    reviewContent = (
      <Card>
        <CardContent className="pt-0">
          <h2 className="text-base font-semibold">{t("empty_title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("empty_description")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <>
      {embedded ? null : (
        <div
          className={`flex min-w-0 items-start gap-4 ${currentCard ? "mb-10" : "mb-6"}`}
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <RotateCcw className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              {t("description")}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {dueCountText}
            </p>
          </div>
        </div>
      )}

      {reviewContent}
      {currentCard ? (
        <>
          <EditFlashcardDialog
            key={currentCard.id}
            flashcard={currentCard}
            subjects={subjects}
            open={editOpen}
            onOpenChange={setEditOpen}
            onUpdated={handleFlashcardUpdated}
          />
          <DeleteFlashcardDialog
            flashcardId={currentCard.id}
            flashcardFront={currentCard.front}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDeleted={handleFlashcardDeleted}
          />
        </>
      ) : null}
    </>
  );

  return embedded ? (
    <div className="flex h-full min-h-0 flex-col">{content}</div>
  ) : (
    <AppPageContainer>{content}</AppPageContainer>
  );
}
