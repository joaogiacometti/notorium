"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ZenModeToggleProps {
  isZenMode: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Icon button that enters or leaves the distraction-free zen mode on note and
 * mindmap detail pages.
 *
 * @example
 * <ZenModeToggle isZenMode={isZenMode} onToggle={toggleZenMode} />
 */
export function ZenModeToggle({
  isZenMode,
  onToggle,
  className,
}: Readonly<ZenModeToggleProps>) {
  const label = isZenMode ? "Exit zen mode" : "Enter zen mode";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      aria-label={label}
      aria-pressed={isZenMode}
      title={isZenMode ? "Exit zen mode (Esc)" : "Zen mode"}
      onClick={onToggle}
    >
      {isZenMode ? (
        <Minimize2 className="size-4" />
      ) : (
        <Maximize2 className="size-4" />
      )}
    </Button>
  );
}
