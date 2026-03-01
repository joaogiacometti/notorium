import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-start gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-1.5 h-3 w-56" />
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-7 gap-px lg:gap-1">
            {[
              "hdr-mon",
              "hdr-tue",
              "hdr-wed",
              "hdr-thu",
              "hdr-fri",
              "hdr-sat",
              "hdr-sun",
            ].map((id) => (
              <Skeleton key={id} className="h-5 rounded" />
            ))}
            {Array.from({ length: 35 }, (_, i) => `cell-${i}`).map((id) => (
              <Skeleton key={id} className="h-10 rounded-md lg:h-18" />
            ))}
          </div>
        </div>
        <div className="w-full shrink-0 lg:w-80">
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
