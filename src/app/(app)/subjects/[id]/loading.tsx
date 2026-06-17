import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectDetailLoading() {
  const cardItems = Array.from(
    { length: 3 },
    (_, index) => `loading-card-${index}`,
  );
  const documentItems = Array.from(
    { length: 3 },
    (_, index) => `loading-document-${index}`,
  );
  return (
    <main>
      <PageTopBarSkeleton />
      <AppPageContainer maxWidth="5xl">
        <div>
          <Skeleton className="mb-4 h-6 w-28" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cardItems.map((id) => (
              <Skeleton key={id} className="h-[4.5rem] w-full rounded-xl" />
            ))}
          </div>
        </div>

        <Skeleton className="my-8 h-px w-full" />

        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="space-y-1">
            {documentItems.map((id) => (
              <div
                key={id}
                className="flex items-start gap-3 rounded-md px-2 py-2"
              >
                <Skeleton className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
