import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssessmentDetailLoading() {
  return (
    <main>
      <PageTopBarSkeleton />
      <AppPageContainer maxWidth="4xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>

          {/* Two cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
              <Skeleton className="mb-3 h-4 w-16" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
              <Skeleton className="mb-3 h-4 w-16" />
              <Skeleton className="mb-4 h-9 w-32" />
              <Skeleton className="mb-4 h-1.5 w-full rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Attachments */}
          <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
