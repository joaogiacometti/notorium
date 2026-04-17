import { CalendarView } from "@/components/shared/calendar-view";
import { getPlanningCalendarDataForUser } from "@/features/planning/queries";
import { buildCalendarEvents, getMonthRange } from "@/lib/dates/calendar";
import { formatIsoDate } from "@/lib/dates/format";

interface PlanningCalendarPanelProps {
  userId: string;
}

export async function PlanningCalendarPanel({
  userId,
}: Readonly<PlanningCalendarPanelProps>) {
  const today = new Date();
  const monthRange = getMonthRange(today);
  const initialData = await getPlanningCalendarDataForUser(
    userId,
    monthRange.startIso,
    monthRange.endIso,
  );

  return (
    <CalendarView
      initialAnchorIso={formatIsoDate(today)}
      initialSelectedDateIso={formatIsoDate(today)}
      initialEvents={buildCalendarEvents(initialData)}
    />
  );
}
