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
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <CardSkeleton lines={2} />
              <CardSkeleton lines={4} />
            </div>
            <ReviewActivitySkeleton />
            <div className="grid gap-3 lg:grid-cols-2">
              <CardSkeleton lines={4} />
              <CardSkeleton lines={4} />
            </div>
          </div>
        </AppPageContainer>
      </main>
    </>
  );
}

function CardSkeleton({ lines }: Readonly<{ lines: number }>) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Skeleton className="size-4 rounded-md" />
        <Skeleton className="h-5 w-40" />
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

function ReviewActivitySkeleton() {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Skeleton className="size-4 rounded-md" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="ml-auto h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-2.5">
        <Skeleton className="h-24 w-full rounded-md" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
