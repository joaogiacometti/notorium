import { FlashcardsManagerTableSkeleton } from "@/components/flashcards/manage/flashcards-manager-table";
import { FlashcardsLoadingShell } from "@/components/flashcards/shared/flashcards-loading-shell";
import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardsManageLoading() {
  return (
    <FlashcardsLoadingShell withWorkspace>
      <div
        className="flex flex-col gap-3 lg:h-full lg:min-h-0"
        data-testid="flashcards-manage-loading"
      >
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card/85">
          <div className="relative px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1 lg:max-w-3xl">
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-28 rounded-lg" />
                  <Skeleton className="h-10 w-36 rounded-lg" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem]">
                  <Skeleton className="h-6 w-44 rounded-full" />
                </div>
                <div className="ml-auto min-h-8 sm:min-w-34" />
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/85 lg:min-h-0 lg:flex-1">
          <FlashcardsManagerTableSkeleton />
        </div>
      </div>
    </FlashcardsLoadingShell>
  );
}
