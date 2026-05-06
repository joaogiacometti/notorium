import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function NoteDetailLoading() {
  return (
    <main>
      <AppPageContainer
        maxWidth="5xl"
        className="lg:flex lg:h-[calc(100svh-4rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
      >
        <div className="mb-4 shrink-0">
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="min-w-0 border-border bg-transparent lg:flex lg:min-h-0 lg:flex-col lg:border-r">
            <div className="border-b border-border/60 p-4">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </div>
                <Skeleton className="h-9 w-24 shrink-0" />
              </div>
            </div>
            <div className="flex gap-2 overflow-hidden p-3 lg:block lg:min-h-0 lg:flex-1 lg:space-y-2">
              <Skeleton className="h-16 min-w-36 sm:min-w-40 lg:w-full lg:min-w-0" />
              <Skeleton className="h-16 min-w-36 sm:min-w-40 lg:w-full lg:min-w-0" />
              <Skeleton className="h-16 min-w-36 sm:min-w-40 lg:w-full lg:min-w-0" />
            </div>
          </aside>

          <div className="min-w-0 space-y-4 lg:flex lg:min-h-0 lg:flex-col">
            <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>
              <div className="flex shrink-0">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-md border border-border/60 lg:min-h-0 lg:flex-1">
              <Skeleton className="h-14 w-full rounded-b-none" />
              <div className="space-y-4 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
