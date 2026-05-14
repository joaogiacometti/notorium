import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectDetailLoading() {
  const skeletonItems = Array.from(
    { length: 3 },
    (_, index) => `loading-note-${index}`,
  );
  return (
    <main>
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

        <div>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
            <Skeleton className="mt-1.5 h-4 w-72 max-w-full" />
          </div>
          <div className="rounded-xl border border-border/60 p-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>

        <Skeleton className="my-8 h-px w-full" />

        <div>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
            <Skeleton className="mt-1.5 h-4 w-72 max-w-full" />
          </div>
          <div className="rounded-xl border border-border/60 p-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div className="flex items-end gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="mt-3 space-y-0">
            {skeletonItems.map((id) => (
              <div
                key={id}
                className="flex items-center gap-3 rounded-md px-2 py-1.5"
              >
                <Skeleton className="size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-1 h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Skeleton className="my-8 h-px w-full" />

        <div>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-20" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-10" />
              </div>
            </div>
            <Skeleton className="mt-1.5 h-4 w-64 max-w-full" />
          </div>
          <div className="space-y-1">
            {skeletonItems.map((id) => (
              <div
                key={id}
                className="flex items-start gap-3 rounded-md px-2 py-2"
              >
                <Skeleton className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
