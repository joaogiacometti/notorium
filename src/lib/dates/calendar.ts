import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
} from "@/lib/server/api-contracts";

export type CalendarEventKind = "assessment" | "miss";

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  subjectName: string;
  subjectId: string;
  kind: CalendarEventKind;
  meta?: {
    type?: string;
    status?: string;
  };
}

export interface CalendarSourceData {
  assessments: (AssessmentEntity & { subjectName: string })[];
  misses: (AttendanceMissEntity & { subjectName: string })[];
}

export function buildCalendarEvents(data: CalendarSourceData): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const a of data.assessments) {
    if (a.dueDate) {
      events.push({
        id: `a-${a.id}`,
        date: a.dueDate,
        title: a.title,
        subjectName: a.subjectName,
        subjectId: a.subjectId,
        kind: "assessment",
        meta: { type: a.type, status: a.status },
      });
    }
  }

  for (const m of data.misses) {
    events.push({
      id: `m-${m.id}`,
      date: m.missDate,
      title: "Missed class",
      subjectName: m.subjectName,
      subjectId: m.subjectId,
      kind: "miss",
    });
  }

  return events;
}

export function getMonthGridDates(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const dates: Date[] = [];
  let current = start;
  while (current <= end) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export function resolveCalendarDate(dateIso?: string): Date {
  if (!dateIso) {
    return new Date();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    const [year, month, day] = dateIso.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(dateIso);
}

export function getMonthRange(anchor: Date) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const startIso = format(start, "yyyy-MM-dd");
  const endIso = format(end, "yyyy-MM-dd");

  return {
    end,
    endIso,
    key: `${startIso}:${endIso}`,
    start,
    startIso,
  };
}

export function getWeekDates(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function filterEventsByDate(
  events: CalendarEvent[],
  dateIso: string,
): CalendarEvent[] {
  return events.filter((e) => e.date === dateIso);
}
