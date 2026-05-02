"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SyncIndicatorStatus } from "@/lib/sync-status";
import { cn } from "@/lib/utils";

interface SyncStatusDotProps {
  status: SyncIndicatorStatus;
  pendingCount?: number;
  className?: string;
}

interface SyncStatusDotView {
  label: string;
  className: string;
}

/**
 * Shows a subtle tooltip-backed sync state indicator.
 *
 * @example
 * <SyncStatusDot status="ready" />
 */
export function SyncStatusDot({
  status,
  pendingCount = 0,
  className,
}: Readonly<SyncStatusDotProps>) {
  const view = getSyncStatusDotView(status, pendingCount);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label={view.label}
            className={cn(
              "inline-flex size-3 cursor-default items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              className,
            )}
            type="button"
          >
            <span
              className={cn("size-2 rounded-full opacity-75", view.className)}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>{view.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getSyncStatusDotView(
  status: SyncIndicatorStatus,
  pendingCount: number,
): SyncStatusDotView {
  if (status === "error") {
    return { label: "Sync failed", className: "bg-(--intent-danger-fill)" };
  }

  if (status === "pending") {
    return {
      label: `${pendingCount} pending sync`,
      className: "bg-(--intent-warning-fill)",
    };
  }

  if (status === "syncing") {
    return { label: "Syncing", className: "bg-(--intent-warning-fill)" };
  }

  if (status === "offline") {
    return { label: "Offline", className: "bg-muted-foreground/60" };
  }

  return { label: "Ready offline", className: "bg-(--intent-success-fill)" };
}
