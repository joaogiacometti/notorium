"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getDueFlashcards,
  getFlashcardReviewSummary,
  reviewFlashcard,
} from "@/app/actions/flashcard-review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FlashcardReviewEntity } from "@/lib/api/contracts";
import type { ReviewGrade } from "@/lib/flashcard-scheduler";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";

interface ReviewSummary {
  dueCount: number;
  totalCount: number;
}

interface FlashcardReviewClientProps {
  initialCards: FlashcardReviewEntity[];
  initialSummary: ReviewSummary;
  subjectId?: string;
}

const reviewGrades: ReviewGrade[] = ["again", "hard", "good", "easy"];

export function FlashcardReviewClient({
  initialCards,
  initialSummary,
  subjectId,
}: Readonly<FlashcardReviewClientProps>) {
  const t = useTranslations("FlashcardReviewPage");
  const tErrors = useTranslations("ServerActions");
  const [cards, setCards] = useState(initialCards);
  const [summary, setSummary] = useState(initialSummary);
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentCard = cards[0] ?? null;

  const dueCountText = useMemo(() => {
    if (summary.dueCount === 0) {
      return t("due_empty");
    }

    return t("due_count", {
      due: summary.dueCount,
      total: summary.totalCount,
    });
  }, [summary.dueCount, summary.totalCount, t]);

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

      const [nextCards, nextSummary] = await Promise.all([
        getDueFlashcards({ subjectId, limit: 50 }),
        getFlashcardReviewSummary({ subjectId }),
      ]);

      setCards(nextCards);
      setSummary(nextSummary);
      setRevealed(false);
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("description")}
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {dueCountText}
        </p>
      </div>

      {!currentCard ? (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">{t("empty_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("empty_description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("front_label")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="whitespace-pre-wrap text-base leading-relaxed">
              {currentCard.front}
            </p>

            {revealed && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4">
                <h3 className="text-sm font-semibold">{t("back_label")}</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {currentCard.back}
                </p>
              </div>
            )}

            {!revealed ? (
              <Button
                onClick={() => setRevealed(true)}
                disabled={isPending}
                className="w-full"
              >
                {t("show_answer")}
              </Button>
            ) : (
              <div className="grid gap-2 sm:grid-cols-4">
                {reviewGrades.map((grade) => (
                  <Button
                    key={grade}
                    variant={grade === "again" ? "destructive" : "outline"}
                    onClick={() => handleGrade(grade)}
                    disabled={isPending}
                    className="w-full"
                  >
                    {t(`grade_${grade}`)}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
