"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { PendingFlashcardField } from "@/components/assistant/assistant-workspace-context";
import { Button } from "@/components/ui/button";
import { buildRichTextReviewExtension } from "@/lib/editor/rich-text-review-decorations";
import {
  buildRichTextReviewExtensions,
  parseReviewedRichText,
} from "@/lib/editor/rich-text-review-schema";

interface FlashcardFieldReviewProps {
  field: "front" | "back";
  proposal: PendingFlashcardField;
  onDecide: (accept: boolean) => void;
  disabled?: boolean;
}

/** Review changes inside the field, keeping the actual form value untouched.
 * @example <FlashcardFieldReview field="back" proposal={proposal} onDecide={decide} />
 */
export function FlashcardFieldReview({
  field,
  proposal,
  onDecide,
  disabled = false,
}: Readonly<FlashcardFieldReviewProps>) {
  const editor = useEditor(
    {
      extensions: [
        ...buildRichTextReviewExtensions(),
        buildRichTextReviewExtension(parseReviewedRichText(proposal.original)),
      ],
      content: proposal.replacement,
      editable: false,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "tiptap-editor-content",
          "aria-label": `Suggested ${field} changes`,
        },
      },
    },
    [proposal.original, proposal.replacement],
  );
  return (
    <fieldset
      className="min-w-0 rounded-md border border-input"
      aria-label={`${field} suggestion`}
    >
      <div className="tiptap-content max-h-[40svh] overflow-y-auto p-3">
        <EditorContent editor={editor} />
      </div>
      <div className="flex items-center justify-end gap-2 border-t p-2">
        <span className="mr-auto text-xs text-muted-foreground">
          Added / <span className="line-through">Removed</span>
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !editor}
          onClick={() => onDecide(false)}
        >
          Discard {field}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled || !editor}
          onClick={() => onDecide(true)}
        >
          Accept {field}
        </Button>
      </div>
    </fieldset>
  );
}
