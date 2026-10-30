import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function PdfDetailLoading() {
  return (
    <main>
      <PageTopBarSkeleton />
      <AppPageContainer
        maxWidth="7xl"
        className="flex h-[calc(100svh-3.5rem)] flex-col gap-4 overflow-hidden pb-4 lg:pb-6"
      >
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
          <Skeleton className="h-10 w-2/3 rounded-md" />
          <div className="flex shrink-0 gap-2">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="size-10 rounded-lg" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="min-h-0 flex-1 rounded-md" />
        </div>
      </AppPageContainer>
    </main>
  );
}
