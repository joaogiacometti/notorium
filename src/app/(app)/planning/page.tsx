import { CalendarDays } from "lucide-react";
import { PlanningAssessmentsPanel } from "@/components/planning/planning-assessments-panel";
import { PlanningCalendarPanel } from "@/components/planning/planning-calendar-panel";
import { PlanningViewSwitch } from "@/components/planning/planning-view-switch";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { resolvePlanningView } from "@/features/planning/view";
import { requireSession } from "@/lib/auth/auth";

interface PlanningPageProps {
  searchParams: Promise<{
    subject?: string;
    view?: string;
    search?: string;
    status?: string;
    type?: string;
    sort?: string;
  }>;
}

export default async function PlanningPage({
  searchParams,
}: Readonly<PlanningPageProps>) {
  const session = await requireSession();
  const { subject, view, search, status, type, sort } = await searchParams;
  const currentView = resolvePlanningView(view);

  return (
    <FeaturePageShell
      description="Switch between assessment management and your calendar timeline."
      icon={CalendarDays}
      switcher={
        <PlanningViewSwitch
          currentView={currentView}
          currentSubjectId={subject}
          assessmentsLabel="Assessments"
          calendarLabel="Calendar"
        />
      }
      title="Planning"
    >
      {currentView === "assessments" ? (
        <PlanningAssessmentsPanel
          userId={session.user.id}
          initialSubjectId={subject}
          initialSearch={search}
          initialStatus={status}
          initialType={type}
          initialSort={sort}
        />
      ) : (
        <PlanningCalendarPanel userId={session.user.id} />
      )}
    </FeaturePageShell>
  );
}
