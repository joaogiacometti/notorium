import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardsLoadingShell } from "./flashcards-loading-shell";

export function FlashcardReviewLoading() {
  return (
    <FlashcardsLoadingShell lockViewport>
      <div
        className="flex h-full min-h-0 flex-col"
        data-testid="flashcards-review-loading"
      >
        <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid min-w-0 w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <div className="min-w-0 sm:w-auto sm:min-w-32 sm:max-w-64">
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="min-w-0 sm:w-auto sm:min-w-32 sm:max-w-64">
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-md sm:w-34" />
        </div>

        <div className="mb-3 flex items-center">
          <Skeleton className="h-5 w-56" />
        </div>

        <Card className="flex h-full min-h-0 gap-0 overflow-hidden">
          <CardContent className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <div className="flex min-h-0 flex-1 flex-col px-6 pt-0 pb-3 sm:px-8">
              <div className="mx-auto flex min-h-0 max-h-[50%] w-full max-w-5xl flex-none flex-col">
                <div className="shrink-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="size-8 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-14" />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden pt-2">
                  <div className="w-full max-w-232 space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-11/12" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border/60 px-6 pt-4 pb-0 sm:px-8">
              <div className="mx-auto flex w-full max-w-5xl pb-0">
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FlashcardsLoadingShell>
  );
}
