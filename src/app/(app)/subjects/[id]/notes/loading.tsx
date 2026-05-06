import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectNotesLoading() {
  const rows = Array.from({ length: 8 }, (_, index) => `note-row-${index}`);

  return (
    <main>
      <AppPageContainer
        maxWidth="5xl"
        className="lg:flex lg:h-[calc(100svh-4rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
      >
        <div className="mb-4 shrink-0">
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="min-w-0 border-border bg-transparent lg:flex lg:min-h-0 lg:flex-col lg:border-r">
            <div className="border-b border-border/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="mt-2 h-4 w-28" />
                </div>
                <Skeleton className="size-8" />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-y-auto">
              {rows.map((row) => (
                <div key={row} className="min-w-48 rounded-md px-3 py-2.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </AppPageContainer>
    </main>
  );
}
