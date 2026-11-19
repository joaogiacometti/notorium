import { formatDistanceToNow } from "date-fns";

/** The local calendar day containing this instant, as YYYY-MM-DD. */
export function calendarDay(date: Date, timeZone: string): string {
  // en-CA formats dates as ISO YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

export function formatDateLong(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone,
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
