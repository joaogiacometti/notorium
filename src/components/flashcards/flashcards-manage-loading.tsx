import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardsLoadingShell } from "./flashcards-loading-shell";

export function FlashcardsManageLoading() {
  const tableRows = Array.from(
    { length: 5 },
    (_, index) => `flashcards-loading-row-${index}`,
  );

  return (
    <FlashcardsLoadingShell>
      <div className="space-y-6" data-testid="flashcards-manage-loading">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <Skeleton className="h-10 w-full sm:min-w-72" />
            <Skeleton className="h-10 w-full sm:min-w-56" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-9 w-full sm:w-32" />
            <Skeleton className="h-9 w-full sm:w-36" />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-44" />
        </div>

        <div className="rounded-xl border border-border/60 bg-card">
          <div className="border-b p-4">
            <div className="grid grid-cols-[35%_30%_1fr_5.5rem] gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="ml-auto h-4 w-14" />
            </div>
          </div>
          <div className="space-y-3 p-4">
            {tableRows.map((id) => (
              <div
                key={id}
                className="grid grid-cols-[35%_30%_1fr_5.5rem] items-center gap-3"
              >
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="ml-auto h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
    </FlashcardsLoadingShell>
  );
}
