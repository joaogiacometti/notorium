import { FlashcardsLoadingShell } from "@/components/flashcards/shared/flashcards-loading-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardReviewLoading() {
  return (
    <FlashcardsLoadingShell withWorkspace>
      <div
        className="flex h-full min-h-0 flex-col overflow-y-auto"
        data-testid="flashcards-review-loading"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {(["review", "exam"] as const).map((key) => (
            <Card key={key} className="gap-0 rounded-xl py-0 shadow-none">
              <CardContent className="flex h-full flex-col gap-3 p-4 sm:gap-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-7 w-32 sm:h-8" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-10/12" />
                </div>
                <div className="hidden space-y-1.5 sm:block">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <Skeleton className="mt-auto h-10 w-full rounded-lg sm:h-11" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FlashcardsLoadingShell>
  );
}
