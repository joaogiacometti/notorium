"use client";

import { deleteEditorImages } from "@/app/actions/attachments";
import { getRemovedAttachmentPathnames } from "@/features/attachments/utils";

export async function cleanupDiscardedEditorAttachments(
  previousValues: string[],
  nextValues: string[],
): Promise<void> {
  const pathnames = getRemovedAttachmentPathnames(previousValues, nextValues);

  if (pathnames.length === 0) {
    return;
  }

  await deleteEditorImages({ pathnames });
}
