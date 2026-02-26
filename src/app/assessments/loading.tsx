import { Skeleton } from "@/components/ui/skeleton";

export default function AssessmentsLoading() {
  const listItems = Array.from(
    { length: 3 },
    (_, index) => `assessment-loading-${index}`,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-52" />
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>

      <div className="space-y-3">
        {listItems.map((id) => (
          <Skeleton key={id} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
