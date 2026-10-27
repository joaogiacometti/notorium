"use server";

import type { MoveDocumentResult } from "@/features/documents/types";
import {
  type MoveDocumentForm,
  moveDocumentSchema,
} from "@/features/documents/validation";
import { moveNoteForUser } from "@/features/notes/mutations";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import { revalidateAppShell } from "@/lib/server/revalidate-views";

/**
 * Moves a note to another subject (tree drag-and-drop). Revalidates the origin and
 * destination subject so each sidebar branch reflects the change.
 *
 * @example moveDocument({ kind: "note", id, subjectId: targetId })
 */
export async function moveDocument(
  data: MoveDocumentForm,
): Promise<MoveDocumentResult> {
  const result = await runValidatedUserAction(
    "documents.moveDocument",
    moveDocumentSchema,
    data,
    "documents.invalidData",
    (userId, parsedData) => moveNoteForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}
