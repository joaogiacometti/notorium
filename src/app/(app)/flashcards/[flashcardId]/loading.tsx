import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function FlashcardDetailLoading() {
  return (
    <main>
      <AppPageContainer maxWidth="3xl">
        <div className="mb-4 shrink-0">
          <Skeleton className="h-9 w-44" />
        </div>

        <div className="mb-6 flex min-w-0 items-start justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="size-10 shrink-0 rounded-md" />
        </div>

        <div className="space-y-4">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-40 w-full rounded-md border border-input" />
          </div>

          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-40 w-full rounded-md border border-input" />
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
