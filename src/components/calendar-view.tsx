"use client";

import {
  addDays,
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
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { getCalendarEvents } from "@/app/actions/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { assessmentTypeLabels } from "@/lib/assessments";
import {
  buildCalendarEvents,
  type CalendarEvent,
  getMonthGridDates,
} from "@/lib/calendar";
import { getDateFnsLocale } from "@/lib/date-locale";
import { cn } from "@/lib/utils";

type EventTone = "amber" | "emerald" | "red";

function getEventTone(event: CalendarEvent, todayIso: string): EventTone {
  if (event.kind === "miss") {
    return "red";
  }

  const status = event.meta?.status;
  if (status === "pending" && event.date < todayIso) {
    return "red";
  }

  if (status === "completed") {
    return "emerald";
  }

  return "amber";
}

function EventDot({ event }: Readonly<{ event: CalendarEvent }>) {
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const tone = getEventTone(event, todayIso);

  const toneClass =
    tone === "red"
      ? "bg-red-500"
      : tone === "emerald"
        ? "bg-emerald-500"
        : "bg-amber-500";

  return <span className={cn("inline-block size-2 rounded-full", toneClass)} />;
}

function getEventChipToneClass(event: CalendarEvent, todayIso: string) {
  const tone = getEventTone(event, todayIso);

  if (tone === "red") {
    return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
  }

  if (tone === "emerald") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
}

function getAssessmentTypeLabel(
  event: CalendarEvent,
  tAssessment: ReturnType<typeof useTranslations>,
) {
  if (event.kind !== "assessment" || !event.meta?.type) {
    return null;
  }

  const key = `type_${event.meta.type}`;
  if (tAssessment.has(key)) {
    return tAssessment(key);
  }

  return (
    assessmentTypeLabels[
      event.meta.type as keyof typeof assessmentTypeLabels
    ] ?? event.meta.type
  );
}

function EventChip({
  event,
  compact,
}: Readonly<{ event: CalendarEvent; compact?: boolean }>) {
  const tAssessment = useTranslations("AssessmentItemCard");
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const chipToneClass = getEventChipToneClass(event, todayIso);
  const assessmentTypeLabel = getAssessmentTypeLabel(event, tAssessment);
  const subtitle = assessmentTypeLabel
    ? `${event.subjectName} · ${assessmentTypeLabel}`
    : event.subjectName;

  return (
    <div
      className={cn(
        "flex items-start rounded border leading-tight",
        compact ? "gap-1.5 px-2 py-1.5 text-xs" : "gap-2 px-3 py-2.5 text-base",
        chipToneClass,
      )}
    >
      {event.kind === "assessment" ? (
        <ClipboardList
          className={cn("mt-0.5 shrink-0", compact ? "size-3.5" : "size-4")}
        />
      ) : (
        <CircleAlert
          className={cn("mt-0.5 shrink-0", compact ? "size-3.5" : "size-4")}
        />
      )}
      <div className="min-w-0">
        <p className="truncate font-medium">{event.title}</p>
        {!compact && <p className="truncate text-sm opacity-70">{subtitle}</p>}
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
  moreLabel,
}: Readonly<{
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  selected: boolean;
  onSelect: (d: Date) => void;
  moreLabel: string;
}>) {
  const today = isToday(date);
  const dayEvents = events.filter((e) => e.date === format(date, "yyyy-MM-dd"));

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={cn(
        "group relative flex min-h-12 flex-col rounded-md border p-1.5 text-left transition-colors lg:min-h-20",
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
        <div className="mt-1 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1 lg:hidden">
            {dayEvents.slice(0, 3).map((e) => (
              <EventDot key={e.id} event={e} />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-[10px] leading-none text-muted-foreground">
                +{dayEvents.length - 3}
              </span>
            )}
          </div>
          <div className="hidden lg:flex lg:flex-col lg:gap-1 lg:overflow-hidden">
            {dayEvents.slice(0, 2).map((e) => (
              <EventChip key={e.id} event={e} compact />
            ))}
            {dayEvents.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{dayEvents.length - 2} {moreLabel}
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
  dateLocale,
}: Readonly<{
  date: Date;
  events: CalendarEvent[];
  dateLocale: ReturnType<typeof getDateFnsLocale>;
}>) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayEvents = events.filter((e) => e.date === dateStr);

  if (dayEvents.length === 0) return null;

  return (
    <div className="pt-2">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        {format(date, "EEEE, MMMM d, yyyy", { locale: dateLocale })}
      </h3>
      <div className="space-y-2">
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
  const locale = useLocale();
  const t = useTranslations("CalendarView");
  const dateLocale = getDateFnsLocale(locale);
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
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    format(addDays(startOfWeek(anchor, { weekStartsOn: 1 }), index), "EEE", {
      locale: dateLocale,
    }),
  );

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

  const title = format(anchor, "MMMM yyyy", { locale: dateLocale });

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
          {t("today")}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="min-w-0">
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
                <Skeleton key={id} className="h-12 rounded-md lg:h-20" />
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
                  events={events}
                  isCurrentMonth={isSameMonth(date, anchor)}
                  selected={isSameDay(date, selectedDate)}
                  onSelect={setSelectedDate}
                  moreLabel={t("more")}
                />
              ))}
            </div>
          )}
        </div>

        <DayDetail
          date={selectedDate}
          events={events}
          dateLocale={dateLocale}
        />
      </div>
    </div>
  );
}
