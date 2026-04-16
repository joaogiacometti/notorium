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
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-linear-to-br from-card via-card to-primary/5">
          <div className="absolute top-0 right-0 size-28 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1 lg:max-w-3xl">
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Skeleton className="h-10 flex-1 rounded-lg sm:w-28 sm:flex-none" />
                  <Skeleton className="h-10 flex-1 rounded-lg sm:w-36 sm:flex-none" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem]">
                  <Skeleton className="h-6 w-32 rounded-full" />
                  <Skeleton className="h-6 w-48 rounded-full" />
                </div>
                <div className="ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="hidden h-5 w-px bg-border/60 sm:block" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
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
