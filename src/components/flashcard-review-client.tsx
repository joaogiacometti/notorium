"use client";

import {
  CheckCircle2,
  CircleAlert,
  Gauge,
  Pencil,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getFlashcardReviewState,
  reviewFlashcard,
} from "@/app/actions/flashcard-review";
import { TiptapRenderer } from "@/components/tiptap-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FlashcardReviewState } from "@/lib/api/contracts";
import {
  applyReviewedFlashcardToState,
  mergeFlashcardReviewStates,
  shouldRefillFlashcardReviewState,
} from "@/lib/flashcard-review-state";
import type { ReviewGrade } from "@/lib/flashcard-scheduler";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import { EditFlashcardDialog } from "./edit-flashcard-dialog";

interface FlashcardReviewClientProps {
  initialState: FlashcardReviewState;
  subjectId?: string;
}

const reviewGrades: ReviewGrade[] = ["again", "hard", "good", "easy"];
const reviewBatchLimit = 50;
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
}: Readonly<FlashcardReviewClientProps>) {
  const t = useTranslations("FlashcardReviewPage");
  const tErrors = useTranslations("ServerActions");
  const [reviewState, setReviewState] = useState(initialState);
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

  async function refreshReviewState() {
    const nextState = await getFlashcardReviewState({
      subjectId,
      limit: reviewBatchLimit,
    });
    setReviewState(nextState);
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
    if (!currentCard) {
      return;
    }

    startTransition(async () => {
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

      if (shouldRefillFlashcardReviewState(nextState)) {
        void refillReviewState();
      }
    });
  }

  let reviewContent = null;

  if (currentCard) {
    reviewContent = (
      <Card>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
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
            <TiptapRenderer
              content={currentCard.front}
              className="min-w-0 wrap-break-word hyphens-auto text-base leading-relaxed"
            />
          </div>

          {revealed && (
            <div className="space-y-2 border-t border-border/60 pt-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t("back_label")}
              </h3>
              <TiptapRenderer
                content={currentCard.back}
                className="min-w-0 wrap-break-word hyphens-auto text-base leading-relaxed"
              />
            </div>
          )}

          {revealed ? (
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {reviewGrades.map((grade) => {
                const Icon = gradeIcons[grade];

                return (
                  <Button
                    key={grade}
                    variant="outline"
                    size="lg"
                    onClick={() => handleGrade(grade)}
                    disabled={isPending}
                    className={`h-12 w-full min-w-0 border-2 px-2 text-sm font-semibold shadow-xs transition-transform hover:-translate-y-0.5 sm:px-4 ${gradeButtonStyles[grade]}`}
                  >
                    <Icon className="hidden size-4 sm:inline-flex" />
                    {t(`grade_${grade}`)}
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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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

      {reviewContent}
      {currentCard ? (
        <EditFlashcardDialog
          flashcard={currentCard}
          open={editOpen}
          onOpenChange={setEditOpen}
          onUpdated={refreshReviewState}
        />
      ) : null}
    </div>
  );
}
