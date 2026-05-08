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
    <div className="min-w-0 space-y-3" data-testid="flashcard-review-hub">
      <div className="max-w-2xl space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Flashcard review
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose scheduled review for memory work or exam mode for free
          practice.
        </p>
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <ReviewActionCard
          title="Review"
          badgeText={dueBadgeText}
          badgeTone={hasDueCards ? "primary" : "muted"}
          description="Go through cards that are due based on your spaced repetition schedule."
          bullets={[
            "Updates scheduling",
            "Uses memory ratings",
            hasDueCards ? "Ready now" : "No due cards",
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
          badgeTone={hasExamCards ? "info" : "muted"}
          description="Practice every card in this scope without changing its review schedule."
          bullets={[examScopeLabel, "Shuffled practice", "Weak-card retry"]}
          action={
            <StartExamButton
              disabled={isPending || !hasExamCards || isLoadingExamCards}
              isLoading={isLoadingExamCards}
              onClick={onStartExam}
            />
          }
        />
      </div>
    </div>
  );
}

interface ReviewActionCardProps {
  title: string;
  badgeText: string;
  badgeTone: "primary" | "info" | "muted";
  description: string;
  bullets: string[];
  action: ReactNode;
}

function ReviewActionCard({
  title,
  badgeText,
  badgeTone,
  description,
  bullets,
  action,
}: Readonly<ReviewActionCardProps>) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card py-0 shadow-xs">
      <div className="flex h-full flex-col p-4 sm:p-5">
        <ActionCardHeader
          title={title}
          badgeText={badgeText}
          badgeTone={badgeTone}
        />
        <p className="mt-3 text-pretty text-sm text-muted-foreground">
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
  badgeTone,
}: Readonly<{
  title: string;
  badgeText: string;
  badgeTone: ReviewActionCardProps["badgeTone"];
}>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="min-w-0 truncate text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <span className={getBadgeClassName(badgeTone)}>{badgeText}</span>
    </div>
  );
}

function ActionCardFooter({
  bullets,
  action,
}: Readonly<{ bullets: string[]; action: ReactNode }>) {
  return (
    <div className="mt-4 flex flex-col gap-1">
      <ul className="grid gap-2 pb-4 text-sm text-muted-foreground">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-primary/70" />
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
      className="h-11 w-full text-base"
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
      className="h-11 w-full text-base"
    >
      <AsyncButtonContent
        pending={isLoading}
        pendingLabel="Loading cards..."
        idleLabel="Start exam"
      />
    </Button>
  );
}

function getBadgeClassName(tone: ReviewActionCardProps["badgeTone"]) {
  const baseClassName =
    "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold";

  if (tone === "primary") {
    return `${baseClassName} border-primary/20 bg-primary/10 text-primary`;
  }

  if (tone === "info") {
    return `${baseClassName} border-(--intent-info-border) bg-(--intent-info-bg) text-(--intent-info-text)`;
  }

  return `${baseClassName} border-border/70 bg-muted/60 text-muted-foreground`;
}
