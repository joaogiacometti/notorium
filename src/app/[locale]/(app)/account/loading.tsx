import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <main>
      <AppPageContainer maxWidth="3xl">
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-1.5 h-4 w-72 max-w-full" />
          </div>
        </div>

        <div className="space-y-6">
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
      </AppPageContainer>
    </main>
  );
}
