import { Skeleton } from "@/components/ui/skeleton";

export default function ArchivedSubjectsLoading() {
  const skeletonItems = Array.from(
    { length: 6 },
    (_, index) => `loading-archived-subject-${index}`,
  );

  return (
    <main>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Skeleton className="h-9 w-40" />
        </div>

        <div className="mb-8 flex items-start gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skeletonItems.map((id) => (
            <div
              key={id}
              className="rounded-xl border border-border/60 bg-card p-6"
            >
              <Skeleton className="mb-2 h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-2/3" />
              <Skeleton className="mt-3 h-3 w-28" />
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-md" />
                <Skeleton className="h-9 flex-1 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
