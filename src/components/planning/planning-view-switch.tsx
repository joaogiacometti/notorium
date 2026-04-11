"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PlanningView } from "@/features/planning/view";
import { useSmoothedLoadingState } from "@/lib/react/use-smoothed-loading-state";

interface PlanningViewSwitchProps {
  currentView: PlanningView;
  currentSubjectId?: string;
  assessmentsLabel: string;
  calendarLabel: string;
}

function buildPlanningHref(view: PlanningView, subjectId?: string): string {
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
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingView, setPendingView] = useState<PlanningView | null>(null);
  const isPending = pendingView !== null;
  const isPendingVisible = useSmoothedLoadingState(isPending, {
    delayMs: 0,
    minimumVisibleMs: 180,
  });

  useEffect(() => {
    if (pendingView === currentView) {
      setPendingView(null);
    }
  }, [currentView, pendingView]);

  function handleViewSwitch(view: PlanningView) {
    if (view === currentView || isPending) {
      return;
    }

    setPendingView(view);

    startTransition(() => {
      router.replace(buildPlanningHref(view, currentSubjectId));
    });
  }

  const loadingView = isPendingVisible ? pendingView : null;

  return (
    <Tabs value={currentView}>
      <TabsList>
        <TabsTrigger
          value="assessments"
          disabled={isPending}
          onClick={() => handleViewSwitch("assessments")}
        >
          {loadingView === "assessments" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          <span
            className={loadingView === "assessments" ? "opacity-90" : undefined}
          >
            {assessmentsLabel}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="calendar"
          disabled={isPending}
          onClick={() => handleViewSwitch("calendar")}
        >
          {loadingView === "calendar" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          <span
            className={loadingView === "calendar" ? "opacity-90" : undefined}
          >
            {calendarLabel}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
