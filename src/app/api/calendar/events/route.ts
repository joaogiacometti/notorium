import { getPlanningCalendarDataForUser } from "@/features/planning/queries";
import { calendarEventsRangeSchema } from "@/features/planning/validation";
import { readSearchParams, runUserReadRoute } from "@/lib/server/read-route";

/** Assessments and attendance misses inside `rangeStart..rangeEnd`. */
export async function GET(request: Request): Promise<Response> {
  return runUserReadRoute({
    logScope: "calendar.events",
    schema: calendarEventsRangeSchema,
    input: readSearchParams(request.url),
    read: (user, range) =>
      getPlanningCalendarDataForUser(user.id, range.rangeStart, range.rangeEnd),
  });
}
