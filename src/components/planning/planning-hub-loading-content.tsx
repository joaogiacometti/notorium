import { resolvePlanningView } from "@/features/planning/view";
import { PlanningAssessmentsLoading } from "./planning-assessments-loading";
import { PlanningCalendarLoading } from "./planning-calendar-loading";

interface PlanningHubLoadingContentProps {
  view?: string | null;
}

export function PlanningHubLoadingContent({
  view,
}: Readonly<PlanningHubLoadingContentProps>) {
  const currentView = resolvePlanningView(view ?? undefined);

  if (currentView === "calendar") {
    return <PlanningCalendarLoading />;
  }

  return <PlanningAssessmentsLoading />;
}
