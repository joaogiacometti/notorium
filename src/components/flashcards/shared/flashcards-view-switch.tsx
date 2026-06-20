"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FlashcardsView } from "@/features/flashcards/view";
import { useSmoothedLoadingState } from "@/lib/react/use-smoothed-loading-state";

interface FlashcardsViewSwitchProps {
  currentView: FlashcardsView;
  manageLabel: string;
  reviewLabel: string;
  statisticsLabel: string;
  subjectId?: string;
}

function getViewHref(view: FlashcardsView, subjectId?: string) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (subjectId) {
    params.set("subjectId", subjectId);
  }
  return `/flashcards?${params.toString()}`;
}

export function FlashcardsViewSwitch({
  currentView,
  manageLabel,
  reviewLabel,
  statisticsLabel,
  subjectId,
}: Readonly<FlashcardsViewSwitchProps>) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingView, setPendingView] = useState<FlashcardsView | null>(null);
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

  function handleViewSwitch(view: FlashcardsView) {
    if (view === currentView || isPending) {
      return;
    }

    setPendingView(view);

    startTransition(() => {
      router.replace(getViewHref(view, subjectId));
    });
  }

  const loadingView = isPendingVisible ? pendingView : null;
  const tabs: Array<{ view: FlashcardsView; label: string }> = [
    { view: "review", label: reviewLabel },
    { view: "manage", label: manageLabel },
    { view: "statistics", label: statisticsLabel },
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
