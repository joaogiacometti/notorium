import {
  format,
  formatDistanceToNow,
  formatDistanceToNowStrict,
} from "date-fns";

export function formatDateLong(date: Date | string): string {
  return format(new Date(date), "MMMM d, yyyy");
}

export function formatDateShort(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy, h:mm a");
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
