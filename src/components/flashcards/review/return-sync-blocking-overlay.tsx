"use client";

import { Loader2 } from "lucide-react";

interface ReturnSyncBlockingOverlayProps {
  placement?: "absolute" | "fixed";
}

/**
 * Blocks review controls while return sync reconciles queued progress.
 *
 * @example
 * <ReturnSyncBlockingOverlay placement="fixed" />
 */
export function ReturnSyncBlockingOverlay({
  placement = "absolute",
}: Readonly<ReturnSyncBlockingOverlayProps>) {
  const placementClassName =
    placement === "fixed" ? "fixed inset-0 z-120" : "absolute inset-0 z-20";

  return (
    <output
      aria-live="polite"
      aria-label="Syncing flashcards"
      className={`${placementClassName} flex items-center justify-center rounded-xl border border-border/70 bg-background/85 p-6 backdrop-blur-sm`}
      data-testid="flashcard-return-sync-blocker"
    >
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Syncing flashcards...</span>
      </div>
    </output>
  );
}
