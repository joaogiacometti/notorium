"use client";

import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";

interface ReviewHubViewProps {
  hasDueCards: boolean;
  dueBadgeText: string;
  hasExamCards: boolean;
  examBadgeText: string;
  examScopeLabel: string;
  isLoadingExamCards: boolean;
  isPending: boolean;
  onStartReview: () => void;
  onStartExam: () => void;
}

export function ReviewHubView({
  hasDueCards,
  dueBadgeText,
  hasExamCards,
  examBadgeText,
  examScopeLabel,
  isLoadingExamCards,
  isPending,
  onStartReview,
  onStartExam,
}: Readonly<ReviewHubViewProps>) {
  return (
    <div
      className="grid min-w-0 gap-4 lg:grid-cols-2"
      data-testid="flashcard-review-hub"
    >
      <div className="rounded-xl border border-border/70 py-0 shadow-none">
        <div className="flex h-full flex-col gap-3 p-4 sm:gap-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-primary uppercase">
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
            onClick={onStartReview}
            disabled={isPending || !hasDueCards}
            className="mt-auto h-10 w-full text-base sm:h-11"
          >
            Start review
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 py-0 shadow-none">
        <div className="flex h-full flex-col gap-3 p-4 sm:gap-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center rounded-md border border-(--intent-success-border) bg-(--intent-success-bg) px-2 py-0.5 text-xs font-semibold tracking-wide text-(--intent-success-text) uppercase">
              All cards
            </span>
            <span className="inline-flex items-center rounded-md border border-(--intent-success-border) bg-(--intent-success-bg) px-2 py-0.5 text-xs font-medium text-(--intent-success-text)">
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
              <span className="size-2 rounded-full bg-(--intent-success-fill)" />
              <span>{examScopeLabel}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-(--intent-success-fill)" />
              <span>No scheduling impact</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-(--intent-success-fill)" />
              <span>Randomized order</span>
            </li>
          </ul>

          <Button
            data-testid="flashcard-exam-start-button"
            variant="outline"
            onClick={() => void onStartExam()}
            disabled={isLoadingExamCards || isPending || !hasExamCards}
            className="mt-auto h-10 w-full text-base sm:h-11"
          >
            <AsyncButtonContent
              pending={isLoadingExamCards}
              idleLabel="Start exam"
              pendingLabel="Loading exam..."
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
