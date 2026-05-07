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
  ArrowRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCalendarEvents } from "@/app/actions/calendar";
import { Button } from "@/components/ui/button";
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

function getEventRowToneClass(event: CalendarEvent, todayIso: string) {
  const tone = getStatusToneClasses(getEventTone(event, todayIso));
  return `${tone.border} ${tone.bg}`;
}

function getEventStatusLabel(event: CalendarEvent, todayIso: string) {
  if (event.kind === "miss") {
    return "Miss";
  }

  if (event.meta?.status === "completed") {
    return "Done";
  }

  return event.date < todayIso ? "Overdue" : "Pending";
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

function getCalendarEventHref(event: CalendarEvent) {
  if (event.kind === "assessment") {
    const params = new URLSearchParams({
      from: "planning-assessments",
      subjectId: event.subjectId,
    });

    return `/assessments/${event.sourceId}?${params.toString()}`;
  }

  return `/subjects/${event.subjectId}`;
}

function getEventSubtitle(event: CalendarEvent) {
  const assessmentTypeLabel = getAssessmentTypeLabel(event);

  return assessmentTypeLabel
    ? `${event.subjectName} · ${assessmentTypeLabel}`
    : event.subjectName;
}

function formatEventCount(count: number) {
  if (count === 0) {
    return "No items";
  }

  return count === 1 ? "1 item" : `${count} items`;
}

function EventRow({
  event,
  todayIso,
}: Readonly<{ event: CalendarEvent; todayIso: string }>) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5",
        "transition-colors hover:bg-muted/50",
        getEventRowToneClass(event, todayIso),
      )}
    >
      <EventRowIcon event={event} />
      <EventRowText event={event} />
      <EventRowStatus event={event} todayIso={todayIso} />
    </div>
  );
}

function EventRowIcon({ event }: Readonly<{ event: CalendarEvent }>) {
  const Icon = event.kind === "assessment" ? ClipboardList : CircleAlert;

  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background/70 text-muted-foreground">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function EventRowText({ event }: Readonly<{ event: CalendarEvent }>) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-foreground">
        {event.title}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {getEventSubtitle(event)}
      </p>
    </div>
  );
}

function EventRowStatus({
  event,
  todayIso,
}: Readonly<{ event: CalendarEvent; todayIso: string }>) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
      <span>{getEventStatusLabel(event, todayIso)}</span>
      <ArrowRight className="size-3.5" aria-hidden="true" />
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
        "min-w-0 rounded-xl border border-border/70 bg-card/85",
        className,
      )}
      data-testid="calendar-day-detail"
    >
      <DayDetailHeader date={date} eventCount={dayEvents.length} />
      <DayDetailContent
        dayEvents={dayEvents}
        emptyLabel={emptyLabel}
        todayIso={todayIso}
      />
    </section>
  );
}

function DayDetailContent({
  dayEvents,
  emptyLabel,
  todayIso,
}: Readonly<{
  dayEvents: CalendarEvent[];
  emptyLabel: string;
  todayIso: string;
}>) {
  if (dayEvents.length === 0) {
    return <EmptyDayDetail emptyLabel={emptyLabel} />;
  }

  return <DayEventList dayEvents={dayEvents} todayIso={todayIso} />;
}

function DayEventList({
  dayEvents,
  todayIso,
}: Readonly<{ dayEvents: CalendarEvent[]; todayIso: string }>) {
  return (
    <div className="min-w-0 space-y-2 p-3 pt-0">
      {dayEvents.map((e) => (
        <Link
          key={e.id}
          href={getCalendarEventHref(e)}
          className="block min-w-0 w-full max-w-full transition-opacity hover:opacity-80"
        >
          <EventRow event={e} todayIso={todayIso} />
        </Link>
      ))}
    </div>
  );
}

function DayDetailHeader({
  date,
  eventCount,
}: Readonly<{ date: Date; eventCount: number }>) {
  return (
    <div className="flex items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">
          Selected day
        </p>
        <h3 className="mt-1 truncate text-base font-semibold text-foreground">
          {format(date, "EEEE, MMMM d")}
        </h3>
      </div>
      <div className="rounded-md border border-border/70 bg-background/70 px-2 py-1 text-xs font-medium text-muted-foreground">
        {formatEventCount(eventCount)}
      </div>
    </div>
  );
}

function EmptyDayDetail({ emptyLabel }: Readonly<{ emptyLabel: string }>) {
  return (
    <div className="p-3 pt-0">
      <div className="rounded-lg border border-dashed border-border/70 bg-background/50 px-3 py-5 text-center">
        <CalendarCheck
          className="mx-auto size-5 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="mt-2 text-sm font-medium text-foreground">Open day</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyLabel}</p>
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
