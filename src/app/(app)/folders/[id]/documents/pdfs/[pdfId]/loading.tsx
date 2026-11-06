import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function PdfDetailLoading() {
  return (
    <main>
      <PageTopBarSkeleton />
      <AppPageContainer
        maxWidth="7xl"
        className="flex h-[calc(100dvh-3.5rem-var(--app-mobile-header-height,0rem))] flex-col gap-2 overflow-hidden px-0 pt-2 pb-0 sm:gap-4 sm:pt-6 sm:pb-4 lg:pb-6"
      >
        <div className="flex min-w-0 shrink-0 items-start justify-between gap-2 px-4 sm:gap-4 sm:px-0">
          <Skeleton className="h-10 w-2/3 rounded-md" />
          <div className="flex shrink-0 gap-2">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="size-10 rounded-lg" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <Skeleton className="order-last h-14 w-full rounded-md sm:order-first sm:h-9" />
          <Skeleton className="min-h-0 flex-1 rounded-md" />
        </div>
      </AppPageContainer>
    </main>
  );
}
