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
          <div className="space-y-6">
            <Skeleton className="h-8 w-56" />
            <div className="grid gap-4 lg:grid-cols-2">
              <CardSkeleton lines={2} />
              <CardSkeleton lines={4} />
            </div>
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
          </div>
        </AppPageContainer>
      </main>
    </>
  );
}

function CardSkeleton({ lines }: Readonly<{ lines: number }>) {
  return (
    <Card>
      <CardHeader>
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
