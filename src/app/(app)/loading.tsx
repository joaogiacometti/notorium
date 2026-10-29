import { ReviewActivityCardSkeleton } from "@/components/home/review-activity-card";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <>
      <PageTopBarSkeleton />
      <main className="lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden">
        <AppPageContainer className="flex flex-col lg:h-full lg:min-h-0">
          <div className="space-y-4">
            <Skeleton className="mb-4 h-7 w-56" />
            <Card className="flex-row items-center gap-4 px-6 py-4">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-40" />
              </div>
              <Skeleton className="h-9 w-32" />
            </Card>
            <ReviewActivityCardSkeleton />
            <CardSkeleton lines={4} />
          </div>
        </AppPageContainer>
      </main>
    </>
  );
}

function CardSkeleton({ lines }: Readonly<{ lines: number }>) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex min-h-5 flex-row items-center gap-2 space-y-0">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows have no stable id
            key={index}
            className="h-4 w-full"
          />
        ))}
      </CardContent>
    </Card>
  );
}
