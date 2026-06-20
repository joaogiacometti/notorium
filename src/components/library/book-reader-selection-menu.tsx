"use client";

import { useSelectionCapability } from "@embedpdf/plugin-selection/react";
import { Copy, Layers, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ReaderAskAiDialog } from "@/components/library/book-reader-ask-ai-dialog";
import { ReaderFlashcardsDialog } from "@/components/library/book-reader-flashcards-dialog";
import type { DeckOption } from "@/lib/server/api-contracts";

// Gap between the pointer and the toolbar, and a rough footprint used to keep it
// from spilling off the viewport edges. The toolbar is wider when the AI actions
// are present, so the width estimate widens with them.
const POINTER_GAP = 12;
const ESTIMATED_HEIGHT = 44;
const COPY_ONLY_WIDTH = 92;
const WITH_AI_WIDTH = 320;

interface PointerAnchor {
  x: number;
  y: number;
}

interface ReaderSelectionMenuProps {
  documentId: string;
  aiEnabled: boolean;
  decks: DeckOption[];
}

// Floating action bar anchored to where the pointer finished selecting, so it
// lands right next to the cursor instead of at the corner of the selection's
// bounding box (which drifts far away on multi-line selections and was awkward
// to click). EmbedPDF's selection is synthetic and the reader sets select-none,
// so the browser's own copy can't see the text — Copy goes through the plugin,
// and the AI actions read the text the same way before opening their dialog.
export function ReaderSelectionMenu({
  documentId,
  aiEnabled,
  decks,
}: Readonly<ReaderSelectionMenuProps>) {
  const selection = useSelectionCapability();
  const pointer = useRef<PointerAnchor>({ x: 0, y: 0 });
  const [anchor, setAnchor] = useState<PointerAnchor | null>(null);
  const [askText, setAskText] = useState<string | null>(null);
  const [flashcardsText, setFlashcardsText] = useState<string | null>(null);

  // Capture phase so the position is recorded before the selection plugin's
  // own pointerup handling emits onEndSelection. Covers mouse, touch, and pen.
  useEffect(() => {
    function trackPointer(event: PointerEvent) {
      pointer.current = { x: event.clientX, y: event.clientY };
    }
    window.addEventListener("pointerup", trackPointer, true);
    return () => window.removeEventListener("pointerup", trackPointer, true);
  }, []);

  useEffect(() => {
    const scope = selection.provides?.forDocument(documentId);
    if (!scope) return;
    const stops = [
      scope.onEndSelection(() => {
        setAnchor(scope.getState().selection ? pointer.current : null);
      }),
      scope.onSelectionChange((range) => {
        if (!range) setAnchor(null);
      }),
    ];
    return () => {
      for (const stop of stops) stop();
    };
  }, [selection.provides, documentId]);

  // A scroll moves the synthetic selection but not a viewport-fixed toolbar, so
  // dismiss rather than let it float somewhere stale. Capture catches scrolls
  // from the nested viewport, which do not bubble.
  useEffect(() => {
    if (!anchor) return;
    function dismiss() {
      setAnchor(null);
    }
    document.addEventListener("scroll", dismiss, true);
    return () => document.removeEventListener("scroll", dismiss, true);
  }, [anchor]);

  function getScope() {
    return selection.provides?.forDocument(documentId);
  }

  // The plugin returns one string per page touched by the selection; join them
  // back into a single passage before handing it to copy or the AI dialogs.
  async function readSelectedText(): Promise<string> {
    const lines = await getScope()?.getSelectedText().toPromise();
    return (lines ?? []).join("\n").trim();
  }

  function dismissSelection() {
    getScope()?.clear();
    setAnchor(null);
  }

  function copySelection() {
    getScope()?.copyToClipboard();
    dismissSelection();
  }

  async function openAskAi() {
    const text = await readSelectedText();
    if (text.length === 0) return;
    setAskText(text);
    dismissSelection();
  }

  async function openFlashcards() {
    const text = await readSelectedText();
    if (text.length === 0) return;
    setFlashcardsText(text);
    dismissSelection();
  }

  return (
    <>
      {anchor ? (
        <SelectionToolbar
          anchor={anchor}
          aiEnabled={aiEnabled}
          onCopy={copySelection}
          onAskAi={() => void openAskAi()}
          onFlashcards={() => void openFlashcards()}
        />
      ) : null}

      {aiEnabled && askText !== null ? (
        <ReaderAskAiDialog
          sourceText={askText}
          open
          onOpenChange={(open) => {
            if (!open) setAskText(null);
          }}
        />
      ) : null}

      {aiEnabled && flashcardsText !== null ? (
        <ReaderFlashcardsDialog
          decks={decks}
          sourceText={flashcardsText}
          open
          onOpenChange={(open) => {
            if (!open) setFlashcardsText(null);
          }}
        />
      ) : null}
    </>
  );
}

interface SelectionToolbarProps {
  anchor: PointerAnchor;
  aiEnabled: boolean;
  onCopy: () => void;
  onAskAi: () => void;
  onFlashcards: () => void;
}

function SelectionToolbar({
  anchor,
  aiEnabled,
  onCopy,
  onAskAi,
  onFlashcards,
}: Readonly<SelectionToolbarProps>) {
  const estimatedWidth = aiEnabled ? WITH_AI_WIDTH : COPY_ONLY_WIDTH;
  const left = Math.min(
    anchor.x + POINTER_GAP,
    window.innerWidth - estimatedWidth,
  );
  const top = Math.min(
    anchor.y + POINTER_GAP,
    window.innerHeight - ESTIMATED_HEIGHT,
  );

  return (
    <div
      style={{ left, top }}
      className="fixed z-50 flex items-center gap-1 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
    >
      <ToolbarButton onClick={onCopy} icon={<Copy className="size-4" />}>
        Copy
      </ToolbarButton>
      {aiEnabled ? (
        <>
          <ToolbarButton
            onClick={onAskAi}
            icon={<Sparkles className="size-4" />}
          >
            Ask AI
          </ToolbarButton>
          <ToolbarButton
            onClick={onFlashcards}
            icon={<Layers className="size-4" />}
          >
            Flashcards
          </ToolbarButton>
        </>
      ) : null}
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  icon,
  children,
}: Readonly<ToolbarButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      {children}
    </button>
  );
}
