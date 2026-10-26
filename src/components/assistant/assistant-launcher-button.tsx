"use client";

import { Sparkles } from "lucide-react";
import { useEffectEvent, useLayoutEffect, useRef } from "react";
import {
  type AssistantWorkspace,
  useAssistantWorkspace,
} from "@/components/assistant/assistant-workspace-context";
import { Button } from "@/components/ui/button";

/** Header launcher for review and exam session pages; replaces the floating launcher while mounted.
 * @example <AssistantLauncherButton />
 */
export function AssistantLauncherButton() {
  const workspace = useAssistantWorkspace();
  return workspace ? <HeaderLauncher workspace={workspace} /> : null;
}

function HeaderLauncher({
  workspace,
}: Readonly<{ workspace: AssistantWorkspace }>) {
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
      className="size-10"
      aria-label="Open study assistant"
      aria-expanded={open}
      aria-controls="study-assistant-panel"
      aria-keyshortcuts="Control+J Meta+J"
      onClick={() => setOpen(!open)}
    >
      <Sparkles className="size-5" />
    </Button>
  );
}
