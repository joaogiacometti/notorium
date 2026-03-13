import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <main>
      <AppPageContainer maxWidth="3xl">
        <div className="mb-6 flex min-w-0 items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="space-y-2 border-b p-6">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>
      </AppPageContainer>
    </main>
  );
}
