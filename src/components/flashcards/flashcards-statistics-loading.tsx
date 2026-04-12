import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardsLoadingShell } from "./flashcards-loading-shell";

const topRows = ["top-row-1", "top-row-2", "top-row-3", "top-row-4"];
const panels = ["panel-1", "panel-2"];
const rows = ["row-1", "row-2", "row-3", "row-4"];

export function FlashcardsStatisticsLoading() {
  return (
    <FlashcardsLoadingShell>
      <div
        className="flex flex-col gap-3 lg:h-full lg:min-h-0"
        data-testid="flashcards-statistics-loading"
      >
        <div className="grid min-w-0 w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <Skeleton className="h-10 w-full rounded-lg sm:w-48" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-40" />
        </div>

        <div className="grid gap-3 lg:min-h-0 lg:grid-rows-[auto_1fr]">
          <div className="grid gap-3 xl:grid-cols-2">
            <Card className="gap-0 rounded-2xl border-border/70 py-0 shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24 rounded-md" />
                    <Skeleton className="h-10 w-20 rounded-md" />
                  </div>
                  <Skeleton className="h-7 w-24 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-4 w-full rounded-md" />
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 rounded-xl border-border/70 py-0 shadow-none">
              <CardHeader className="px-4 pt-3 pb-0">
                <Skeleton className="h-4 w-24 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-2.5 p-4">
                {topRows.map((row) => (
                  <div key={row} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-3 w-20 rounded-md" />
                      <Skeleton className="h-3 w-6 rounded-md" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {panels.map((panel) => (
              <Card
                key={panel}
                className="gap-0 rounded-xl border-border/70 py-0 shadow-none"
              >
                <CardHeader className="px-4 pt-3 pb-0">
                  <Skeleton className="h-4 w-24 rounded-md" />
                </CardHeader>
                <CardContent className="space-y-2.5 p-4">
                  {rows.map((row) => (
                    <div key={row} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <Skeleton className="h-3 w-20 rounded-md" />
                        <Skeleton className="h-3 w-6 rounded-md" />
                      </div>
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </FlashcardsLoadingShell>
  );
}
