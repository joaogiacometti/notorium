"use server";

import { revalidatePath } from "next/cache";
import { getRecentDocumentsForUser } from "@/features/documents/queries";
import type { MoveDocumentResult } from "@/features/documents/types";
import {
  type MoveDocumentForm,
  moveDocumentSchema,
} from "@/features/documents/validation";
import { moveBookForUser } from "@/features/library/mutations";
import { moveMindmapForUser } from "@/features/mindmaps/mutations";
import { moveNoteForUser } from "@/features/notes/mutations";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";

export interface OpenableDocument {
  id: string;
  title: string;
  kind: "note" | "mindmap";
}

const OPENABLE_DOCUMENTS_LIMIT = 200;

/**
 * Lists the user's notes and mindmaps (most recent first) for the command
 * palette's "open document in window" picker. Books are excluded: they open in
 * a full reader route, not a floating window. Returns only id/title/kind since
 * the window loads full content lazily by id.
 *
 * @example
 * const documents = await getOpenableDocuments();
 */
export async function getOpenableDocuments(): Promise<OpenableDocument[]> {
  const userId = await getAuthenticatedUserId();
  const documents = await getRecentDocumentsForUser(
    userId,
    OPENABLE_DOCUMENTS_LIMIT,
  );
  return documents.flatMap((document) =>
    document.kind === "book"
      ? []
      : [{ id: document.id, title: document.title, kind: document.kind }],
  );
}

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
      if (parsedData.kind === "book") {
        return moveBookForUser(userId, parsedData);
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
