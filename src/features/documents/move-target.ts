import type {
  MoveDocumentMutationInput,
  MoveDocumentResult,
} from "@/features/documents/types";
import { getSubjectRecordForUser } from "@/features/subjects/queries";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export interface DocumentCapacityRule {
  countInSubject: (userId: string, subjectId: string) => Promise<number>;
  max: number;
  limitErrorCode: string;
}

/**
 * Checks that a subject exists for the user and still has room for one more
 * document of a kind. Shared by document create and move mutations.
 *
 * @example
 * const error = await checkDocumentSubjectCapacity(userId, subjectId, notesRule);
 */
export async function checkDocumentSubjectCapacity(
  userId: string,
  subjectId: string,
  rule: DocumentCapacityRule,
): Promise<ActionErrorResult | null> {
  const [targetSubject, current] = await Promise.all([
    getSubjectRecordForUser(userId, subjectId),
    rule.countInSubject(userId, subjectId),
  ]);
  if (!targetSubject) {
    return actionError("subjects.notFound");
  }
  if (current >= rule.max) {
    return actionError(rule.limitErrorCode, {
      errorParams: { max: rule.max },
    });
  }

  return null;
}

export interface DocumentMoveSpec {
  /** Subject currently holding the user's document, or null when not owned. */
  findSubjectId: (userId: string, id: string) => Promise<string | null>;
  notFoundCode: string;
  rule: DocumentCapacityRule;
  reparent: (userId: string, id: string, subjectId: string) => Promise<void>;
}

/**
 * Reparents a document (tree drag-and-drop): enforces ownership and the
 * destination's capacity. A move to the current subject is a no-op success.
 *
 * @example
 * await moveDocumentForUser(userId, { id, subjectId }, pdfMoveSpec);
 */
export async function moveDocumentForUser(
  userId: string,
  data: MoveDocumentMutationInput,
  spec: DocumentMoveSpec,
): Promise<MoveDocumentResult> {
  const previousSubjectId = await spec.findSubjectId(userId, data.id);
  if (!previousSubjectId) {
    return actionError(spec.notFoundCode);
  }
  if (previousSubjectId === data.subjectId) {
    return { success: true, subjectId: previousSubjectId, previousSubjectId };
  }

  const targetError = await checkDocumentSubjectCapacity(
    userId,
    data.subjectId,
    spec.rule,
  );
  if (targetError) {
    return targetError;
  }

  await spec.reparent(userId, data.id, data.subjectId);
  return { success: true, subjectId: data.subjectId, previousSubjectId };
}
