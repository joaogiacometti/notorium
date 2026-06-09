"use client";

import { Hand, MousePointer2 } from "lucide-react";
import type { MindmapMode } from "@/lib/mindmap/use-mindmap-mode-keys";
import { cn } from "@/lib/utils";

interface MindmapModeToolbarProps {
  mode: MindmapMode;
  onModeChange: (mode: MindmapMode) => void;
}

interface ModeButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ModeButton({ active, label, onClick, children }: ModeButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border border-(--border) transition-colors",
        active
          ? "bg-(--primary) text-(--primary-foreground)"
          : "bg-(--card) text-(--foreground) hover:bg-(--muted)",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Floating tool switcher for the mindmap canvas: select (marquee) vs hand (pan).
 *
 * @example
 * <MindmapModeToolbar mode={mode} onModeChange={setMode} />
 */
export function MindmapModeToolbar({
  mode,
  onModeChange,
}: Readonly<MindmapModeToolbarProps>) {
  return (
    <div className="flex gap-1 rounded-lg border border-(--border) bg-(--card) p-1 shadow-sm">
      <ModeButton
        active={mode === "select"}
        label="Select (V)"
        onClick={() => onModeChange("select")}
      >
        <MousePointer2 className="size-4" />
      </ModeButton>
      <ModeButton
        active={mode === "hand"}
        label="Hand (H / Space)"
        onClick={() => onModeChange("hand")}
      >
        <Hand className="size-4" />
      </ModeButton>
    </div>
  );
}
