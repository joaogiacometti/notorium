import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardsLoadingShell } from "./flashcards-loading-shell";

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
          <div className="border-b border-border/60 bg-muted/30 px-4 py-4">
            <div className="grid grid-cols-[1.35fr_1fr_0.7fr_3.5rem] gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-20" />
              <div />
            </div>
          </div>
          <div className="space-y-0">
            <div className="border-b border-border/50 px-4 py-3">
              <div className="grid grid-cols-[1.35fr_1fr_0.7fr_3.5rem] gap-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-10 w-10 self-center justify-self-center rounded-full" />
              </div>
            </div>
            <div className="border-b border-border/50 px-4 py-3">
              <div className="grid grid-cols-[1.35fr_1fr_0.7fr_3.5rem] gap-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-10 w-10 self-center justify-self-center rounded-full" />
              </div>
            </div>
            <div className="border-b border-border/50 px-4 py-3">
              <div className="grid grid-cols-[1.35fr_1fr_0.7fr_3.5rem] gap-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-10 w-10 self-center justify-self-center rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-border/60 bg-muted/15 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-end">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </FlashcardsLoadingShell>
  );
}
