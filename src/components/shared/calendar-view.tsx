"use client";

import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCalendarEvents } from "@/app/actions/calendar";
import { DayDetail, EventDot } from "@/components/shared/calendar-day-detail";
import { Button } from "@/components/ui/button";
import {
  buildCalendarEvents,
  type CalendarEvent,
  getMonthGridDates,
  getMonthRange,
  groupEventsByDate,
  resolveCalendarDate,
} from "@/lib/dates/calendar";
import { formatIsoDate } from "@/lib/dates/format";
import { cn } from "@/lib/utils";

const emptyEvents: CalendarEvent[] = [];

function DayCell({
  date,
  dayEvents,
  isCurrentMonth,
  selected,
  todayIso,
  onSelect,
}: Readonly<{
  date: Date;
  dayEvents: CalendarEvent[];
  isCurrentMonth: boolean;
  selected: boolean;
  todayIso: string;
  onSelect: (d: Date) => void;
}>) {
  const today = isToday(date);

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={cn(
        "group relative flex min-h-10 flex-col rounded-md border p-1 text-left transition-colors lg:min-h-16 lg:p-1.5",
        !isCurrentMonth && "opacity-40",
        selected
          ? "border-primary/50 bg-primary/5"
          : "border-transparent hover:border-border hover:bg-muted/30",
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full text-[11px] font-medium lg:size-6 lg:text-xs",
          today && "bg-primary text-primary-foreground",
          selected && !today && "bg-foreground/10",
        )}
      >
        {format(date, "d")}
      </span>

      {dayEvents.length > 0 && (
        <div className="mt-0.5 flex flex-col gap-0.5 lg:mt-1">
          <div className="flex flex-wrap items-center gap-0.5 lg:gap-1">
            {dayEvents.slice(0, 3).map((e) => (
              <EventDot key={e.id} event={e} todayIso={todayIso} />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-xs leading-none text-muted-foreground">
                +{dayEvents.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );
}

interface CalendarViewProps {
  initialAnchorIso?: string;
  initialSelectedDateIso?: string;
  initialEvents?: CalendarEvent[];
}

export function CalendarView({
  initialAnchorIso,
  initialSelectedDateIso,
  initialEvents,
}: Readonly<CalendarViewProps>) {
  const [anchor, setAnchor] = useState(() =>
    resolveCalendarDate(initialAnchorIso),
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    resolveCalendarDate(initialSelectedDateIso ?? initialAnchorIso),
  );
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents ?? []);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const initialRangeKeyRef = useRef(
    initialEvents
      ? getMonthRange(resolveCalendarDate(initialAnchorIso)).key
      : null,
  );
  const shouldReuseInitialEventsRef = useRef(initialEvents !== undefined);
  const requestIdRef = useRef(0);
  const {
    endIso: rangeEndIso,
    key: rangeKey,
    startIso: rangeStartIso,
  } = getMonthRange(anchor);

  useEffect(() => {
    if (
      shouldReuseInitialEventsRef.current &&
      initialRangeKeyRef.current === rangeKey
    ) {
      shouldReuseInitialEventsRef.current = false;
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoadingEvents(true);

    void getCalendarEvents(rangeStartIso, rangeEndIso)
      .then((data) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setEvents(buildCalendarEvents(data));
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoadingEvents(false);
        }
      });
  }, [rangeEndIso, rangeKey, rangeStartIso]);

  const todayIso = formatIsoDate(new Date());
  const dates = useMemo(() => getMonthGridDates(anchor), [anchor]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        format(addDays(startOfWeek(anchor, { weekStartsOn: 1 }), index), "EEE"),
      ),
    [anchor],
  );

  function goBack() {
    setAnchor((a) => subMonths(a, 1));
    setSelectedDate((date) => subMonths(date, 1));
  }

  function goForward() {
    setAnchor((a) => addMonths(a, 1));
    setSelectedDate((date) => addMonths(date, 1));
  }

  function goToday() {
    const today = new Date();
    setAnchor(today);
    setSelectedDate(today);
  }

  const title = format(anchor, "MMMM yyyy");

  return (
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.6fr)_22rem]">
      <div className="rounded-xl border border-border/70 bg-card/85 p-4 lg:flex lg:min-h-0 lg:flex-col">
        <div
          className="flex items-center justify-between gap-2"
          data-testid="calendar-header"
        >
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={goBack}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="min-w-40 text-center text-base font-semibold">
              {title}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={goForward}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={goToday}
          >
            Today
          </Button>
        </div>

        <div
          className="relative mt-4 min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
          data-testid="calendar-grid-region"
        >
          <div
            className={cn(
              "grid grid-cols-7 gap-px transition-opacity lg:gap-1",
              isLoadingEvents && "opacity-70",
            )}
          >
            {weekdayLabels.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[11px] font-medium text-muted-foreground lg:text-xs"
              >
                {d}
              </div>
            ))}
            {dates.map((date) => (
              <DayCell
                key={date.toISOString()}
                date={date}
                dayEvents={
                  eventsByDate.get(format(date, "yyyy-MM-dd")) ?? emptyEvents
                }
                isCurrentMonth={isSameMonth(date, anchor)}
                selected={isSameDay(date, selectedDate)}
                todayIso={todayIso}
                onSelect={setSelectedDate}
              />
            ))}
          </div>

          {isLoadingEvents ? (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-md bg-background/50"
              data-testid="calendar-grid-loading"
            >
              <Loader2
                className="size-5 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          ) : null}
        </div>
      </div>

      <DayDetail
        date={selectedDate}
        dayEvents={
          eventsByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? emptyEvents
        }
        todayIso={todayIso}
        emptyLabel="No assessments or attendance misses on this day."
        className="lg:min-h-0 lg:overflow-y-auto"
      />
    </div>
  );
}
