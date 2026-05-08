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
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          {(["review", "exam"] as const).map((key) => (
            <Card key={key} className="gap-0 rounded-xl py-0 shadow-none">
              <CardContent className="flex h-full flex-col p-4 sm:p-6">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <Skeleton className="h-7 w-32 sm:h-8" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-10/12" />
                </div>
                <div className="mt-auto flex flex-col gap-1 pt-3 sm:pt-4">
                  <div className="hidden space-y-2.5 pb-3 sm:block">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-lg sm:h-11" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FlashcardsLoadingShell>
  );
}
