import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function FlashcardDetailLoading() {
  return (
    <main>
      <PageTopBarSkeleton />
      <AppPageContainer maxWidth="3xl">
        <div className="mb-4 flex min-w-0 items-start gap-2">
          <div className="flex h-10 min-w-0 flex-1 items-center">
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="size-10 shrink-0 rounded-md" />
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="h-10.25 border-b" />
          <div className="flex flex-col gap-2 p-4 sm:p-6">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <div className="flex flex-col gap-2 border-t bg-muted/50 p-4 sm:p-6">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
