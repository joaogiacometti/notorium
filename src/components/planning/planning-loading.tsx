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
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/85 p-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <Skeleton
                key={`planning-calendar-day-${index + 1}`}
                className="h-16 rounded-lg"
              />
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/85 p-4">
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
