"use client";

import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlanningViewSwitchProps {
  currentView: "assessments" | "calendar";
  currentSubjectId?: string;
  assessmentsLabel: string;
  calendarLabel: string;
}

function buildPlanningHref(
  view: "assessments" | "calendar",
  subjectId?: string,
): string {
  const query = new URLSearchParams({ view });

  if (subjectId) {
    query.set("subject", subjectId);
  }

  return `/planning?${query.toString()}`;
}

export function PlanningViewSwitch({
  currentView,
  currentSubjectId,
  assessmentsLabel,
  calendarLabel,
}: Readonly<PlanningViewSwitchProps>) {
  return (
    <Tabs value={currentView}>
      <TabsList>
        <TabsTrigger value="assessments" asChild>
          <Link href={buildPlanningHref("assessments", currentSubjectId)}>
            {assessmentsLabel}
          </Link>
        </TabsTrigger>
        <TabsTrigger value="calendar" asChild>
          <Link href={buildPlanningHref("calendar", currentSubjectId)}>
            {calendarLabel}
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
