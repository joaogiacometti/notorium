/**
 * Maps a 24-hour clock hour to a time-of-day greeting for the home dashboard.
 *
 * @example
 * greetingForHour(9); // "Good morning"
 */
export function greetingForHour(hour: number): string {
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}
