import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PlanningAssessmentsPanel } from "@/components/planning/planning-assessments-panel";
import { PlanningCalendarPanel } from "@/components/planning/planning-calendar-panel";
import { PlanningViewSwitch } from "@/components/planning/planning-view-switch";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { resolvePlanningView } from "@/features/planning/view";
import { requireSession } from "@/lib/auth/auth";

interface PlanningPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function PlanningPage({
  searchParams,
}: Readonly<PlanningPageProps>) {
  const session = await requireSession();
  const t = await getTranslations("PlanningPage");
  const { view } = await searchParams;
  const currentView = resolvePlanningView(view);

  return (
    <main>
      <AppPageContainer>
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <PlanningViewSwitch
            currentView={currentView}
            assessmentsLabel={t("assessments")}
            calendarLabel={t("calendar")}
          />
        </div>

        {currentView === "assessments" ? (
          <PlanningAssessmentsPanel userId={session.user.id} />
        ) : (
          <PlanningCalendarPanel />
        )}
      </AppPageContainer>
    </main>
  );
}
