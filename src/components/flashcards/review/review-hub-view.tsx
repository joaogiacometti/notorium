"use client";

import type { ReactNode } from "react";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { SyncStatusDot } from "@/components/shared/sync-status-dot";
import { Button } from "@/components/ui/button";
import type { FlashcardReviewSyncStatus } from "@/features/flashcard-review/offline-store";
import { getFlashcardReviewSyncIndicatorStatus } from "@/features/flashcard-review/sync-status";
import type { SyncIndicatorStatus } from "@/lib/sync-status";

interface ReviewHubViewProps {
  hasDueCards: boolean;
  dueBadgeText: string;
  hasExamCards: boolean;
  examBadgeText: string;
  examScopeLabel: string;
  isLoadingExamCards: boolean;
  isPending: boolean;
  syncStatus: FlashcardReviewSyncStatus;
  pendingSyncCount: number;
  isOnline: boolean;
  onStartReview: () => void;
  onStartExam: () => void;
}

/**
 * Shows the flashcard review landing hub and its review/exam actions.
 *
 * @example
 * <ReviewHubView hasDueCards dueBadgeText="3 due" hasExamCards examBadgeText="12 cards" examScopeLabel="All flashcards" isLoadingExamCards={false} isPending={false} syncStatus="idle" pendingSyncCount={0} isOnline onStartReview={startReview} onStartExam={startExam} />
 */
export function ReviewHubView({
  hasDueCards,
  dueBadgeText,
  hasExamCards,
  examBadgeText,
  examScopeLabel,
  isLoadingExamCards,
  isPending,
  syncStatus,
  pendingSyncCount,
  isOnline,
  onStartReview,
  onStartExam,
}: Readonly<ReviewHubViewProps>) {
  const reviewSyncStatus = getFlashcardReviewSyncIndicatorStatus({
    syncStatus,
    pendingSyncCount,
    isOnline,
  });

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
        syncStatus={reviewSyncStatus}
        syncText={getVisibleSyncText(reviewSyncStatus, pendingSyncCount)}
        pendingSyncCount={pendingSyncCount}
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
  syncStatus?: SyncIndicatorStatus;
  syncText?: string;
  pendingSyncCount?: number;
}

function ReviewActionCard({
  title,
  badgeText,
  description,
  bullets,
  action,
  syncStatus,
  syncText,
  pendingSyncCount = 0,
}: Readonly<ReviewActionCardProps>) {
  return (
    <div className="relative rounded-xl border border-border/70 py-0 shadow-none">
      <ActionCardSyncIndicator
        status={syncStatus}
        pendingCount={pendingSyncCount}
      />
      <div className="flex h-full flex-col p-4 sm:p-6">
        <ActionCardHeader title={title} badgeText={badgeText} />
        <p className="mt-2 text-pretty text-sm text-muted-foreground">
          {description}
        </p>
        <VisibleSyncText text={syncText} />
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

function ActionCardSyncIndicator({
  status,
  pendingCount,
}: Readonly<{
  status?: SyncIndicatorStatus;
  pendingCount: number;
}>) {
  if (!status) {
    return null;
  }

  return (
    <SyncStatusDot
      status={status}
      pendingCount={pendingCount}
      className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3"
    />
  );
}

function VisibleSyncText({ text }: Readonly<{ text?: string }>) {
  if (!text) {
    return null;
  }

  return (
    <span className="mt-3 inline-flex w-fit items-center rounded-md border border-(--intent-warning-border) bg-(--intent-warning-bg) px-2 py-0.5 text-xs font-medium text-(--intent-warning-text)">
      {text}
    </span>
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

function getVisibleSyncText(
  status: SyncIndicatorStatus,
  pendingSyncCount: number,
) {
  if (status === "error") {
    return "Sync failed";
  }

  if (status === "pending") {
    return `${pendingSyncCount} pending sync`;
  }

  return status === "syncing" || status === "offline"
    ? getStatusLabel(status)
    : "";
}

function getStatusLabel(status: SyncIndicatorStatus) {
  return status === "syncing" ? "Syncing" : "Offline";
}
