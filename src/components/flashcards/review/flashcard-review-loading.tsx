import { FlashcardsLoadingShell } from "@/components/flashcards/shared/flashcards-loading-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function FlashcardReviewLoading() {
  return (
    <FlashcardsLoadingShell>
      <FlashcardReviewLoadingBody />
    </FlashcardsLoadingShell>
  );
}

/**
 * Mirrors `ReviewHubView`'s two action cards. Shared by the route loading
 * state and the in-page subject change.
 */
export function FlashcardReviewLoadingBody() {
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto"
      data-testid="flashcards-review-loading"
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {(["review", "exam"] as const).map((key) => (
          <FlashcardReviewActionCardSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}

function FlashcardReviewActionCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex h-full flex-col p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-5.5 w-16" />
        </div>
        <Skeleton className="mt-3 h-11 w-full lg:hidden" />
        <div className="mt-3">
          <TextLineSkeleton className="w-full" />
          <TextLineSkeleton className="w-3/4" />
        </div>
        <div className="mt-auto hidden flex-col gap-1 pt-4 lg:flex">
          <div className="grid gap-2 pb-4">
            <TextLineSkeleton className="w-36" />
            <TextLineSkeleton className="w-40" />
            <TextLineSkeleton className="w-32" />
          </div>
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

/** One `text-sm` line: a 1rem bar inside the 1.25rem line box. */
function TextLineSkeleton({ className }: Readonly<{ className: string }>) {
  return (
    <div className="flex h-5 items-center">
      <Skeleton className={cn("h-4", className)} />
    </div>
  );
}
