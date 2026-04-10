"use client";

import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FlashcardsView } from "@/features/flashcards/view";

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
  return (
    <Tabs value={currentView}>
      <TabsList>
        <TabsTrigger value="review" asChild>
          <Link href={getViewHref("review", subjectId, deckId)}>
            {reviewLabel}
          </Link>
        </TabsTrigger>
        <TabsTrigger value="manage" asChild>
          <Link href={getViewHref("manage", subjectId, deckId)}>
            {manageLabel}
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
