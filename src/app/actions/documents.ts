"use server";

import type {
  DocumentKind,
  MoveDocumentMutationInput,
  MoveDocumentResult,
} from "@/features/documents/types";
import {
  type MoveDocumentForm,
  moveDocumentSchema,
} from "@/features/documents/validation";
import { moveNoteForUser } from "@/features/notes/mutations";
import { movePdfForUser } from "@/features/pdfs/mutations";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import { revalidateAppShell } from "@/lib/server/revalidate-views";

const MOVE_DOCUMENT_BY_KIND = {
  note: moveNoteForUser,
  pdf: movePdfForUser,
} satisfies Record<
  DocumentKind,
  (
    userId: string,
    data: MoveDocumentMutationInput,
  ) => Promise<MoveDocumentResult>
>;

/**
 * Moves a note or PDF to another subject (tree drag-and-drop). Revalidates the origin and
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
    (userId, { kind, ...move }) => MOVE_DOCUMENT_BY_KIND[kind](userId, move),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}
