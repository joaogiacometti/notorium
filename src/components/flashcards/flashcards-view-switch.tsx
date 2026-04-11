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
  subjectId?: string;
  deckId?: string;
}

function getViewHref(
  view: FlashcardsView,
  subjectId?: string,
  deckId?: string,
) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (subjectId) {
    params.set("subjectId", subjectId);
  }
  if (deckId) {
    params.set("deckId", deckId);
  }
  return `/flashcards?${params.toString()}`;
}

export function FlashcardsViewSwitch({
  currentView,
  manageLabel,
  reviewLabel,
  subjectId,
  deckId,
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
      router.replace(getViewHref(view, subjectId, deckId));
    });
  }

  const loadingView = isPendingVisible ? pendingView : null;

  return (
    <Tabs value={currentView}>
      <TabsList>
        <TabsTrigger
          value="review"
          disabled={isPending}
          onClick={() => handleViewSwitch("review")}
        >
          {loadingView === "review" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          <span className={loadingView === "review" ? "opacity-90" : undefined}>
            {reviewLabel}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="manage"
          disabled={isPending}
          onClick={() => handleViewSwitch("manage")}
        >
          {loadingView === "manage" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          <span className={loadingView === "manage" ? "opacity-90" : undefined}>
            {manageLabel}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
