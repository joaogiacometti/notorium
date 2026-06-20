import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectDetailLoading() {
  return (
    <main>
      <PageTopBarSkeleton />
      <AppPageContainer maxWidth="5xl">
        <SummarySectionSkeleton actionCount={1} />
        <Skeleton className="my-8 h-px w-full" />
        <SummarySectionSkeleton actionCount={2} />
      </AppPageContainer>
    </main>
  );
}

interface SummarySectionSkeletonProps {
  actionCount: number;
}

function SummarySectionSkeleton({
  actionCount,
}: Readonly<SummarySectionSkeletonProps>) {
  const actions = Array.from(
    { length: actionCount },
    (_, index) => `loading-action-${index}`,
  );
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-28" />
        <div className="flex items-center gap-2">
          {actions.map((id) => (
            <Skeleton key={id} className="h-8 w-24" />
          ))}
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}
