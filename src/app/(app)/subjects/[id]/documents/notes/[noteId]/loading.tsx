import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function NoteDetailLoading() {
  return (
    <main>
      <PageTopBarSkeleton />
      <AppPageContainer
        maxWidth="7xl"
        className="lg:flex lg:h-[calc(100svh-3.5rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
      >
        <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1">
          <div className="min-w-0 space-y-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
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
