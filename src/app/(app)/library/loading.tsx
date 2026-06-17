import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
  return (
    <>
      <PageTopBarSkeleton />
      <main className="lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden">
        <AppPageContainer className="flex flex-col lg:h-full lg:min-h-0">
          <div className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:flex-1">
            <div className="rounded-xl border border-border/70 bg-card/85 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                  <Skeleton className="h-10 w-full lg:max-w-3xl" />
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
                <div className="flex min-h-8 flex-wrap items-center gap-2 sm:justify-between">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <div className="ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34">
                    <Skeleton className="size-8 rounded-md" />
                    <div className="hidden h-5 w-px bg-border/60 sm:block" />
                    <Skeleton className="size-8 rounded-md" />
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/85 lg:min-h-0 lg:flex-1">
              <TableSkeleton
                columnTemplate="2rem minmax(0, 1fr) minmax(0, 12rem) 8rem 8rem 3rem"
                headers={[
                  { content: <div /> },
                  { className: "h-4 w-12" },
                  { className: "h-4 w-16" },
                  { className: "h-4 w-16" },
                  { className: "h-4 w-16" },
                  { content: <div /> },
                ]}
                rows={[
                  { className: "size-4 self-center rounded-sm" },
                  { className: "h-9 w-full" },
                  { className: "h-5 w-32" },
                  { className: "h-5 w-20" },
                  { className: "h-5 w-24" },
                  { className: "size-9 justify-self-start rounded-full" },
                ]}
                rowCount={4}
                rowClassName="py-3"
                footer={[
                  { className: "hidden h-7 w-28 rounded-full sm:block" },
                  { className: "hidden h-8 w-24 rounded-full sm:block" },
                  { className: "hidden h-8 w-24 rounded-full sm:block" },
                ]}
              />
            </div>
          </div>
        </AppPageContainer>
      </main>
    </>
  );
}
