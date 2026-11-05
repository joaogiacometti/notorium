"use client";

import { useQuery } from "@tanstack/react-query";
import { Lightbulb, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import {
  type SettledPdfSelection,
  useSettledPdfSelection,
} from "@/components/pdfs/use-settled-pdf-selection";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ExplanationSelection } from "@/features/assistant/selection-explanation-contract";
import { readAssistantErrorMessage } from "@/lib/ai/chat-error";
import { selectionExplanationQuery } from "@/lib/client-cache/selection-explanation";
import { LIMITS } from "@/lib/config/limits";

/**
 * What the user can do with selected PDF text: get a quick explanation in
 * place, which never enters the chat, or ask the assistant, which already has
 * the selection as its context.
 */
export function PdfSelectionActions({
  pagesRef,
}: {
  pagesRef: RefObject<HTMLElement | null>;
}) {
  const { selection, dismiss } = useSettledPdfSelection(pagesRef);
  if (!selection) return null;
  return (
    <SelectionActionBar
      key={JSON.stringify([selection.text, selection.context])}
      selection={selection}
      onDismiss={dismiss}
    />
  );
}

function SelectionActionBar({
  selection,
  onDismiss,
}: {
  selection: SettledPdfSelection;
  onDismiss: () => void;
}) {
  const workspace = useAssistantWorkspace();
  const [open, setOpen] = useState(false);
  const tooLong = selection.text.length > LIMITS.assistantMessageMaxChars;
  const title = selection.text.replace(/\s+/g, " ").slice(0, 100);
  const barRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const update = () => {
      const { width, height } = bar.getBoundingClientRect();
      if (!width || !height) return;
      const margin = 8;
      const gap = 12;
      const rect = selection.rect;
      const maxLeft = Math.max(margin, window.innerWidth - width - margin);
      const maxTop = Math.max(margin, window.innerHeight - height - margin);
      // Keep clear of browser selection menus, which appear near the selection
      // endpoint. Prefer below-left, then above when the left side is crowded.
      const fitsLeft = rect.left - width - gap >= margin;
      const left = Math.max(
        margin,
        Math.min(fitsLeft ? rect.left - width - gap : rect.left, maxLeft),
      );
      let top = fitsLeft ? rect.bottom + gap : rect.top - height - gap;
      if (top < margin) top = rect.bottom + gap;
      if (top > maxTop) top = rect.top - height - gap;
      top = Math.max(margin, Math.min(top, maxTop));
      setPosition((previous) =>
        previous?.left === left && previous.top === top
          ? previous
          : { left, top },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [selection.rect]);
  return createPortal(
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onDismiss();
      }}
    >
      {/* Pressing the bar must not collapse the selection it acts on. */}
      <div
        ref={barRef}
        data-selection-actions=""
        className="fixed z-overlay flex items-center gap-1 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
        style={{
          left: position?.left ?? 0,
          top: position?.top ?? 0,
          visibility: position ? "visible" : "hidden",
        }}
        onPointerDown={(event) => event.preventDefault()}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Explain selected text"
            className="data-[state=open]:bg-muted"
          >
            <Lightbulb />
            Explain
          </Button>
        </PopoverTrigger>
        {workspace ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Ask assistant about selected text"
            onClick={() => {
              workspace.openComposer();
              onDismiss();
            }}
          >
            <Sparkles />
            Ask
          </Button>
        ) : null}
      </div>
      <PopoverPortal>
        <PopoverContent
          data-selection-actions=""
          aria-label={`Explanation of ${title}`}
          align="start"
          sideOffset={6}
          className="max-h-[min(24rem,calc(100dvh-2rem))] w-80 max-w-[calc(100vw-1rem)] overflow-auto p-4 motion-reduce:animate-none"
          // Focus the card itself: starting on Close would ring it for no reason.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (event.currentTarget instanceof HTMLElement)
              event.currentTarget.focus();
          }}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold">{title}</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Close explanation"
              onClick={onDismiss}
            >
              <X />
            </Button>
          </div>
          {tooLong ? (
            <p role="alert" className="text-sm text-muted-foreground">
              Select a shorter passage to explain (up to{" "}
              {LIMITS.assistantMessageMaxChars.toLocaleString("en-US")}{" "}
              characters).
            </p>
          ) : (
            open && <ExplanationResult selection={selection} />
          )}
        </PopoverContent>
      </PopoverPortal>
    </Popover>,
    document.body,
  );
}

function ExplanationResult({ selection }: { selection: ExplanationSelection }) {
  const query = useQuery(selectionExplanationQuery(selection));
  if (query.isPending) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <LoaderCircle className="size-4 motion-safe:animate-spin" />
        Explaining…
      </p>
    );
  }
  if (query.isError) {
    return (
      <div className="flex items-center gap-2">
        <p
          role="alert"
          className="min-w-0 flex-1 text-sm text-(--intent-danger-text)"
        >
          {readAssistantErrorMessage(query.error)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="shrink-0"
          onClick={() => void query.refetch()}
        >
          <RotateCcw />
          Retry
        </Button>
      </div>
    );
  }
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed">
      {query.data.text}
    </p>
  );
}
