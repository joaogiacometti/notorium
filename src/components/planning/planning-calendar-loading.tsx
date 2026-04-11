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
              {Array.from({ length: 7 }, (_, index) => (
                <Skeleton
                  key={`planning-calendar-weekday-skeleton-${index + 1}`}
                  className="h-5 rounded-sm"
                />
              ))}
              {Array.from({ length: 35 }, (_, index) => (
                <Skeleton
                  key={`planning-calendar-day-skeleton-${index + 1}`}
                  className="h-10 rounded-md lg:h-16"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/85 p-4 lg:min-h-0 lg:overflow-y-auto">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton
                key={`planning-calendar-detail-skeleton-${index + 1}`}
                className="h-16 rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    </PlanningLoadingShell>
  );
}
