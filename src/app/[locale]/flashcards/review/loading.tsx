import { Skeleton } from "@/components/ui/skeleton";

export default function FlashcardReviewLoading() {
  return (
    <main>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
            <Skeleton className="mt-2 h-4 w-36" />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>

            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    </main>
  );
}
