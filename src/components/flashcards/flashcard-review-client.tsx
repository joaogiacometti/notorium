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
import { SubjectText } from "@/components/shared/subject-text";
import { TiptapRenderer } from "@/components/shared/tiptap-renderer";
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
import type { FlashcardReviewState } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import { EditFlashcardDialog } from "./edit-flashcard-dialog";

interface FlashcardReviewClientProps {
  initialState: FlashcardReviewState;
  subjectId?: string;
  embedded?: boolean;
}

const reviewGrades: ReviewGrade[] = ["again", "hard", "good", "easy"];
const reviewBatchLimit = 50;
const reviewContentFrameClassName = "mx-auto flex min-h-0 w-full max-w-5xl";
const reviewContentMeasureClassName = "w-full max-w-[58rem]";
const gradeButtonStyles: Record<ReviewGrade, string> = {
  again:
    "border-destructive/45 bg-destructive/10 text-destructive hover:border-destructive/60 hover:bg-destructive/15",
  hard: "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:border-amber-500/55 hover:bg-amber-500/15 dark:text-amber-300",
  good: "border-primary/45 bg-primary/10 text-primary hover:border-primary/60 hover:bg-primary/15",
  easy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500/55 hover:bg-emerald-500/15 dark:text-emerald-300",
};
const gradeIcons: Record<ReviewGrade, typeof CircleAlert> = {
  again: CircleAlert,
  hard: Gauge,
  good: CheckCircle2,
  easy: Sparkles,
};

export function FlashcardReviewClient({
  initialState,
  subjectId,
  embedded = false,
}: Readonly<FlashcardReviewClientProps>) {
  const t = useTranslations("FlashcardReviewPage");
  const tErrors = useTranslations("ServerActions");
  const [reviewState, setReviewState] = useState(initialState);
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

  function handleFlashcardUpdated(
    updatedFlashcard: FlashcardReviewState["cards"][number],
  ) {
    setReviewState((currentState) =>
      replaceFlashcardInReviewState(currentState, updatedFlashcard),
    );
    setRevealed(false);
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

    setReviewState((currentState) =>
      mergeFlashcardReviewStates(currentState, nextState),
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
          reviewState,
          result.reviewedCardId,
          result.flashcard,
        );

        setReviewState(nextState);
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
    const action = getFlashcardReviewShortcutAction({
      key: event.key,
      revealed,
      hasCurrentCard: currentCard !== null,
      isPending,
      isDialogOpen: editOpen,
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
        className={
          revealed
            ? "max-h-[calc(100svh-16rem)] gap-0 overflow-hidden sm:max-h-[calc(100svh-18rem)]"
            : "gap-0"
        }
      >
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="flex min-h-0 flex-1 flex-col px-6 pt-0 sm:px-8">
            <div
              className={`${reviewContentFrameClassName} flex-1 flex-col space-y-3 pb-3`}
            >
              <div className="shrink-0 space-y-1.5">
                {currentCard.subjectName ? (
                  <p className="min-w-0 text-sm font-medium text-muted-foreground">
                    <SubjectText
                      value={currentCard.subjectName}
                      mode="truncate"
                      className="block max-w-full"
                    />
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {t("front_label")}
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEditOpen(true)}
                    disabled={isPending}
                  >
                    <Pencil className="size-3.5" />
                    {t("edit")}
                  </Button>
                </div>
                <div className={reviewContentMeasureClassName}>
                  <TiptapRenderer
                    content={currentCard.front}
                    className="min-w-0 wrap-break-word hyphens-auto text-base leading-relaxed"
                  />
                </div>
              </div>

              {revealed && (
                <div className="flex min-h-0 flex-1 flex-col space-y-2 border-t border-border/60 pt-2">
                  <h3 className="shrink-0 text-sm font-semibold text-muted-foreground">
                    {t("back_label")}
                  </h3>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
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
        <EditFlashcardDialog
          key={currentCard.id}
          flashcard={currentCard}
          open={editOpen}
          onOpenChange={setEditOpen}
          onUpdated={handleFlashcardUpdated}
        />
      ) : null}
    </>
  );

  return embedded ? (
    <div className="space-y-6">{content}</div>
  ) : (
    <AppPageContainer>{content}</AppPageContainer>
  );
}
