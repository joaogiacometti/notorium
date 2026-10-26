import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewHubViewProps {
  hasDueCards: boolean;
  dueBadgeText: string;
  hasExamCards: boolean;
  examBadgeText: string;
  examScopeLabel: string;
  reviewHref: string;
  examHref: string;
}

/**
 * Shows the flashcard review landing hub and its links to the review and exam
 * session pages.
 *
 * @example
 * <ReviewHubView hasDueCards dueBadgeText="3 due" hasExamCards examBadgeText="12 cards" examScopeLabel="All flashcards" reviewHref="/flashcards/review" examHref="/flashcards/exam" />
 */
export function ReviewHubView({
  hasDueCards,
  dueBadgeText,
  hasExamCards,
  examBadgeText,
  examScopeLabel,
  reviewHref,
  examHref,
}: Readonly<ReviewHubViewProps>) {
  return (
    <div className="min-w-0 space-y-3" data-testid="flashcard-review-hub">
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <ReviewActionCard
          title="Review"
          badgeText={dueBadgeText}
          isBadgeActive={hasDueCards}
          description="Review cards that are due on your spaced repetition schedule."
          bullets={[
            "Updates scheduling",
            "Uses memory ratings",
            hasDueCards ? "Ready now" : "No due cards",
          ]}
          action={() => (
            <StartReviewButton disabled={!hasDueCards} href={reviewHref} />
          )}
        />
        <ReviewActionCard
          title="Exam"
          badgeText={examBadgeText}
          isBadgeActive={hasExamCards}
          description="Practice every card in this scope without changing its review schedule."
          bullets={[examScopeLabel, "Shuffled practice", "Weak-card retry"]}
          action={() => (
            <StartExamButton disabled={!hasExamCards} href={examHref} />
          )}
        />
      </div>
    </div>
  );
}

interface ReviewActionCardProps {
  title: string;
  badgeText: string;
  isBadgeActive: boolean;
  description: string;
  bullets: string[];
  action: () => ReactNode;
}

function ReviewActionCard({
  title,
  badgeText,
  isBadgeActive,
  description,
  bullets,
  action,
}: Readonly<ReviewActionCardProps>) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex h-full flex-col p-4 sm:p-6">
        <ActionCardHeader
          title={title}
          badgeText={badgeText}
          isBadgeActive={isBadgeActive}
        />
        <div className="mt-3 lg:hidden">{action()}</div>
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
  isBadgeActive,
}: Readonly<{
  title: string;
  badgeText: string;
  isBadgeActive: boolean;
}>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="min-w-0 truncate text-base font-semibold tracking-tight">
        {title}
      </h2>
      <span className={getBadgeClassName(isBadgeActive)}>{badgeText}</span>
    </div>
  );
}

function ActionCardFooter({
  bullets,
  action,
}: Readonly<{ bullets: string[]; action: () => ReactNode }>) {
  return (
    // mt-auto pins the footer to the card bottom so both start buttons align
    // even when the descriptions wrap to different line counts.
    <div className="mt-auto hidden flex-col gap-1 pt-4 lg:flex">
      <ul className="grid gap-2 pb-4 text-sm text-muted-foreground">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-2">
            <span className="size-1 shrink-0 rounded-full bg-muted-foreground" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      {action()}
    </div>
  );
}

function StartReviewButton({
  disabled,
  href,
}: Readonly<{ disabled: boolean; href: string }>) {
  return (
    <Button
      asChild={!disabled}
      data-testid="flashcard-review-start-button"
      variant="default"
      disabled={disabled}
      className="h-11 w-full text-base"
    >
      {disabled ? "Start review" : <Link href={href}>Start review</Link>}
    </Button>
  );
}

function StartExamButton({
  disabled,
  href,
}: Readonly<{ disabled: boolean; href: string }>) {
  return (
    <Button
      asChild={!disabled}
      data-testid="flashcard-exam-start-button"
      variant="outline"
      disabled={disabled}
      className="h-11 w-full text-base"
    >
      {disabled ? "Start exam" : <Link href={href}>Start exam</Link>}
    </Button>
  );
}

function getBadgeClassName(isActive: boolean) {
  return cn(
    "shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
    isActive ? "text-foreground" : "text-muted-foreground",
  );
}
