import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardsLoadingShell } from "./flashcards-loading-shell";
import { FlashcardsManagerTableSkeleton } from "./flashcards-manager-table";

export function FlashcardsManageLoading() {
  return (
    <FlashcardsLoadingShell>
      <div
        className="flex flex-col gap-4 lg:h-full lg:min-h-0"
        data-testid="flashcards-manage-loading"
      >
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/85">
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1 lg:max-w-3xl">
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg sm:w-40" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-40 rounded-full" />
                <Skeleton className="h-6 w-44 rounded-full" />
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
