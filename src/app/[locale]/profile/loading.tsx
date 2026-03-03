import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <main>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />

        <div className="mt-6 space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="mt-1 h-4 w-64" />

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="mt-1 h-4 w-80" />
            <div className="mt-6 flex gap-3">
              <Skeleton className="h-10 w-28 rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
          </div>

          <div className="rounded-xl border border-destructive/50 bg-card p-6">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="mt-1 h-4 w-72" />
            <Skeleton className="mt-6 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-3/4" />
            <Skeleton className="mt-4 h-10 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </main>
  );
}
