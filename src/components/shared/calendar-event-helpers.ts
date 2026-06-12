import { assessmentTypeLabels } from "@/features/assessments/assessments";
import type { CalendarEvent } from "@/lib/dates/calendar";
import { getStatusToneClasses, type StatusTone } from "@/lib/ui/status-tones";

export type EventTone = StatusTone;

export function getEventTone(
  event: CalendarEvent,
  todayIso: string,
): EventTone {
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

export function getEventRowToneClass(
  event: CalendarEvent,
  todayIso: string,
): string {
  const tone = getStatusToneClasses(getEventTone(event, todayIso));
  return `${tone.border} ${tone.bg}`;
}

export function getEventStatusLabel(
  event: CalendarEvent,
  todayIso: string,
): string {
  if (event.kind === "miss") {
    return "Miss";
  }

  if (event.meta?.status === "completed") {
    return "Done";
  }

  return event.date < todayIso ? "Overdue" : "Pending";
}

function getAssessmentTypeLabel(event: CalendarEvent): string | null {
  if (event.kind !== "assessment" || !event.meta?.type) {
    return null;
  }

  return (
    assessmentTypeLabels[
      event.meta.type as keyof typeof assessmentTypeLabels
    ] ?? event.meta.type
  );
}

export function getCalendarEventHref(event: CalendarEvent): string {
  if (event.kind === "assessment") {
    const params = new URLSearchParams({
      from: "planning-assessments",
      subjectId: event.subjectId,
    });

    return `/assessments/${event.sourceId}?${params.toString()}`;
  }

  return `/subjects/${event.subjectId}`;
}

export function getEventSubtitle(event: CalendarEvent): string {
  const assessmentTypeLabel = getAssessmentTypeLabel(event);

  return assessmentTypeLabel
    ? `${event.subjectName} · ${assessmentTypeLabel}`
    : event.subjectName;
}

export function formatEventCount(count: number): string {
  if (count === 0) {
    return "No items";
  }

  return count === 1 ? "1 item" : `${count} items`;
}
