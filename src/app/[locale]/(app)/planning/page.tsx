import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PlanningAssessmentsPanel } from "@/components/planning/planning-assessments-panel";
import { PlanningCalendarPanel } from "@/components/planning/planning-calendar-panel";
import { PlanningViewSwitch } from "@/components/planning/planning-view-switch";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { resolvePlanningView } from "@/features/planning/view";
import { requireSession } from "@/lib/auth/auth";

interface PlanningPageProps {
  searchParams: Promise<{ subject?: string; view?: string }>;
}

export default async function PlanningPage({
  searchParams,
}: Readonly<PlanningPageProps>) {
  const session = await requireSession();
  const t = await getTranslations("PlanningPage");
  const { subject, view } = await searchParams;
  const currentView = resolvePlanningView(view);

  return (
    <FeaturePageShell
      description={t("description")}
      icon={CalendarDays}
      switcher={
        <PlanningViewSwitch
          currentView={currentView}
          currentSubjectId={subject}
          assessmentsLabel={t("assessments")}
          calendarLabel={t("calendar")}
        />
      }
      title={t("title")}
    >
      {currentView === "assessments" ? (
        <PlanningAssessmentsPanel
          userId={session.user.id}
          initialSubjectId={subject}
        />
      ) : (
        <PlanningCalendarPanel />
      )}
    </FeaturePageShell>
  );
}
