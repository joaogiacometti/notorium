import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function FlashcardDetailLoading() {
  return (
    <main>
      <PageTopBarSkeleton />
      <AppPageContainer maxWidth="7xl">
        <div className="mb-4 flex min-w-0 items-start gap-2">
          <div className="flex h-10 min-w-0 flex-1 items-center">
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="size-10 shrink-0 rounded-md" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-52 w-full rounded-md border border-input lg:h-92" />
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-52 w-full rounded-md border border-input lg:h-92" />
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
