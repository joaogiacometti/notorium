import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  const dayCells = Array.from(
    { length: 35 },
    (_, index) => `calendar-loading-day-${index}`,
  );

  return (
    <AppPageContainer>
      <div className="mb-10 flex min-w-0 items-start gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div className="min-w-0">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>

        <div className="grid grid-cols-7 gap-px lg:gap-1">
          {Array.from(
            { length: 7 },
            (_, index) => `calendar-loading-weekday-${index}`,
          ).map((id) => (
            <Skeleton key={id} className="h-4 rounded-sm" />
          ))}
          {dayCells.map((id) => (
            <Skeleton key={id} className="h-12 rounded-md lg:h-20" />
          ))}
        </div>
      </div>
    </AppPageContainer>
  );
}
