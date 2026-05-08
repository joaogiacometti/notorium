"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ReviewSessionShellProps {
  progress: number;
  headerText: string;
  exitLabel: string;
  onExit: () => void;
  actions?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Provides the full-screen layout shared by review and exam sessions.
 *
 * @example
 * <ReviewSessionShell progress={0.5} headerText="1 due" exitLabel="Exit" onExit={onExit} footer={buttons}>...</ReviewSessionShell>
 */
export function ReviewSessionShell({
  progress,
  headerText,
  exitLabel,
  onExit,
  actions,
  badge,
  children,
  footer,
}: Readonly<ReviewSessionShellProps>) {
  return (
    <div className="fixed inset-0 z-110 flex flex-col overflow-hidden bg-background">
      <progress
        className="h-1.5 w-full appearance-none overflow-hidden bg-muted [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
        value={Math.round(progress * 100)}
        max={100}
        aria-label="Review progress"
      />

      <SessionHeader
        badge={badge}
        headerText={headerText}
        exitLabel={exitLabel}
        onExit={onExit}
        actions={actions}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center py-4 sm:py-6">
          {children}
        </div>
      </div>

      <div className="shrink-0 border-t border-border/60 bg-background/95 px-4 py-3 sm:px-5 sm:py-4">
        <div className="mx-auto w-full max-w-4xl">{footer}</div>
      </div>
    </div>
  );
}

interface SessionHeaderProps {
  badge?: ReactNode;
  headerText: string;
  exitLabel: string;
  onExit: () => void;
  actions?: ReactNode;
}

function SessionHeader({
  badge,
  headerText,
  exitLabel,
  onExit,
  actions,
}: Readonly<SessionHeaderProps>) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/40 px-4 py-3 sm:px-5">
      <div className="flex min-w-10 items-center">
        {badge ?? <div className="size-10" />}
      </div>
      <span className="truncate text-center text-sm font-medium text-muted-foreground">
        {headerText}
      </span>
      <div className="flex items-center justify-end gap-1">
        {actions}
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          aria-label={exitLabel}
          onClick={onExit}
        >
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
