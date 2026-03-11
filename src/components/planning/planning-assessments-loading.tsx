import { Skeleton } from "@/components/ui/skeleton";
import { PlanningLoadingShell } from "./planning-loading-shell";

export function PlanningAssessmentsLoading() {
  return (
    <PlanningLoadingShell>
      <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/85">
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <Skeleton className="h-10 w-full lg:max-w-3xl rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg sm:w-44" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-36 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/85 lg:min-h-0 lg:flex-1">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-4">
            <div className="grid grid-cols-[0.96fr_0.7fr_0.62fr_0.68fr_0.72fr_3.5rem] gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <div />
            </div>
          </div>
          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`planning-loading-row-${index + 1}`}
                className="border-b border-border/50 px-4 py-3"
              >
                <div className="grid grid-cols-[0.96fr_0.7fr_0.62fr_0.68fr_0.72fr_3.5rem] gap-4">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-10 w-10 self-center justify-self-start rounded-full" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-border/60 bg-muted/15 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-end">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </PlanningLoadingShell>
  );
}
