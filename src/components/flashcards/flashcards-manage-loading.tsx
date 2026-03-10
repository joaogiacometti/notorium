import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardsLoadingShell } from "./flashcards-loading-shell";

export function FlashcardsManageLoading() {
  const tableRows = Array.from(
    { length: 5 },
    (_, index) => `flashcards-loading-row-${index}`,
  );

  return (
    <FlashcardsLoadingShell>
      <div
        className="flex flex-col gap-4 lg:h-full lg:min-h-0"
        data-testid="flashcards-manage-loading"
      >
        <div className="gap-0 overflow-hidden rounded-xl border border-border/60 bg-card/95 py-0 shadow-none lg:flex-1 lg:min-h-0">
          <div className="gap-0 border-b border-border/60 bg-muted/20 px-4 pt-4 pb-3 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/20 p-2">
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_13rem]">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0 lg:items-center">
                <Skeleton className="h-9 w-full sm:w-32" />
                <Skeleton className="h-9 w-full sm:w-36" />
              </div>
            </div>
          </div>

          <div className="px-0 py-0 lg:flex-1 lg:min-h-0">
            <div className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-6">
                  <div className="grid grid-cols-[35%_30%_1fr_5.5rem] gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="ml-auto h-4 w-14" />
                  </div>
                </div>

                <div className="space-y-1 px-4 py-2 sm:px-6">
                  {tableRows.map((id) => (
                    <div
                      key={id}
                      className="grid grid-cols-[35%_30%_1fr_5.5rem] items-center gap-3 py-3"
                    >
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
                <Skeleton className="h-9 w-20 rounded-md" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </FlashcardsLoadingShell>
  );
}
