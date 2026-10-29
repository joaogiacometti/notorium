"use client";

import { Sparkles } from "lucide-react";
import { useEffectEvent, useLayoutEffect, useRef } from "react";
import {
  type AssistantWorkspace,
  useAssistantWorkspace,
} from "@/components/assistant/assistant-workspace-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AssistantLauncherButtonProps {
  className?: string;
}

/** The assistant toggle every page header carries (top bar, sessions, flashcard
 * dialogs, zen mode); the most recently mounted one receives focus on minimize.
 * @example <AssistantLauncherButton />
 */
export function AssistantLauncherButton({
  className,
}: Readonly<AssistantLauncherButtonProps>) {
  const workspace = useAssistantWorkspace();
  return workspace ? (
    <HeaderLauncher workspace={workspace} className={className} />
  ) : null;
}

function HeaderLauncher({
  workspace,
  className,
}: Readonly<{ workspace: AssistantWorkspace; className?: string }>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, setOpen, registerInlineLauncher } = workspace;
  const attach = useEffectEvent((button: HTMLButtonElement) =>
    registerInlineLauncher(button),
  );
  useLayoutEffect(() => {
    if (buttonRef.current) return attach(buttonRef.current);
  }, []);

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "size-9 text-muted-foreground hover:text-foreground",
        open && "bg-muted text-foreground",
        className,
      )}
      aria-label="Open study assistant"
      aria-expanded={open}
      aria-controls="study-assistant-panel"
      aria-keyshortcuts="Control+J Meta+J"
      onClick={() => setOpen(!open)}
    >
      <Sparkles className="size-4" />
    </Button>
  );
}
