import { Skeleton } from "@/components/ui/skeleton";
import { PlanningAssessmentsManagerTableSkeleton } from "./planning-assessments-manager-table";
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
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
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
        <div className="h-[clamp(22rem,58svh,36rem)] overflow-hidden rounded-xl border border-border/70 bg-card/85 lg:h-auto lg:min-h-0 lg:flex-1">
          <PlanningAssessmentsManagerTableSkeleton />
        </div>
      </div>
    </PlanningLoadingShell>
  );
}
