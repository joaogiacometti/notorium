import { format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarLoading() {
  const title = format(new Date(), "MMMM yyyy");

  return (
    <main>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word text-2xl font-bold tracking-tight">
              Calendar
            </h1>
            <p className="mt-1.5 wrap-break-word text-sm text-muted-foreground">
              Assessments and attendance misses on a timeline.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8" disabled>
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="min-w-40 text-center text-base font-semibold">
                {title}
              </h2>
              <Button variant="ghost" size="icon" className="size-8" disabled>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
              Today
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="min-w-0">
              <div className="grid grid-cols-7 gap-px lg:gap-1">
                {WEEKDAY_LABELS.map((d) => (
                  <div
                    key={d}
                    className="py-1 text-center text-[11px] font-medium text-muted-foreground lg:text-xs"
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: 35 }, (_, i) => `skel-${i}`).map((id) => (
                  <Skeleton key={id} className="h-10 rounded-md lg:h-18" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
