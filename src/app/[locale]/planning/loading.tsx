import { Skeleton } from "@/components/ui/skeleton";

export default function PlanningLoading() {
  const metricCards = Array.from(
    { length: 5 },
    (_, index) => `planning-loading-metric-${index}`,
  );
  const contentRows = Array.from(
    { length: 3 },
    (_, index) => `planning-loading-row-${index}`,
  );

  return (
    <main>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
        </div>

        <div className="mb-6">
          <Skeleton className="h-10 w-56 rounded-md" />
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metricCards.map((id) => (
            <Skeleton key={id} className="h-16 w-full rounded-xl" />
          ))}
        </div>

        <div className="space-y-3">
          {contentRows.map((id) => (
            <Skeleton key={id} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
