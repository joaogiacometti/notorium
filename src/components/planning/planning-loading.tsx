"use client";

import { useSearchParams } from "next/navigation";
import { PlanningAssessmentsLoading } from "@/components/planning/planning-assessments-loading";
import { PlanningLoadingShell } from "@/components/planning/planning-loading-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { resolvePlanningView } from "@/features/planning/view";

function PlanningCalendarLoading() {
  return (
    <PlanningLoadingShell>
      <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.6fr)_22rem]">
        <div className="rounded-xl border border-border/70 bg-card/85 p-4 lg:flex lg:min-h-0 lg:flex-col">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-14 rounded-lg" />
          </div>
          <div className="mt-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton
                  key={`planning-calendar-weekday-${index + 1}`}
                  className="h-4 rounded-md"
                />
              ))}
              {Array.from({ length: 35 }).map((_, index) => (
                <Skeleton
                  key={`planning-calendar-day-${index + 1}`}
                  className="h-10 rounded-lg lg:h-16"
                />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/85 p-4">
          <Skeleton className="h-6 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={`planning-calendar-event-${index + 1}`}
                className="h-16 rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    </PlanningLoadingShell>
  );
}

export function PlanningLoading() {
  const searchParams = useSearchParams();
  const view = resolvePlanningView(searchParams.get("view") ?? undefined);

  return view === "calendar" ? (
    <PlanningCalendarLoading />
  ) : (
    <PlanningAssessmentsLoading />
  );
}
