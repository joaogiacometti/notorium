import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function MindmapDetailLoading() {
  return (
    <main>
      <PageTopBarSkeleton />
      <AppPageContainer
        maxWidth="7xl"
        className="lg:flex lg:h-[calc(100svh-3.5rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
      >
        <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1">
          <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
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
