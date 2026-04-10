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
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { getCalendarEvents } from "@/app/actions/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { assessmentTypeLabels } from "@/features/assessments/assessments";
import {
  buildCalendarEvents,
  type CalendarEvent,
  getMonthGridDates,
  getMonthRange,
  groupEventsByDate,
  resolveCalendarDate,
} from "@/lib/dates/calendar";
import { formatIsoDate } from "@/lib/dates/format";
import { getStatusToneClasses, type StatusTone } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

type EventTone = StatusTone;

function getEventTone(event: CalendarEvent, todayIso: string): EventTone {
  if (event.kind === "miss") {
    return "danger";
  }

  const status = event.meta?.status;
  if (status === "pending" && event.date < todayIso) {
    return "danger";
  }

  if (status === "completed") {
    return "success";
  }

  return "warning";
}

function EventDot({
  event,
  todayIso,
}: Readonly<{ event: CalendarEvent; todayIso: string }>) {
  const tone = getEventTone(event, todayIso);
  const toneClass = getStatusToneClasses(tone).fill;

  return <span className={cn("inline-block size-2 rounded-full", toneClass)} />;
}

function getEventChipToneClass(event: CalendarEvent, todayIso: string) {
  const tone = getStatusToneClasses(getEventTone(event, todayIso));
  return `${tone.border} ${tone.bg} ${tone.text}`;
}

function getAssessmentTypeLabel(event: CalendarEvent) {
  if (event.kind !== "assessment" || !event.meta?.type) {
    return null;
  }

  return (
    assessmentTypeLabels[
      event.meta.type as keyof typeof assessmentTypeLabels
    ] ?? event.meta.type
  );
}

function EventChip({
  event,
  todayIso,
}: Readonly<{ event: CalendarEvent; todayIso: string }>) {
  const chipToneClass = getEventChipToneClass(event, todayIso);
  const assessmentTypeLabel = getAssessmentTypeLabel(event);
  const subtitle = assessmentTypeLabel
    ? `${event.subjectName} · ${assessmentTypeLabel}`
    : event.subjectName;

  return (
    <div
      className={cn(
        "flex min-w-0 w-full max-w-full items-start rounded border leading-tight",
        "gap-1.5 px-2.5 py-2 text-sm sm:gap-2 sm:px-3 sm:py-2.5 sm:text-base",
        chipToneClass,
      )}
    >
      {event.kind === "assessment" ? (
        <ClipboardList className="mt-0.5 size-3.5 shrink-0 sm:size-4" />
      ) : (
        <CircleAlert className="mt-0.5 size-3.5 shrink-0 sm:size-4" />
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium sm:text-base">
          {event.title}
        </p>
        <p className="truncate text-xs opacity-70 sm:text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

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
              <span className="text-[10px] leading-none text-muted-foreground">
                +{dayEvents.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );
}

function DayDetail({
  date,
  dayEvents,
  todayIso,
  emptyLabel,
  className,
}: Readonly<{
  date: Date;
  dayEvents: CalendarEvent[];
  todayIso: string;
  emptyLabel: string;
  className?: string;
}>) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-border/70 bg-card/85 p-4",
        className,
      )}
    >
      <h3 className="text-sm font-medium text-muted-foreground">
        {format(date, "EEEE, MMMM d, yyyy")}
      </h3>
      {dayEvents.length > 0 ? (
        <div className="mt-4 min-w-0 space-y-2">
          {dayEvents.map((e) => (
            <Link
              key={e.id}
              href={`/subjects/${e.subjectId}`}
              className="block min-w-0 w-full max-w-full transition-opacity hover:opacity-80"
            >
              <EventChip event={e} todayIso={todayIso} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-background/40 px-3 py-4 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </section>
  );
}

function DayDetailSkeleton() {
  return (
    <div className="rounded-xl border border-border/70 bg-card/85 p-4 lg:min-h-0 lg:overflow-y-auto">
      <Skeleton className="h-5 w-40" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={`calendar-detail-skeleton-${index + 1}`}
            className="h-16 rounded-lg"
          />
        ))}
      </div>
    </div>
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
  const [isPending, startTransition] = useTransition();
  const initialRangeKeyRef = useRef(
    initialEvents
      ? getMonthRange(resolveCalendarDate(initialAnchorIso)).key
      : null,
  );
  const shouldReuseInitialEventsRef = useRef(initialEvents !== undefined);
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

    startTransition(async () => {
      const data = await getCalendarEvents(rangeStartIso, rangeEndIso);
      setEvents(buildCalendarEvents(data));
    });
  }, [rangeEndIso, rangeKey, rangeStartIso]);

  const todayIso = formatIsoDate(new Date());
  const dates = getMonthGridDates(anchor);
  const eventsByDate = groupEventsByDate(events);
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    format(addDays(startOfWeek(anchor, { weekStartsOn: 1 }), index), "EEE"),
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
        <div className="flex items-center justify-between gap-2">
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

        <div className="mt-4 min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {isPending ? (
            <div className="grid grid-cols-7 gap-px lg:gap-1">
              {weekdayLabels.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[11px] font-medium text-muted-foreground lg:text-xs"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => `skel-${i}`).map((id) => (
                <Skeleton key={id} className="h-10 rounded-md lg:h-16" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px lg:gap-1">
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
          )}
        </div>
      </div>

      {isPending ? (
        <DayDetailSkeleton />
      ) : (
        <DayDetail
          date={selectedDate}
          dayEvents={
            eventsByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? emptyEvents
          }
          todayIso={todayIso}
          emptyLabel="No assessments or attendance misses on this day."
          className="lg:min-h-0 lg:overflow-y-auto"
        />
      )}
    </div>
  );
}
