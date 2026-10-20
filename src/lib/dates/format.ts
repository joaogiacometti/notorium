import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
} from "date-fns";

export function formatDateLong(date: Date | string): string {
  return format(toUtcDate(date), "MMMM d, yyyy");
}

/**
 * Absolute date plus a relative qualifier, e.g. "May 1, 2026 (in 5 days)" or
 * "Apr 20, 2026 (3 days ago)". Past and future are distinguished by date-fns'
 * suffix, and "today"/"yesterday"/"tomorrow" are spelled out. Returns
 * `emptyLabel` when there is no date.
 *
 * @example
 * formatDateWithRelative("2026-05-01", "No due date");
 */
export function formatDateWithRelative(
  date: Date | string | null,
  emptyLabel: string,
): string {
  if (!date) {
    return emptyLabel;
  }
  const target = toUtcDate(date);
  const formatted = format(target, "MMM d, yyyy");
  const dayDiff = differenceInCalendarDays(target, new Date());
  if (dayDiff === 0) {
    return `${formatted} (today)`;
  }
  if (dayDiff === -1) {
    return `${formatted} (yesterday)`;
  }
  if (dayDiff === 1) {
    return `${formatted} (tomorrow)`;
  }
  return `${formatted} (${formatDistanceToNow(target, { addSuffix: true })})`;
}

export function toUtcDate(date: Date | string): Date {
  if (typeof date === "string" && date.length === 10) {
    return new Date(`${date}T12:00:00Z`);
  }

  return new Date(date);
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
