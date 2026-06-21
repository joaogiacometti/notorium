"use client";

import { useSearchParams } from "next/navigation";
import { FlashcardsHubLoadingContent } from "@/components/flashcards/shared/flashcards-hub-loading-content";
import { FlashcardsViewSwitch } from "@/components/flashcards/shared/flashcards-view-switch";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { resolveFlashcardsView } from "@/features/flashcards/view";

export default function FlashcardsLoading() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const subjectId = searchParams.get("subjectId") ?? undefined;

  return (
    <FeaturePageShell
      title="Flashcards"
      icon="layers-3"
      switcher={
        <FlashcardsViewSwitch
          currentView={resolveFlashcardsView(view ?? undefined)}
          manageLabel="Manage"
          reviewLabel="Review"
          subjectId={subjectId}
        />
      }
    >
      <FlashcardsHubLoadingContent view={view} />
    </FeaturePageShell>
  );
}
