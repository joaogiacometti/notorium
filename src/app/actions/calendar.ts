"use server";

import {
  getPlanningCalendarDataForUser,
  type PlanningCalendarData,
} from "@/features/planning/queries";
import { calendarEventsRangeSchema } from "@/features/planning/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";

export async function getCalendarEvents(
  rangeStart: string,
  rangeEnd: string,
): Promise<PlanningCalendarData> {
  const range = calendarEventsRangeSchema.parse({ rangeStart, rangeEnd });
  const userId = await getAuthenticatedUserId();
  return getPlanningCalendarDataForUser(
    userId,
    range.rangeStart,
    range.rangeEnd,
  );
}
