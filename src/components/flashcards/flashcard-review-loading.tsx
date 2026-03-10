import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardsLoadingShell } from "./flashcards-loading-shell";

export function FlashcardReviewLoading() {
  return (
    <FlashcardsLoadingShell>
      <div className="space-y-6" data-testid="flashcards-review-loading">
        <Skeleton className="h-5 w-40" />

        <div className="rounded-xl border border-border/60 bg-card">
          <div className="space-y-6 p-6 sm:p-8">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-11/12" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 px-6 pt-4 pb-0 sm:px-8">
            <Skeleton className="mb-4 h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    </FlashcardsLoadingShell>
  );
}
