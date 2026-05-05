import { AppPageContainer } from "@/components/shared/app-page-container";
import { SubjectsTableSkeleton } from "@/components/subjects/subjects-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectsLoading() {
  return (
    <main className="lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden">
      <AppPageContainer className="flex flex-col lg:h-full lg:min-h-0">
        <div className="mb-6 flex min-w-0 items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-full max-w-72" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:flex-1">
          <div className="rounded-xl border border-border/70 bg-card/85 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <Skeleton className="h-10 w-full lg:max-w-3xl" />
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Skeleton className="h-9 w-full sm:w-80" />
                <Skeleton className="h-10 w-full sm:w-48" />
              </div>
              <div className="flex min-h-8 flex-wrap items-center gap-2 sm:justify-between">
                <Skeleton className="h-6 w-24 rounded-full" />
                <div className="ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34">
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="size-8 rounded-md" />
                  <div className="hidden h-5 w-px bg-border/60 sm:block" />
                  <Skeleton className="size-8 rounded-md" />
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/85 lg:min-h-0 lg:flex-1">
            <SubjectsTableSkeleton selectedRow />
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
