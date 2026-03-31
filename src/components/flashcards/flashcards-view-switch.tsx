"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FlashcardsView } from "@/features/flashcards/view";
import { Link } from "@/i18n/routing";

interface FlashcardsViewSwitchProps {
  currentView: FlashcardsView;
  manageLabel: string;
  reviewLabel: string;
}

function getViewHref(view: FlashcardsView) {
  return `/flashcards?view=${view}`;
}

export function FlashcardsViewSwitch({
  currentView,
  manageLabel,
  reviewLabel,
}: Readonly<FlashcardsViewSwitchProps>) {
  return (
    <Tabs value={currentView}>
      <TabsList>
        <TabsTrigger value="review" asChild>
          <Link href={getViewHref("review")}>{reviewLabel}</Link>
        </TabsTrigger>
        <TabsTrigger value="manage" asChild>
          <Link href={getViewHref("manage")}>{manageLabel}</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
