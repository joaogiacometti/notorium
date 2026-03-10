"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FlashcardsView } from "@/features/flashcards/view";
import { Link } from "@/i18n/routing";

interface FlashcardsViewSwitchProps {
  currentView: FlashcardsView;
  manageLabel: string;
  reviewLabel: string;
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
  subjectId,
}: Readonly<FlashcardsViewSwitchProps>) {
  return (
    <Tabs value={currentView}>
      <TabsList>
        <TabsTrigger value="review" asChild>
          <Link href={getViewHref("review", subjectId)}>{reviewLabel}</Link>
        </TabsTrigger>
        <TabsTrigger value="manage" asChild>
          <Link href={getViewHref("manage", subjectId)}>{manageLabel}</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
