import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function MindmapDetailLoading() {
  return (
    <main>
      <AppPageContainer
        maxWidth="7xl"
        className="lg:flex lg:h-[calc(100svh-4rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
      >
        <div className="mb-4 flex shrink-0 items-center gap-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside className="min-w-0 border-border bg-transparent lg:flex lg:min-h-0 lg:flex-col lg:border-r">
            <div className="border-b border-border/60 p-4">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-20 shrink-0" />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:min-h-0 lg:flex-1 lg:space-y-1 lg:overflow-y-auto">
              <div className="flex min-w-36 items-center gap-2 rounded-md px-3 py-2.5 sm:min-w-40 lg:min-w-0">
                <Skeleton className="size-4 shrink-0 rounded" />
                <Skeleton className="h-4 min-w-0 flex-1" />
              </div>
              <div className="flex min-w-36 items-center gap-2 rounded-md px-3 py-2.5 sm:min-w-40 lg:min-w-0">
                <Skeleton className="size-4 shrink-0 rounded" />
                <Skeleton className="h-4 min-w-0 flex-1" />
              </div>
              <div className="flex min-w-36 items-center gap-2 rounded-md px-3 py-2.5 sm:min-w-40 lg:min-w-0">
                <Skeleton className="size-4 shrink-0 rounded" />
                <Skeleton className="h-4 min-w-0 flex-1" />
              </div>
            </div>
          </aside>

          <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
            <div className="mb-4 flex shrink-0 items-center gap-2">
              <Skeleton className="h-10 min-w-0 flex-1 rounded-md" />
              <Skeleton className="size-9 shrink-0 rounded-lg" />
            </div>
            <Skeleton className="h-[60svh] flex-1 rounded-lg lg:h-auto lg:min-h-0" />
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
