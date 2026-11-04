"use client";

import { FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shows that `/bypass` turned learning support off for this chat, so it stays
 * a visible choice that is one click from being undone.
 *
 * @example
 * <AssistantBypassIndicator onTurnOn={() => setBypassLearning(false)} />
 */
export function AssistantBypassIndicator({
  onTurnOn,
}: Readonly<{ onTurnOn: () => void }>) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b bg-primary/10 px-4 py-1.5 text-xs"
    >
      <FastForward className="size-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 truncate font-medium">
        Learning support off
      </p>
      <Button type="button" variant="ghost" size="xs" onClick={onTurnOn}>
        Turn on
      </Button>
    </div>
  );
}
