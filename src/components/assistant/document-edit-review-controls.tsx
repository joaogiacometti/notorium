"use client";

import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { Button } from "@/components/ui/button";

/** Resolve the whole proposal inside the active document workspace.
 * @example <DocumentEditReviewControls disabled={uploading} />
 */
export function DocumentEditReviewControls({
  disabled = false,
}: Readonly<{ disabled?: boolean }>) {
  const workspace = useAssistantWorkspace();
  return (
    <fieldset
      className="min-w-0 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2 text-sm"
      aria-label="Review document changes"
    >
      <span className="mr-auto text-xs text-muted-foreground">
        <span className="text-(--intent-success-text)">Added</span> /{" "}
        <span className="text-(--intent-danger-text) line-through">
          Removed
        </span>
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => workspace?.documents.decide(false)}
      >
        Discard changes
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        onClick={() => workspace?.documents.decide(true)}
      >
        Accept changes
      </Button>
    </fieldset>
  );
}
