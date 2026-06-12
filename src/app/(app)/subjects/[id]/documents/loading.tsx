import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectDocumentsLoading() {
  const rows = Array.from({ length: 8 }, (_, index) => `document-row-${index}`);

  return (
    <main>
      <AppPageContainer
        maxWidth="7xl"
        className="lg:flex lg:h-[calc(100svh-4rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
      >
        <div className="mb-4 shrink-0">
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside className="min-w-0 border-border bg-transparent lg:flex lg:min-h-0 lg:flex-col lg:border-r">
            <div className="border-b border-border/60 p-4">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-9 w-20 shrink-0" />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:min-h-0 lg:flex-1 lg:space-y-1 lg:overflow-y-auto">
              {rows.map((row) => (
                <div
                  key={row}
                  className="flex min-w-36 items-center gap-2 rounded-md px-3 py-2.5 sm:min-w-40 lg:min-w-0"
                >
                  <Skeleton className="size-4 shrink-0 rounded" />
                  <Skeleton className="h-4 min-w-0 flex-1" />
                </div>
              ))}
            </div>
          </aside>
          <section className="hidden min-h-72 items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/15 text-center lg:flex">
            <div className="max-w-xs px-6">
              <Skeleton className="mx-auto size-8 rounded-full" />
              <Skeleton className="mx-auto mt-3 h-5 w-32" />
              <Skeleton className="mx-auto mt-1 h-4 w-48" />
            </div>
          </section>
        </div>
      </AppPageContainer>
    </main>
  );
}
