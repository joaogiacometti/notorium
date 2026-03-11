import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlanningLoading() {
  const skeletonRows = Array.from(
    { length: 8 },
    (_, index) => `loading-row-${index}`,
  );

  return (
    <main className="lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden">
      <AppPageContainer className="flex flex-col lg:h-full lg:min-h-0">
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-full max-w-72" />
          </div>
        </div>

        <div className="mb-6">
          <Skeleton className="h-10 w-56 rounded-lg" />
        </div>

        <div className="lg:flex-1 lg:min-h-0">
          <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
            <div className="gap-0 overflow-hidden rounded-xl border border-border/60 bg-card/95 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
              <div className="gap-0 border-b border-border/60 bg-muted/20 px-4 pb-3 pt-4 sm:px-6">
                <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/20 p-2">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                </div>
              </div>

              <div className="px-0 py-0 lg:flex-1 lg:min-h-0">
                <div className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
                  <div className="space-y-3 p-4 lg:hidden">
                    {skeletonRows.map((id) => (
                      <div
                        key={id}
                        className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <Skeleton className="size-7 shrink-0 rounded-lg" />
                            <div className="min-w-0 flex-1">
                              <Skeleton className="h-4 w-2/3" />
                              <Skeleton className="mt-1 h-3 w-1/2" />
                            </div>
                          </div>
                          <Skeleton className="size-8 shrink-0 rounded-md" />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Skeleton className="h-6 w-24 rounded-md" />
                          <Skeleton className="h-6 w-20 rounded-md" />
                          <Skeleton className="h-6 w-24 rounded-md" />
                          <Skeleton className="h-6 w-12 rounded-md" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="sticky top-0 z-10 bg-muted/30">
                        <tr className="border-b border-border/50">
                          <th className="h-11 w-[25%] px-4 sm:px-6">
                            <Skeleton className="h-3 w-12" />
                          </th>
                          <th className="h-11 px-2">
                            <Skeleton className="h-3 w-10" />
                          </th>
                          <th className="h-11 px-2">
                            <Skeleton className="h-3 w-12" />
                          </th>
                          <th className="h-11 px-2">
                            <Skeleton className="h-3 w-16" />
                          </th>
                          <th className="h-11 px-2">
                            <Skeleton className="h-3 w-10" />
                          </th>
                          <th className="h-11 px-2">
                            <Skeleton className="h-3 w-14" />
                          </th>
                          <th className="h-11 w-22 px-4 sm:px-6">
                            <Skeleton className="ml-auto h-3 w-14" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {skeletonRows.map((id) => (
                          <tr key={id} className="border-b border-border/40">
                            <td className="max-w-0 px-4 py-2 sm:px-6">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="mt-1 h-3 w-1/2" />
                            </td>
                            <td className="px-2 py-2">
                              <Skeleton className="h-4 w-16" />
                            </td>
                            <td className="px-2 py-2">
                              <Skeleton className="h-5 w-16 rounded-md" />
                            </td>
                            <td className="px-2 py-2">
                              <Skeleton className="h-4 w-20" />
                            </td>
                            <td className="px-2 py-3">
                              <Skeleton className="h-4 w-8" />
                            </td>
                            <td className="max-w-0 px-2 py-3">
                              <Skeleton className="h-6 w-20 rounded-full" />
                            </td>
                            <td className="px-4 py-3 sm:px-6">
                              <div className="flex justify-end">
                                <Skeleton className="size-8 rounded-md" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-end gap-4 border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
