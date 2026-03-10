"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/routing";

interface PlanningViewSwitchProps {
  currentView: "assessments" | "calendar";
  assessmentsLabel: string;
  calendarLabel: string;
}

export function PlanningViewSwitch({
  currentView,
  assessmentsLabel,
  calendarLabel,
}: Readonly<PlanningViewSwitchProps>) {
  return (
    <Tabs value={currentView}>
      <TabsList>
        <TabsTrigger value="assessments" asChild>
          <Link href="/planning?view=assessments">{assessmentsLabel}</Link>
        </TabsTrigger>
        <TabsTrigger value="calendar" asChild>
          <Link href="/planning?view=calendar">{calendarLabel}</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
