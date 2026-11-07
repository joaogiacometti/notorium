import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors `NoteDetail` outside zen mode: the h-10 title row with its zen-mode
 * and actions buttons, then the bordered editor with its toolbar.
 */
export function NoteDetailLoading() {
  return (
    <main>
      <PageTopBarSkeleton />
      <AppPageContainer
        maxWidth="7xl"
        className="lg:flex lg:h-[calc(100svh-3.5rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
      >
        <div className="min-w-0 space-y-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
            <div className="flex h-10 min-w-0 flex-1 items-center px-3">
              <Skeleton className="h-6 w-full max-w-sm" />
            </div>
            <div className="flex shrink-0 gap-2">
              <Skeleton className="size-10" />
              <Skeleton className="size-10" />
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-md border border-input lg:min-h-0 lg:flex-1">
            <div className="h-10.25 border-b" />
            <div className="min-h-[60svh] space-y-4 px-3 py-2 lg:min-h-0">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
