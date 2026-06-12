"use client";

import { format } from "date-fns";
import {
  ArrowRight,
  CalendarCheck,
  CircleAlert,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import {
  formatEventCount,
  getCalendarEventHref,
  getEventRowToneClass,
  getEventStatusLabel,
  getEventSubtitle,
  getEventTone,
} from "@/components/shared/calendar-event-helpers";
import type { CalendarEvent } from "@/lib/dates/calendar";
import { getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

export function EventDot({
  event,
  todayIso,
}: Readonly<{ event: CalendarEvent; todayIso: string }>) {
  const tone = getEventTone(event, todayIso);
  const toneClass = getStatusToneClasses(tone).fill;

  return <span className={cn("inline-block size-2 rounded-full", toneClass)} />;
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

export function DayDetail({
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
