"use client";

import { Sparkles, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AssistantPanelFrame } from "@/components/assistant/assistant-panel-frame";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function loadAssistantPanel() {
  return import("@/components/assistant/assistant-panel");
}

// Split out so the chat runtime stays out of every page's initial bundle, and
// preloaded once the page is idle. The frame shows while the chunk is still
// on its way, so the panel opens the instant the button is pressed.
const AssistantPanel = dynamic(
  () => loadAssistantPanel().then((module) => module.AssistantPanel),
  { ssr: false, loading: AssistantPanelPlaceholder },
);

/**
 * Floating study assistant: a bottom-right button that expands into a chat
 * panel. The panel stays mounted once opened, so closing it keeps the chat;
 * nothing is persisted, so a reload starts fresh.
 *
 * @example
 * {aiEnabled && <StudyAssistant />}
 */
export function StudyAssistant() {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => preloadWhenIdle(loadAssistantPanel), []);

  function toggleOpen() {
    setOpened(true);
    setOpen(!open);
  }

  return (
    <div className="fixed right-4 bottom-4 z-chrome flex flex-col items-end gap-3 print:hidden">
      {opened ? (
        <div id="study-assistant-panel" className={cn(!open && "hidden")}>
          <AssistantPanel />
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={toggleOpen}
        onPointerEnter={() => void loadAssistantPanel()}
        onFocus={() => void loadAssistantPanel()}
        aria-label={open ? "Close study assistant" : "Open study assistant"}
        aria-expanded={open}
        aria-controls="study-assistant-panel"
        className="size-11 rounded-full border-border/70 bg-card text-muted-foreground shadow-md transition-colors hover:text-foreground"
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </Button>
    </div>
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
