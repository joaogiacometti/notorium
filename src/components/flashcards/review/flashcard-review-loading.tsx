import { FlashcardsLoadingShell } from "@/components/flashcards/shared/flashcards-loading-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardReviewLoading() {
  return (
    <FlashcardsLoadingShell withWorkspace mobileScopeFirst>
      <div
        className="flex h-full min-h-0 flex-col overflow-y-auto"
        data-testid="flashcards-review-loading"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {(["review", "exam"] as const).map((key) => (
            <Card key={key} className="gap-0 rounded-xl py-0 shadow-none">
              <CardContent className="flex h-full flex-col p-4 sm:p-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-7 w-28" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="lg:hidden">
                    <Skeleton className="h-11 w-full rounded-lg" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-10/12 lg:w-full" />
                </div>
                <div className="mt-4 hidden flex-col gap-1 lg:flex">
                  <div className="grid gap-2 pb-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <Skeleton className="h-11 w-full rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FlashcardsLoadingShell>
  );
}
