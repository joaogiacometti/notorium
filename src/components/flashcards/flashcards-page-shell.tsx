import { Layers3 } from "lucide-react";
import type { ReactNode } from "react";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import type { FlashcardsView } from "@/features/flashcards/view";
import { FlashcardsViewSwitch } from "./flashcards-view-switch";

interface FlashcardsPageShellProps {
  children: ReactNode;
  currentView: FlashcardsView;
  description: string;
  headerMeta?: string;
  manageLabel: string;
  reviewLabel: string;
  title: string;
}

export function FlashcardsPageShell({
  children,
  currentView,
  description,
  headerMeta,
  manageLabel,
  reviewLabel,
  title,
}: Readonly<FlashcardsPageShellProps>) {
  return (
    <FeaturePageShell
      description={description}
      headerMeta={headerMeta}
      icon={Layers3}
      lockViewport={currentView === "review"}
      switcher={
        <FlashcardsViewSwitch
          currentView={currentView}
          manageLabel={manageLabel}
          reviewLabel={reviewLabel}
        />
      }
      title={title}
    >
      {children}
    </FeaturePageShell>
  );
}
