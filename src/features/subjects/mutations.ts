import { and, eq } from "drizzle-orm";
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
): Promise<ActionErrorResult | null> {
  const [parent, parentDepth] = await Promise.all([
    getSubjectTreeRecordForUser(userId, parentSubjectId),
    getSubjectDepthForUser(userId, parentSubjectId),
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

export async function moveSubjectForUser(
  userId: string,
  data: MoveSubjectForm,
): Promise<MoveSubjectResult> {
  const existing = await getSubjectTreeRecordForUser(userId, data.id);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  const newParentSubjectId = data.parentSubjectId ?? null;

  if (newParentSubjectId === existing.parentSubjectId) {
    return {
      success: true,
      id: data.id,
      previousParentSubjectId: existing.parentSubjectId,
      newParentSubjectId,
    };
  }

  if (newParentSubjectId !== null) {
    const cycleError = await validateSubjectMoveTarget(
      userId,
      data.id,
      newParentSubjectId,
    );
    if (cycleError) {
      return cycleError;
    }

    const [childCount, subtreeHeight] = await Promise.all([
      countChildSubjectsForUser(userId, newParentSubjectId),
      getSubjectSubtreeHeightForUser(userId, data.id),
    ]);
    const nestingError = await validateSubjectNesting(
      userId,
      newParentSubjectId,
      childCount,
      subtreeHeight,
    );
    if (nestingError) {
      return nestingError;
    }
  }

  try {
    await getDb()
      .update(subject)
      .set({ parentSubjectId: newParentSubjectId })
      .where(and(eq(subject.id, data.id), eq(subject.userId, userId)));
  } catch (error) {
    const insertError = resolveSubjectUniqueError(error);
    if (insertError) return insertError;
    throw error;
  }

  return {
    success: true,
    id: data.id,
    previousParentSubjectId: existing.parentSubjectId,
    newParentSubjectId,
  };
}

/**
 * Guards a move target against self-parenting and cycles (moving a subject
 * into one of its own descendants). Returns an error result, or null.
 */
async function validateSubjectMoveTarget(
  userId: string,
  subjectId: string,
  newParentSubjectId: string,
): Promise<ActionErrorResult | null> {
  if (newParentSubjectId === subjectId) {
    return actionError("subjects.cannotMoveIntoSelf");
  }

  const wouldCreateCycle = await isSubjectAncestorOf(
    userId,
    subjectId,
    newParentSubjectId,
  );
  if (wouldCreateCycle) {
    return actionError("subjects.wouldCreateCycle");
  }

  return null;
}
