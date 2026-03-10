"use server";

import {
  getPlanningCalendarDataForUser,
  type PlanningCalendarData,
} from "@/features/planning/queries";
import { getAuthenticatedUserId } from "@/lib/auth/auth";

export async function getCalendarEvents(
  rangeStart: string,
  rangeEnd: string,
): Promise<PlanningCalendarData> {
  const userId = await getAuthenticatedUserId();
  return getPlanningCalendarDataForUser(userId, rangeStart, rangeEnd);
}
