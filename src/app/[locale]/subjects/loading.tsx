import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectsLoading() {
  const skeletonItems = Array.from(
    { length: 6 },
    (_, index) => `loading-subject-${index}`,
  );
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skeletonItems.map((id) => (
          <div
            key={id}
            className="rounded-xl border border-border/60 bg-card p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="size-8 rounded-md" />
            </div>
            <Skeleton className="mb-2 h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
