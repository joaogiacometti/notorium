"use client";

import { useState } from "react";
import { DocumentEditReviewControls } from "@/components/assistant/document-edit-review-controls";
import type { PendingDocumentEdit } from "@/components/assistant/document-editor-types";
import { RichTextEditPreview } from "@/components/shared/rich-text-edit-preview";

/** Show the proposed note in its editor region, keeping the real editor mounted separately.
 * @example <NoteDocumentReview proposal={pending} disabled={uploading} />
 */
export function NoteDocumentReview({
  proposal,
  disabled,
}: Readonly<{ proposal: PendingDocumentEdit; disabled: boolean }>) {
  const [ready, setReady] = useState(false);
  if (proposal.baseline.kind !== "note" || proposal.prepared.kind !== "note")
    return null;
  return (
    <section
      aria-label="Suggested note changes"
      className="flex min-h-0 flex-1 flex-col gap-2"
    >
      <DocumentEditReviewControls disabled={disabled || !ready} />
      <RichTextEditPreview
        segments={proposal.prepared.segments}
        onReadyChange={setReady}
        original={proposal.baseline.content}
        replacement={proposal.prepared.content}
        label="Suggested note content changes"
        className="min-h-52 flex-1 rounded-md border border-input"
      />
    </section>
  );
}
