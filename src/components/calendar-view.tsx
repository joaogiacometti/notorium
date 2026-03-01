"use client";

import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
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
import { useEffect, useState, useTransition } from "react";
import { getCalendarEvents } from "@/app/actions/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { assessmentTypeLabels } from "@/lib/assessments";
import {
  buildCalendarEvents,
  type CalendarEvent,
  getMonthGridDates,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function EventDot({ kind }: Readonly<{ kind: "assessment" | "miss" }>) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 rounded-full",
        kind === "assessment" ? "bg-primary" : "bg-red-500",
      )}
    />
  );
}

function EventChip({
  event,
  compact,
}: Readonly<{ event: CalendarEvent; compact?: boolean }>) {
  const isOverdue =
    event.kind === "assessment" &&
    event.meta?.status === "pending" &&
    event.date < format(new Date(), "yyyy-MM-dd");
  const isCompleted =
    event.kind === "assessment" && event.meta?.status === "completed";

  return (
    <div
      className={cn(
        "flex items-start gap-1 rounded border px-1.5 py-1 text-[11px] leading-tight",
        event.kind === "miss"
          ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          : isOverdue
            ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
            : isCompleted
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      {event.kind === "assessment" ? (
        <ClipboardList className="mt-0.5 size-3 shrink-0" />
      ) : (
        <CircleAlert className="mt-0.5 size-3 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="truncate font-medium">{event.title}</p>
        {!compact && (
          <p className="truncate text-[10px] opacity-70">
            {event.subjectName}
            {event.kind === "assessment" && event.meta?.type
              ? ` · ${assessmentTypeLabels[event.meta.type as keyof typeof assessmentTypeLabels] ?? event.meta.type}`
              : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function DayCell({
  date,
  events,
  isCurrentMonth,
  selected,
  onSelect,
}: Readonly<{
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  selected: boolean;
  onSelect: (d: Date) => void;
}>) {
  const today = isToday(date);
  const dayEvents = events.filter((e) => e.date === format(date, "yyyy-MM-dd"));

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={cn(
        "group relative flex flex-col rounded-md border p-1 lg:p-1.5 text-left transition-colors min-h-10 lg:min-h-18",
        !isCurrentMonth && "opacity-40",
        selected
          ? "border-primary/50 bg-primary/5"
          : "border-transparent hover:border-border hover:bg-muted/30",
      )}
    >
      <span
        className={cn(
          "flex size-5 lg:size-6 items-center justify-center rounded-full text-[11px] lg:text-xs font-medium",
          today && "bg-primary text-primary-foreground",
          selected && !today && "bg-foreground/10",
        )}
      >
        {format(date, "d")}
      </span>

      {dayEvents.length > 0 && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          <div className="flex flex-wrap gap-0.5">
            {dayEvents.slice(0, 3).map((e) => (
              <EventDot key={e.id} kind={e.kind} />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-[8px] leading-none text-muted-foreground">
                +{dayEvents.length - 3}
              </span>
            )}
          </div>
          <div className="hidden lg:flex lg:flex-col lg:gap-0.5 lg:overflow-hidden">
            {dayEvents.slice(0, 2).map((e) => (
              <EventChip key={e.id} event={e} compact />
            ))}
            {dayEvents.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{dayEvents.length - 2} more
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
  events,
}: Readonly<{ date: Date; events: CalendarEvent[] }>) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayEvents = events.filter((e) => e.date === dateStr);

  if (dayEvents.length === 0) return null;

  return (
    <div className="pt-2">
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">
        {format(date, "EEEE, MMMM d, yyyy")}
      </h3>
      <div className="space-y-1.5">
        {dayEvents.map((e) => (
          <Link
            key={e.id}
            href={`/subjects/${e.subjectId}`}
            className="block transition-opacity hover:opacity-80"
          >
            <EventChip event={e} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CalendarView() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isPending, startTransition] = useTransition();

  const rangeStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });

  useEffect(() => {
    startTransition(async () => {
      const data = await getCalendarEvents(
        format(rangeStart, "yyyy-MM-dd"),
        format(rangeEnd, "yyyy-MM-dd"),
      );
      setEvents(buildCalendarEvents(data));
    });
  }, [rangeEnd, rangeStart]);

  const dates = getMonthGridDates(anchor);

  function goBack() {
    setAnchor((a) => subMonths(a, 1));
  }

  function goForward() {
    setAnchor((a) => addMonths(a, 1));
  }

  function goToday() {
    const today = new Date();
    setAnchor(today);
    setSelectedDate(today);
  }

  const title = format(anchor, "MMMM yyyy");

  return (
    <div className="space-y-2">
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

      <div className="flex flex-col gap-2">
        <div className="min-w-0">
          {isPending ? (
            <div className="grid grid-cols-7 gap-px lg:gap-1">
              {WEEKDAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[11px] lg:text-xs font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => `skel-${i}`).map((id) => (
                <Skeleton key={id} className="h-10 rounded-md lg:h-18" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px lg:gap-1">
              {WEEKDAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[11px] lg:text-xs font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {dates.map((date) => (
                <DayCell
                  key={date.toISOString()}
                  date={date}
                  events={events}
                  isCurrentMonth={isSameMonth(date, anchor)}
                  selected={isSameDay(date, selectedDate)}
                  onSelect={setSelectedDate}
                />
              ))}
            </div>
          )}
        </div>

        <DayDetail date={selectedDate} events={events} />
      </div>
    </div>
  );
}
