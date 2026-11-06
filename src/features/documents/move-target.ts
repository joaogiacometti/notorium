import type {
  MoveDocumentMutationInput,
  MoveDocumentResult,
} from "@/features/documents/types";
import { getFolderRecordForUser } from "@/features/folders/queries";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export interface DocumentCapacityRule {
  countInFolder: (userId: string, folderId: string) => Promise<number>;
  max: number;
  limitErrorCode: string;
}

/**
 * Checks that a folder exists for the user and still has room for one more
 * document of a kind. Shared by document create and move mutations.
 *
 * @example
 * const error = await checkDocumentFolderCapacity(userId, folderId, notesRule);
 */
export async function checkDocumentFolderCapacity(
  userId: string,
  folderId: string,
  rule: DocumentCapacityRule,
): Promise<ActionErrorResult | null> {
  const [targetFolder, current] = await Promise.all([
    getFolderRecordForUser(userId, folderId),
    rule.countInFolder(userId, folderId),
  ]);
  if (!targetFolder) {
    return actionError("folders.notFound");
  }
  if (current >= rule.max) {
    return actionError(rule.limitErrorCode, {
      errorParams: { max: rule.max },
    });
  }

  return null;
}

export interface DocumentMoveSpec {
  /** Folder currently holding the user's document, or null when not owned. */
  findFolderId: (userId: string, id: string) => Promise<string | null>;
  notFoundCode: string;
  rule: DocumentCapacityRule;
  reparent: (userId: string, id: string, folderId: string) => Promise<void>;
}

/**
 * Reparents a document (tree drag-and-drop): enforces ownership and the
 * destination's capacity. A move to the current folder is a no-op success.
 *
 * @example
 * await moveDocumentForUser(userId, { id, folderId }, pdfMoveSpec);
 */
export async function moveDocumentForUser(
  userId: string,
  data: MoveDocumentMutationInput,
  spec: DocumentMoveSpec,
): Promise<MoveDocumentResult> {
  const previousFolderId = await spec.findFolderId(userId, data.id);
  if (!previousFolderId) {
    return actionError(spec.notFoundCode);
  }
  if (previousFolderId === data.folderId) {
    return { success: true, folderId: previousFolderId, previousFolderId };
  }

  const targetError = await checkDocumentFolderCapacity(
    userId,
    data.folderId,
    spec.rule,
  );
  if (targetError) {
    return targetError;
  }

  await spec.reparent(userId, data.id, data.folderId);
  return { success: true, folderId: data.folderId, previousFolderId };
}
