import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { subject } from "@/db/schema";
import { createSubjectPathForUser } from "@/features/subjects/path-mutations";
import {
  countChildSubjectsForUser,
  countTotalSubjectsForUser,
  getSubjectDepthForUser,
  getSubjectRecordForUser,
  getSubjectSubtreeHeightForUser,
  getSubjectTreeRecordForUser,
  isSubjectAncestorOf,
} from "@/features/subjects/queries";
import {
  insertSubjectRow,
  resolveSubjectUniqueError,
} from "@/features/subjects/subject-write";
import type {
  CreateSubjectForm,
  DeleteSubjectForm,
  EditSubjectForm,
  MoveSubjectForm,
} from "@/features/subjects/validation";
import { LIMITS } from "@/lib/config/limits";
import type { MoveSubjectResult } from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

type SubjectMoveTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export type SubjectMutationResult =
  | {
      success: true;
      subjectId?: string;
    }
  | ActionErrorResult;

function getSubjectMutationValues(values: Pick<CreateSubjectForm, "name">) {
  return {
    name: values.name.trim(),
  };
}

function getSubjectPathSegments(name: string): string[] {
  return name.split("::").map((segment) => segment.trim());
}

/**
 * Validates that a subject can be nested under `parentSubjectId`: the parent
 * exists, has room for another child, and is not already at the depth cap.
 * Shared by create and move. Returns an error result, or null when valid.
 */
async function validateSubjectNesting(
  userId: string,
  parentSubjectId: string,
  childCount: number,
  nestedDepth = 1,
  executor: Pick<ReturnType<typeof getDb>, "select" | "execute"> = getDb(),
): Promise<ActionErrorResult | null> {
  const [parent, parentDepth] = await Promise.all([
    getSubjectTreeRecordForUser(userId, parentSubjectId, executor),
    getSubjectDepthForUser(userId, parentSubjectId, executor),
  ]);

  if (!parent) {
    return actionError("subjects.notFound");
  }

  if (childCount >= LIMITS.maxChildSubjectsPerSubject) {
    return actionError("limits.childSubjectLimit", {
      errorParams: { max: LIMITS.maxChildSubjectsPerSubject },
    });
  }

  if (
    parentDepth !== null &&
    parentDepth + nestedDepth > LIMITS.maxSubjectNestingDepth
  ) {
    return actionError("limits.subjectNestingDepthLimit", {
      errorParams: { max: LIMITS.maxSubjectNestingDepth },
    });
  }

  return null;
}

async function insertSubjectForUser(
  userId: string,
  data: CreateSubjectForm,
): Promise<SubjectMutationResult> {
  try {
    const subjectId = await insertSubjectRow(getDb(), userId, data);
    return { success: true, subjectId };
  } catch (error) {
    const insertError = resolveSubjectUniqueError(error);
    if (insertError) return insertError;
    throw error;
  }
}

export async function createSubjectForUser(
  userId: string,
  data: CreateSubjectForm,
): Promise<SubjectMutationResult> {
  const pathSegments = getSubjectPathSegments(data.name);
  if (pathSegments.some((segment) => segment.length === 0)) {
    return actionError("subjects.invalidData");
  }
  if (pathSegments.length > 1) {
    return createSubjectPathForUser(userId, data, pathSegments);
  }

  const [totalCount, childCount] = await Promise.all([
    countTotalSubjectsForUser(userId),
    data.parentSubjectId
      ? countChildSubjectsForUser(userId, data.parentSubjectId)
      : Promise.resolve(0),
  ]);

  if (totalCount >= LIMITS.maxSubjects) {
    return actionError("limits.subjectLimit", {
      errorParams: { max: LIMITS.maxSubjects },
    });
  }

  if (data.parentSubjectId) {
    const nestingError = await validateSubjectNesting(
      userId,
      data.parentSubjectId,
      childCount,
    );
    if (nestingError) {
      return nestingError;
    }
  }

  return insertSubjectForUser(userId, data);
}

export async function editSubjectForUser(
  userId: string,
  data: EditSubjectForm,
): Promise<SubjectMutationResult> {
  const existing = await getSubjectRecordForUser(userId, data.id);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  try {
    await getDb()
      .update(subject)
      .set(getSubjectMutationValues(data))
      .where(and(eq(subject.id, data.id), eq(subject.userId, userId)));
  } catch (error) {
    const insertError = resolveSubjectUniqueError(error);
    if (insertError) return insertError;
    throw error;
  }

  return { success: true, subjectId: data.id };
}

export async function deleteSubjectForUser(
  userId: string,
  data: DeleteSubjectForm,
): Promise<SubjectMutationResult> {
  const existing = await getSubjectRecordForUser(userId, data.id);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  await getDb()
    .delete(subject)
    .where(and(eq(subject.id, data.id), eq(subject.userId, userId)));

  return { success: true };
}

async function moveSubjectInTransaction(
  userId: string,
  values: MoveSubjectForm,
  transaction: SubjectMoveTransaction,
): Promise<MoveSubjectResult> {
  const existing = await getSubjectTreeRecordForUser(
    userId,
    values.id,
    transaction,
  );
  if (!existing) return actionError("subjects.notFound");
  const newParentSubjectId = values.parentSubjectId ?? null;
  const result = subjectMoveSuccess(
    values.id,
    existing.parentSubjectId,
    newParentSubjectId,
  );
  if (newParentSubjectId === existing.parentSubjectId) return result;
  const validationError =
    newParentSubjectId === null
      ? null
      : await validateSubjectReparenting(
          userId,
          values.id,
          newParentSubjectId,
          transaction,
        );
  if (validationError) return validationError;
  return persistSubjectMove(userId, values, transaction, result);
}

function subjectMoveSuccess(
  id: string,
  previousParentSubjectId: string | null,
  newParentSubjectId: string | null,
): Extract<MoveSubjectResult, { success: true }> {
  return { success: true, id, previousParentSubjectId, newParentSubjectId };
}

async function validateSubjectReparenting(
  userId: string,
  subjectId: string,
  parentSubjectId: string,
  transaction: SubjectMoveTransaction,
): Promise<ActionErrorResult | null> {
  const cycleError = await validateSubjectMoveTarget(
    userId,
    subjectId,
    parentSubjectId,
    transaction,
  );
  if (cycleError) return cycleError;
  const [childCount, subtreeHeight] = await Promise.all([
    countChildSubjectsForUser(userId, parentSubjectId, transaction),
    getSubjectSubtreeHeightForUser(userId, subjectId, transaction),
  ]);
  return validateSubjectNesting(
    userId,
    parentSubjectId,
    childCount,
    subtreeHeight,
    transaction,
  );
}

async function persistSubjectMove(
  userId: string,
  values: MoveSubjectForm,
  transaction: SubjectMoveTransaction,
  result: Extract<MoveSubjectResult, { success: true }>,
): Promise<MoveSubjectResult> {
  try {
    await transaction
      .update(subject)
      .set({ parentSubjectId: values.parentSubjectId ?? null })
      .where(and(eq(subject.id, values.id), eq(subject.userId, userId)));
    return result;
  } catch (error) {
    const uniqueError = resolveSubjectUniqueError(error);
    if (uniqueError) return uniqueError;
    throw error;
  }
}

/**
 * Guards a move target against self-parenting and cycles (moving a subject
 * into one of its own descendants). Returns an error result, or null.
 */
async function validateSubjectMoveTarget(
  userId: string,
  subjectId: string,
  newParentSubjectId: string,
  transaction: SubjectMoveTransaction,
): Promise<ActionErrorResult | null> {
  if (newParentSubjectId === subjectId) {
    return actionError("subjects.cannotMoveIntoSelf");
  }

  const wouldCreateCycle = await isSubjectAncestorOf(
    userId,
    subjectId,
    newParentSubjectId,
    transaction,
  );
  if (wouldCreateCycle) {
    return actionError("subjects.wouldCreateCycle");
  }

  return null;
}

/** Prevents concurrent moves from validating against the same stale hierarchy. */
export async function moveSubjectForUser(
  userId: string,
  values: MoveSubjectForm,
): Promise<MoveSubjectResult> {
  return getDb().transaction(
    async (transaction) => {
      await transaction.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`subject-move:${userId}`}, 0))`,
      );
      return moveSubjectInTransaction(userId, values, transaction);
    },
    // Reads after a lock wait must see the preceding move's committed hierarchy.
    { isolationLevel: "read committed" },
  );
}
