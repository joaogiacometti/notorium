import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectDetailLoading() {
  const skeletonItems = Array.from(
    { length: 3 },
    (_, index) => `loading-note-${index}`,
  );
  return (
    <AppPageContainer maxWidth="3xl">
      <div className="mb-6">
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-full max-w-64" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        </div>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <Skeleton className="h-9 flex-1 sm:w-20 sm:flex-none" />
          <Skeleton className="h-9 flex-1 sm:w-24 sm:flex-none" />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-full sm:w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      <Skeleton className="my-8 h-px w-full" />

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-full sm:w-32" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>

      <Skeleton className="my-8 h-px w-full" />

      <div>
        <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-full sm:w-28" />
        </div>
        <div className="space-y-3">
          {skeletonItems.map((id) => (
            <div
              key={id}
              className="rounded-xl border border-border/60 bg-card p-4"
            >
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </AppPageContainer>
  );
}
