"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ReviewSessionShellProps {
  progress: number;
  headerText: string;
  exitLabel: string;
  onExit: () => void;
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
  badge,
  children,
  footer,
}: Readonly<ReviewSessionShellProps>) {
  return (
    <div className="fixed inset-0 z-110 flex flex-col overflow-hidden bg-background">
      <progress
        className="h-1 w-full appearance-none overflow-hidden bg-muted [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
        value={Math.round(progress * 100)}
        max={100}
        aria-label="Review progress"
      />

      <SessionHeader
        badge={badge}
        headerText={headerText}
        exitLabel={exitLabel}
        onExit={onExit}
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
        {children}
      </div>

      <div className="shrink-0 border-t border-border/60 px-4 py-4 sm:px-5">
        {footer}
      </div>
    </div>
  );
}

interface SessionHeaderProps {
  badge?: ReactNode;
  headerText: string;
  exitLabel: string;
  onExit: () => void;
}

function SessionHeader({
  badge,
  headerText,
  exitLabel,
  onExit,
}: Readonly<SessionHeaderProps>) {
  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-5">
      {badge ?? <div className="size-10" />}
      <span className="text-sm font-medium text-muted-foreground">
        {headerText}
      </span>
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
  );
}
