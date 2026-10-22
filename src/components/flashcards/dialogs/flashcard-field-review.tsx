"use client";

import { useState } from "react";
import type { PendingFlashcardField } from "@/components/assistant/assistant-workspace-context";
import { RichTextEditPreview } from "@/components/shared/rich-text-edit-preview";
import { Button } from "@/components/ui/button";

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
  const [ready, setReady] = useState(false);
  return (
    <fieldset
      className="min-w-0 rounded-md border border-input"
      aria-label={`${field} suggestion`}
    >
      <RichTextEditPreview
        onReadyChange={setReady}
        original={proposal.original}
        replacement={proposal.replacement}
        label={`Suggested ${field} changes`}
        className="max-h-[40svh]"
      />
      <div className="flex items-center justify-end gap-2 border-t p-2">
        <span className="mr-auto text-xs text-muted-foreground">
          Added / <span className="line-through">Removed</span>
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !ready}
          onClick={() => onDecide(false)}
        >
          Discard {field}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled || !ready}
          onClick={() => onDecide(true)}
        >
          Accept {field}
        </Button>
      </div>
    </fieldset>
  );
}
