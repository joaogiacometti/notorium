import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function NoteDetailLoading() {
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
              <Skeleton className="h-8 w-full max-w-64" />
              <Skeleton className="mt-3 h-3 w-32" />
            </div>
          </div>
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <Skeleton className="h-9 flex-1 sm:w-20 sm:flex-none" />
            <Skeleton className="h-9 flex-1 sm:w-24 sm:flex-none" />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
