import {
  addDays,
  format,
  formatDistanceToNow,
  formatDistanceToNowStrict,
} from "date-fns";

export function formatDateLong(date: Date | string): string {
  return format(toUtcDate(date), "MMMM d, yyyy");
}

export function toUtcDate(date: Date | string): Date {
  if (typeof date === "string" && date.length === 10) {
    return new Date(`${date}T12:00:00Z`);
  }

  return new Date(date);
}

export function formatDateShort(date: Date | string): string {
  if (typeof date === "string" && date.length === 10) {
    return format(toUtcDate(date), "MMM d, yyyy");
  }

  return format(toUtcDate(date), "MMM d, yyyy, h:mm a");
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatRelativeTimeStrict(date: Date | string): string {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: false });
}

export function formatIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getTodayIso(now = new Date()): string {
  return formatIsoDate(now);
}

export interface DueDateBounds {
  todayIso: string;
  next7DaysIso: string;
  next30DaysIso: string;
}

export function getDueDateBounds(now = new Date()): DueDateBounds {
  const todayIso = formatIsoDate(now);

  return {
    todayIso,
    next7DaysIso: formatIsoDate(addDays(now, 7)),
    next30DaysIso: formatIsoDate(addDays(now, 30)),
  };
}
