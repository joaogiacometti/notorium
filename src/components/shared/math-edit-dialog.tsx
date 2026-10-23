"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { KatexHtml } from "@/components/shared/katex-html";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { SlashCommandRange } from "@/lib/editor/tiptap-slash-commands";

export type MathDialogState =
  | { mode: "insert-block"; range: SlashCommandRange }
  | {
      mode: "edit";
      nodeType: "inlineMath" | "blockMath";
      pos: number;
      latex: string;
    };

interface MathEditDialogProps {
  editor: Editor | null;
  state: MathDialogState | null;
  onClose: () => void;
}

/**
 * Edits a single LaTeX equation with a live KaTeX preview. The math extension
 * ships no inline editor, so this dialog is the only edit surface — opened by
 * clicking an equation or by the `/math` slash command.
 *
 * @example
 * <MathEditDialog editor={editor} state={mathDialog} onClose={close} />
 */
export function MathEditDialog({
  editor,
  state,
  onClose,
}: Readonly<MathEditDialogProps>) {
  const isBlock =
    state?.mode === "insert-block" || state?.nodeType === "blockMath";
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!state) return;
    setValue(state.mode === "edit" ? state.latex : "");
  }, [state]);

  // Render KaTeX to markup during render rather than imperatively into a ref:
  // Radix mounts the dialog's portal content after the parent commit, so a
  // ref-based effect sees a null/replaced node on open and the preview stays
  // blank until the next keystroke. Deriving the HTML keeps it in sync with
  // `value`/`isBlock` on every render, including the first one after opening.
  // Empty input shows a thin space (`\;`) so the preview box keeps its height.
  const previewLatex = value.trim() || "\\;";

  function handleSave() {
    if (editor && state) {
      applyMathChange(editor, state, value.trim());
    }
    onClose();
  }

  function handleRemove() {
    if (editor && state && state.mode === "edit") {
      removeMathNode(editor, state);
    }
    onClose();
  }

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state?.mode === "insert-block"
              ? "Insert equation"
              : "Edit equation"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Write LaTeX and preview the rendered equation.
          </DialogDescription>
        </DialogHeader>
        {/* min-w-0: DialogContent is a grid, so unwrappable KaTeX would
            otherwise widen the column and push everything past the dialog. */}
        <div className="min-w-0 space-y-3">
          <Textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={isBlock ? "\\int_0^1 x^2 \\, dx" : "E = mc^2"}
            aria-label="LaTeX"
            className="font-mono text-sm"
            autoFocus
            rows={isBlock ? 4 : 2}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                handleSave();
              }
            }}
          />
          {/* Safe centering: plain centering clips wide equations on the
              left, beyond the scroll origin. */}
          <div className="flex min-h-12 items-center justify-center-safe overflow-x-auto rounded-md border border-border bg-muted/30 px-3 py-2">
            <KatexHtml
              latex={previewLatex}
              display={isBlock}
              className="text-foreground"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {state?.mode === "edit" ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemove}
              className="mr-auto text-destructive"
            >
              Remove
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!value.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function applyMathChange(
  editor: Editor,
  state: MathDialogState,
  latex: string,
) {
  if (!latex) {
    if (state.mode === "edit") removeMathNode(editor, state);
    return;
  }

  if (state.mode === "insert-block") {
    editor
      .chain()
      .focus()
      .insertContentAt(state.range, { type: "blockMath", attrs: { latex } })
      .run();
    return;
  }

  if (state.nodeType === "inlineMath") {
    editor.chain().focus().updateInlineMath({ latex, pos: state.pos }).run();
  } else {
    editor.chain().focus().updateBlockMath({ latex, pos: state.pos }).run();
  }
}

function removeMathNode(
  editor: Editor,
  state: Extract<MathDialogState, { mode: "edit" }>,
) {
  if (state.nodeType === "inlineMath") {
    editor.chain().focus().deleteInlineMath({ pos: state.pos }).run();
  } else {
    editor.chain().focus().deleteBlockMath({ pos: state.pos }).run();
  }
}
