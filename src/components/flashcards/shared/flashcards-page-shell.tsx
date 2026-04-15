import { Layers3 } from "lucide-react";
import type { ReactNode } from "react";
import { FlashcardsViewSwitch } from "@/components/flashcards/shared/flashcards-view-switch";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import type { FlashcardsView } from "@/features/flashcards/view";

interface FlashcardsPageShellProps {
  children: ReactNode;
  currentView: FlashcardsView;
  description: string;
  headerMeta?: string;
  manageLabel: string;
  reviewLabel: string;
  statisticsLabel: string;
  title: string;
  deckId?: string;
}

export function FlashcardsPageShell({
  children,
  currentView,
  description,
  headerMeta,
  manageLabel,
  reviewLabel,
  statisticsLabel,
  title,
  deckId,
}: Readonly<FlashcardsPageShellProps>) {
  return (
    <FeaturePageShell
      description={description}
      headerMeta={headerMeta}
      icon={Layers3}
      switcher={
        <FlashcardsViewSwitch
          currentView={currentView}
          manageLabel={manageLabel}
          reviewLabel={reviewLabel}
          statisticsLabel={statisticsLabel}
          deckId={deckId}
        />
      }
      title={title}
    >
      {children}
    </FeaturePageShell>
  );
}
