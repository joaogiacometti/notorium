"use client";

import { useInteractionManagerCapability } from "@embedpdf/plugin-interaction-manager/react";
import { usePan } from "@embedpdf/plugin-pan/react";
import { Hand, MousePointer2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  PAN_MODE,
  POINTER_MODE,
  type ReaderInteractionMode,
} from "@/components/library/reader-interaction-modes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReaderInteractionToolsProps {
  documentId: string;
}

// Canvas-manipulation tools (select vs. drag-to-scroll) docked to the top-left of
// the document canvas, separate from the page navigator in the top bar so each
// concern lives where users look for it — mirroring Figma/Miro/PDF viewer
// conventions. Rendered inside the EmbedPDF provider so the pan and
// interaction-manager hooks resolve. Always visible: pan defaults on touch,
// selection on desktop, but either can override here.
export function ReaderInteractionTools({
  documentId,
}: Readonly<ReaderInteractionToolsProps>) {
  const pan = usePan(documentId);
  const interaction = useInteractionManagerCapability();

  function activateMode(mode: ReaderInteractionMode) {
    interaction.provides?.forDocument(documentId).activate(mode);
  }

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-0.5 rounded-md border border-border/70 bg-background/95 p-0.5 shadow-sm backdrop-blur">
      <InteractionToolButton
        label="Select text"
        active={!pan.isPanning}
        onClick={() => activateMode(POINTER_MODE)}
      >
        <MousePointer2 className="size-4" />
      </InteractionToolButton>
      <InteractionToolButton
        label="Move"
        active={pan.isPanning}
        onClick={() => activateMode(PAN_MODE)}
      >
        <Hand className="size-4" />
      </InteractionToolButton>
    </div>
  );
}

interface InteractionToolButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function InteractionToolButton({
  label,
  active,
  onClick,
  children,
}: Readonly<InteractionToolButtonProps>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "size-8 text-muted-foreground hover:text-foreground",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </Button>
  );
}
