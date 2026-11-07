import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFlashcardReviewSessionHref,
  getFlashcardsHref,
} from "@/lib/navigation/detail-page-back-link";
import type { FlashcardReviewSummary } from "@/lib/server/api-contracts";

interface FlashcardsDueCardProps {
  summary: FlashcardReviewSummary;
}

/**
 * Dashboard row showing how many flashcards are due for review now, with the
 * one action that matters next: review them, or browse when caught up.
 */
export function FlashcardsDueCard({
  summary,
}: Readonly<FlashcardsDueCardProps>) {
  const caughtUp = summary.dueCount === 0;

  return (
    <Card className="flex-row items-center gap-4 px-6 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium">Flashcards due</p>
        <p className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">
            {summary.dueCount}
          </span>
          <span className="truncate text-sm text-muted-foreground">
            {caughtUp
              ? "You're all caught up."
              : `of ${summary.totalCount} cards ready to review`}
          </span>
        </p>
      </div>
      <Button asChild variant={caughtUp ? "outline" : "default"}>
        <Link
          href={
            caughtUp
              ? getFlashcardsHref("review")
              : getFlashcardReviewSessionHref()
          }
        >
          {caughtUp ? "Browse flashcards" : "Review now"}
        </Link>
      </Button>
    </Card>
  );
}

/** Loading placeholder matching {@link FlashcardsDueCard}'s line heights. */
export function FlashcardsDueCardSkeleton() {
  return (
    <Card className="flex-row items-center gap-4 px-6 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex h-5 items-center">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex h-8 items-center">
          <Skeleton className="h-7 w-48" />
        </div>
      </div>
      <Skeleton className="h-9 w-32" />
    </Card>
  );
}
