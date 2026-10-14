"use server";

import { revalidatePath } from "next/cache";
import type { MoveDocumentResult } from "@/features/documents/types";
import {
  type MoveDocumentForm,
  moveDocumentSchema,
} from "@/features/documents/validation";
import { moveMindmapForUser } from "@/features/mindmaps/mutations";
import { moveNoteForUser } from "@/features/notes/mutations";
import { runValidatedUserAction } from "@/lib/server/action-runner";

/**
 * Moves a note or mindmap to another subject (tree drag-and-drop). Dispatches
 * to the matching feature mutation and revalidates both the origin and
 * destination subject so each sidebar branch reflects the change.
 *
 * @example moveDocument({ kind: "note", id, subjectId: targetId })
 */
export async function moveDocument(
  data: MoveDocumentForm,
): Promise<MoveDocumentResult> {
  const result = await runValidatedUserAction(
    moveDocumentSchema,
    data,
    "documents.invalidData",
    async (userId, parsedData) => {
      if (parsedData.kind === "note") {
        return moveNoteForUser(userId, parsedData);
      }
      return moveMindmapForUser(userId, parsedData);
    },
  );

  if (result.success) {
    revalidatePath("/", "layout");
    revalidatePath(`/subjects/${result.subjectId}`);
    revalidatePath(`/subjects/${result.previousSubjectId}`);
  }

  return result;
}
