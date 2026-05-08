"use client";

import type { ReactNode } from "react";
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

/**
 * Shows the flashcard review landing hub and its review/exam actions.
 *
 * @example
 * <ReviewHubView hasDueCards dueBadgeText="3 due" hasExamCards examBadgeText="12 cards" examScopeLabel="All flashcards" isLoadingExamCards={false} isPending={false} onStartReview={startReview} onStartExam={startExam} />
 */
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
      className="grid min-w-0 gap-4 lg:grid-cols-2 lg:gap-5"
      data-testid="flashcard-review-hub"
    >
      <ReviewActionCard
        title="Review"
        badgeText={dueBadgeText}
        description="Go through cards that are due based on your spaced repetition schedule."
        bullets={[
          "Spaced repetition",
          "Again · Hard · Good · Easy",
          "Tracks your progress",
        ]}
        action={
          <StartReviewButton
            disabled={isPending || !hasDueCards}
            onClick={onStartReview}
          />
        }
      />
      <ReviewActionCard
        title="Exam"
        badgeText={examBadgeText}
        description="Practice every card in this scope without changing its review schedule."
        bullets={[examScopeLabel, "Shuffled practice", "Retry weak cards"]}
        action={
          <StartExamButton
            disabled={isPending || !hasExamCards || isLoadingExamCards}
            isLoading={isLoadingExamCards}
            onClick={onStartExam}
          />
        }
      />
    </div>
  );
}

interface ReviewActionCardProps {
  title: string;
  badgeText: string;
  description: string;
  bullets: string[];
  action: ReactNode;
}

function ReviewActionCard({
  title,
  badgeText,
  description,
  bullets,
  action,
}: Readonly<ReviewActionCardProps>) {
  return (
    <div className="relative rounded-xl border border-border/70 bg-card/85 py-0 shadow-none">
      <div className="flex h-full flex-col p-4 sm:p-6">
        <ActionCardHeader title={title} badgeText={badgeText} />
        <p className="mt-2 text-pretty text-sm text-muted-foreground">
          {description}
        </p>
        <ActionCardFooter bullets={bullets} action={action} />
      </div>
    </div>
  );
}

function ActionCardHeader({
  title,
  badgeText,
}: Readonly<{ title: string; badgeText: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
      <span className="shrink-0 text-sm font-medium text-muted-foreground">
        {badgeText}
      </span>
    </div>
  );
}

function ActionCardFooter({
  bullets,
  action,
}: Readonly<{ bullets: string[]; action: ReactNode }>) {
  return (
    <div className="mt-auto flex flex-col gap-1 pt-3 sm:pt-4">
      <ul className="hidden space-y-2.5 pb-3 text-sm text-muted-foreground sm:block">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-(--primary)" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      {action}
    </div>
  );
}

function StartReviewButton({
  disabled,
  onClick,
}: Readonly<{ disabled: boolean; onClick: () => void }>) {
  return (
    <Button
      data-testid="flashcard-review-start-button"
      variant="default"
      onClick={onClick}
      disabled={disabled}
      className="h-10 w-full text-base sm:h-11"
    >
      Start review
    </Button>
  );
}

function StartExamButton({
  disabled,
  isLoading,
  onClick,
}: Readonly<{
  disabled: boolean;
  isLoading: boolean;
  onClick: () => void;
}>) {
  return (
    <Button
      data-testid="flashcard-exam-start-button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="h-10 w-full text-base sm:h-11"
    >
      <AsyncButtonContent
        pending={isLoading}
        pendingLabel="Loading cards..."
        idleLabel="Start exam"
      />
    </Button>
  );
}
