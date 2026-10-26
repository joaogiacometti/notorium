"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { AssistantLauncherButton } from "@/components/assistant/assistant-launcher-button";
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
 * Provides the page layout shared by review and exam sessions.
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
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <SessionHeader
        badge={badge}
        headerText={headerText}
        exitLabel={exitLabel}
        onExit={onExit}
        actions={actions}
      />
      <progress
        className="h-0.5 w-full shrink-0 appearance-none bg-border [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-primary"
        value={Math.round(progress * 100)}
        max={100}
        aria-label="Review progress"
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-5">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center py-4 sm:py-6">
          {children}
        </div>
      </div>

      <div className="shrink-0 border-t bg-background/95 px-4 py-3 sm:px-6 sm:py-4">
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
    <div className="flex items-center gap-2 px-4 py-2 sm:px-6">
      {badge}
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {headerText}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <AssistantLauncherButton />
        {actions}
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={exitLabel}
          onClick={onExit}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
