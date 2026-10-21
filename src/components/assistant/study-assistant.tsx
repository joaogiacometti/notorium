"use client";

import { Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AssistantPanelFrame } from "@/components/assistant/assistant-panel-frame";
import {
  type AssistantWorkspace,
  useAssistantWorkspace,
} from "@/components/assistant/assistant-workspace-context";
import { useAssistantPortalTarget } from "@/components/assistant/use-assistant-portal-target";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function loadAssistantPanel() {
  return import("@/components/assistant/assistant-panel");
}

// Split out so the chat presentation stays out of every page's initial bundle, and
// preloaded once the page is idle. The frame shows while the chunk is still
// on its way, so the panel opens the instant the button is pressed.
const AssistantPanel = dynamic(
  () => loadAssistantPanel().then((module) => module.AssistantPanel),
  { ssr: false, loading: AssistantPanelPlaceholder },
);

/**
 * Global study assistant: one collapsible sidebar shared across pages, review,
 * and flashcard dialogs. Closing preserves the conversation and composer;
 * nothing is persisted, so a reload starts fresh.
 *
 * @example
 * {aiEnabled && <StudyAssistant />}
 */
export function StudyAssistant() {
  const workspace = useAssistantWorkspace();
  return workspace ? <StudyAssistantSurface workspace={workspace} /> : null;
}

function StudyAssistantSurface({
  workspace,
}: Readonly<{ workspace: AssistantWorkspace }>) {
  const portal = useAssistantPortalTarget(
    workspace.host,
    true,
    workspace.registerPortalTarget,
  );
  const { open, setOpen } = workspace;
  const [opened, setOpened] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const restoreLauncherFocus = useRef(false);
  useEffect(() => {
    if (!open && restoreLauncherFocus.current) {
      launcherRef.current?.focus();
      restoreLauncherFocus.current = false;
    }
  }, [open]);

  useEffect(() => preloadWhenIdle(loadAssistantPanel), []);

  function toggleOpen() {
    setOpened(true);
    setOpen(!open);
  }

  // Focus would otherwise stay on a button inside the now-hidden panel.
  function minimize() {
    restoreLauncherFocus.current = true;
    setOpen(false);
  }

  const assistant = (
    <aside
      aria-label="Study assistant controls"
      data-study-assistant
      className="pointer-events-auto print:hidden"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape" && open) {
          event.preventDefault();
          minimize();
        }
      }}
    >
      {opened || open ? (
        <aside
          id="study-assistant-panel"
          aria-label="Study assistant sidebar"
          className={cn(
            "fixed inset-y-0 right-0 w-full flex-col border-l border-border/60 bg-card shadow-lg lg:w-96",
            open ? "flex" : "hidden",
          )}
        >
          <AssistantPanel embedded onMinimize={minimize} />
        </aside>
      ) : null}
      {!open ? (
        <div className="fixed right-4 bottom-4">
          <Button
            ref={launcherRef}
            type="button"
            size="icon"
            variant="outline"
            aria-label="Open study assistant"
            aria-expanded={false}
            onClick={toggleOpen}
            className="size-11 rounded-full border-border/70 bg-card text-muted-foreground shadow-md"
          >
            <Sparkles className="size-5" />
          </Button>
        </div>
      ) : null}
    </aside>
  );
  return (
    <>
      <div
        ref={portal.fallbackRef}
        className="fixed inset-0 z-chrome pointer-events-none"
      />
      {portal.target ? createPortal(assistant, portal.target) : null}
    </>
  );
}

function AssistantPanelPlaceholder() {
  return (
    <AssistantPanelFrame busy>
      <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading…
      </p>
    </AssistantPanelFrame>
  );
}

// Returns the effect cleanup. Safari has no requestIdleCallback.
function preloadWhenIdle(load: () => Promise<unknown>): () => void {
  const run = () => void load();
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(run, { timeout: 3000 });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(run, 1500);
  return () => window.clearTimeout(handle);
}
