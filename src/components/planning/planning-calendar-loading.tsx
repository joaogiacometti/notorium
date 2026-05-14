import { Skeleton } from "@/components/ui/skeleton";
import { PlanningLoadingShell } from "./planning-loading-shell";

export function PlanningCalendarLoading() {
  return (
    <PlanningLoadingShell>
      <div
        className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.6fr)_22rem]"
        data-testid="planning-calendar-loading"
      >
        <div className="rounded-xl border border-border/70 bg-card/85 p-4 lg:flex lg:min-h-0 lg:flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Skeleton className="size-8 rounded" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="size-8 rounded" />
            </div>
            <Skeleton className="h-7 w-16 rounded" />
          </div>

          <div className="mt-4 min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <div className="grid grid-cols-7 gap-px lg:gap-1">
              {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                <Skeleton
                  key={`planning-calendar-weekday-skeleton-${n}`}
                  className="h-5 rounded-sm"
                />
              ))}
              {Array.from({ length: 35 }, (_, i) => i + 1).map((n) => (
                <Skeleton
                  key={`planning-calendar-day-skeleton-${n}`}
                  className="h-10 rounded-md lg:h-16"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/85 lg:min-h-0 lg:overflow-y-auto">
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-44" />
            </div>
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>

          <div className="space-y-2 p-3 pt-0">
            {Array.from({ length: 4 }, (_, i) => i + 1).map((n) => (
              <div
                key={`planning-calendar-detail-skeleton-${n}`}
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5"
              >
                <Skeleton className="size-8 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PlanningLoadingShell>
  );
}
