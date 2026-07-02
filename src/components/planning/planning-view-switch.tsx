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
  const tabs: Array<{ view: PlanningView; label: string }> = [
    { view: "assessments", label: assessmentsLabel },
    { view: "calendar", label: calendarLabel },
  ];

  return (
    <Tabs value={currentView}>
      <TabsList>
        {tabs.map(({ view, label }) => (
          <TabsTrigger
            key={view}
            value={view}
            disabled={isPending}
            onClick={() => handleViewSwitch(view)}
          >
            {loadingView === view ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            <span className={loadingView === view ? "opacity-90" : undefined}>
              {label}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
