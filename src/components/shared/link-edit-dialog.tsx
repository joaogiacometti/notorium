"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type LinkDialogState =
  | { mode: "create"; selectedText: string }
  | { mode: "edit"; href: string };

interface LinkEditDialogProps {
  editor: Editor | null;
  state: LinkDialogState | null;
  onClose: () => void;
}

/**
 * Creates or edits a link via a dialog opened by the Ctrl+K keyboard shortcut.
 *
 * @example
 * <LinkEditDialog editor={editor} state={linkDialog} onClose={close} />
 */
export function LinkEditDialog({
  editor,
  state,
  onClose,
}: Readonly<LinkEditDialogProps>) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!state) return;
    setValue(state.mode === "edit" ? state.href : "");
  }, [state]);

  function handleSave() {
    if (!editor || !state) return;

    const rawUrl = value.trim();
    if (!rawUrl) return;

    let url: string;
    try {
      const parsed = new URL(rawUrl);
      if (
        parsed.protocol !== "http:" &&
        parsed.protocol !== "https:" &&
        parsed.protocol !== "mailto:"
      ) {
        return;
      }
      url = parsed.href;
    } catch {
      try {
        url = new URL(`https://${rawUrl}`).href;
      } catch {
        return;
      }
    }

    if (state.mode === "edit") {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    } else if (!state.selectedText) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: url,
          marks: [{ type: "link", attrs: { href: url } }],
        })
        .run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }

    onClose();
  }

  function handleRemove() {
    if (!editor || !state || state.mode !== "edit") return;

    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  }

  const isEdit = state?.mode === "edit";

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit link" : "Insert link"}</DialogTitle>
          <DialogDescription className="sr-only">
            Enter a URL to create or edit a link.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!isEdit && state?.mode === "create" ? (
            <p className="text-sm text-muted-foreground">
              Link &ldquo;{state.selectedText}&rdquo; to:
            </p>
          ) : null}
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://example.com"
            aria-label="URL"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSave();
              }
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {isEdit ? (
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
