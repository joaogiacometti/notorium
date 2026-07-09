import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { subject } from "@/db/schema";
import {
  cleanupAttachmentPathnames,
  getSubjectAttachmentPathnamesForUser,
} from "@/features/attachments/cleanup";
import {
  countChildSubjectsForUser,
  countTotalSubjectsForUser,
  getAllSubjectsWithPathsForUser,
  getSubjectDepthForUser,
  getSubjectRecordForUser,
  getSubjectRecordsForUser,
  getSubjectTreeRecordForUser,
  isSubjectAncestorOf,
} from "@/features/subjects/queries";
import type {
  BulkDeleteSubjectsForm,
  CreateSubjectForm,
  DeleteSubjectForm,
  EditSubjectForm,
  MoveSubjectForm,
} from "@/features/subjects/validation";
import { LIMITS } from "@/lib/config/limits";
import { isUniqueViolationError } from "@/lib/db/errors";
import type {
  BulkSubjectMutationResult,
  MoveSubjectResult,
} from "@/lib/server/api-contracts";
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

type SubjectCreateData = Pick<
  CreateSubjectForm,
  "name" | "kind" | "parentSubjectId"
>;

function getSubjectMutationValues(
  values: Pick<CreateSubjectForm, "name" | "kind">,
) {
  return {
    name: values.name.trim(),
    kind: values.kind,
  };
}

function getSubjectPathSegments(name: string): string[] {
  return name.split("::").map((segment) => segment.trim());
}

function findLongestExistingPathPrefix(
  pathSegments: string[],
  subjects: Awaited<ReturnType<typeof getAllSubjectsWithPathsForUser>>,
) {
  for (let index = pathSegments.length; index > 0; index -= 1) {
    const path = pathSegments.slice(0, index).join("::");
    const matchingSubject = subjects.find(
      (subjectOption) => subjectOption.path === path,
    );
    if (matchingSubject) return { matchingSubject, segmentCount: index };
  }

  return null;
}

async function validateExistingParentForPath(
  userId: string,
  parentSubjectId: string,
  missingSubjectCount: number,
): Promise<ActionErrorResult | null> {
  const [parent, parentDepth, childCount] = await Promise.all([
    getSubjectTreeRecordForUser(userId, parentSubjectId),
    getSubjectDepthForUser(userId, parentSubjectId),
    countChildSubjectsForUser(userId, parentSubjectId),
  ]);

  if (!parent) return actionError("subjects.notFound");
  if (childCount >= LIMITS.maxChildSubjectsPerSubject) {
    return actionError("limits.childSubjectLimit", {
      errorParams: { max: LIMITS.maxChildSubjectsPerSubject },
    });
  }
  if (
    parentDepth !== null &&
    parentDepth + missingSubjectCount > LIMITS.maxSubjectNestingDepth
  ) {
    return actionError("limits.subjectNestingDepthLimit", {
      errorParams: { max: LIMITS.maxSubjectNestingDepth },
    });
  }

  return null;
}

async function validateSubjectPathCreate(
  userId: string,
  parentSubjectId: string | undefined,
  missingSubjectCount: number,
): Promise<ActionErrorResult | null> {
  const totalCount = await countTotalSubjectsForUser(userId);
  if (totalCount + missingSubjectCount > LIMITS.maxSubjects) {
    return actionError("limits.subjectLimit", {
      errorParams: { max: LIMITS.maxSubjects },
    });
  }
  if (parentSubjectId) {
    return validateExistingParentForPath(
      userId,
      parentSubjectId,
      missingSubjectCount,
    );
  }
  if (missingSubjectCount > LIMITS.maxSubjectNestingDepth) {
    return actionError("limits.subjectNestingDepthLimit", {
      errorParams: { max: LIMITS.maxSubjectNestingDepth },
    });
  }

  return null;
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

  if (parentDepth !== null && parentDepth >= LIMITS.maxSubjectNestingDepth) {
    return actionError("limits.subjectNestingDepthLimit", {
      errorParams: { max: LIMITS.maxSubjectNestingDepth },
    });
  }

  return null;
}

async function insertSubjectForUser(
  userId: string,
  data: SubjectCreateData,
): Promise<SubjectMutationResult> {
  try {
    const inserted = await getDb()
      .insert(subject)
      .values({
        ...getSubjectMutationValues(data),
        parentSubjectId: data.parentSubjectId ?? null,
        // Subfolders are pure containers; only roots can be academic (locked).
        kind: data.parentSubjectId ? "general" : data.kind,
        userId,
      })
      .returning({ id: subject.id });

    return { success: true, subjectId: inserted[0]?.id };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("subjects.duplicateName");
    }
    throw error;
  }
}

async function createSubjectPathForUser(
  userId: string,
  data: CreateSubjectForm,
  pathSegments: string[],
): Promise<SubjectMutationResult> {
  const existingPrefix = findLongestExistingPathPrefix(
    pathSegments,
    await getAllSubjectsWithPathsForUser(userId),
  );
  if (existingPrefix?.segmentCount === pathSegments.length) {
    return actionError("subjects.duplicateName");
  }

  const missingSegments = pathSegments.slice(existingPrefix?.segmentCount ?? 0);
  const parentSubjectId = existingPrefix?.matchingSubject.id;
  const validationError = await validateSubjectPathCreate(
    userId,
    parentSubjectId,
    missingSegments.length,
  );
  if (validationError) return validationError;

  return insertSubjectPathSegments(
    userId,
    data.kind,
    parentSubjectId,
    missingSegments,
  );
}

async function insertSubjectPathSegments(
  userId: string,
  rootKind: CreateSubjectForm["kind"],
  parentSubjectId: string | undefined,
  pathSegments: string[],
): Promise<SubjectMutationResult> {
  let nextParentSubjectId = parentSubjectId;
  let result: SubjectMutationResult = actionError("subjects.invalidData");

  for (const [index, segment] of pathSegments.entries()) {
    result = await insertSubjectForUser(userId, {
      name: segment,
      kind: index === 0 && !nextParentSubjectId ? rootKind : "general",
      parentSubjectId: nextParentSubjectId,
    });
    if (!result.success) return result;
    nextParentSubjectId = result.subjectId;
  }

  return result;
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
    if (isUniqueViolationError(error)) {
      return actionError("subjects.duplicateName");
    }
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

  const attachmentPathnames = await getSubjectAttachmentPathnamesForUser(
    userId,
    data.id,
  );

  await getDb()
    .delete(subject)
    .where(and(eq(subject.id, data.id), eq(subject.userId, userId)));

  await cleanupAttachmentPathnames(userId, attachmentPathnames);

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

    const childCount = await countChildSubjectsForUser(
      userId,
      newParentSubjectId,
    );
    const nestingError = await validateSubjectNesting(
      userId,
      newParentSubjectId,
      childCount,
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
    if (isUniqueViolationError(error)) {
      return actionError("subjects.duplicateName");
    }
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

function getMissingSubjectIds(
  expectedIds: string[],
  records: Array<{ id: string }>,
): string[] {
  const recordIds = new Set(records.map((record) => record.id));

  return expectedIds.filter((id) => !recordIds.has(id));
}

export async function bulkDeleteSubjectsForUser(
  userId: string,
  data: BulkDeleteSubjectsForm,
): Promise<BulkSubjectMutationResult> {
  const existingSubjects = await getSubjectRecordsForUser(userId, data.ids);
  const missingSubjectIds = getMissingSubjectIds(data.ids, existingSubjects);

  if (missingSubjectIds.length > 0) {
    return actionError("subjects.notFound");
  }

  const attachmentPathnames = await Promise.all(
    data.ids.map((id) => getSubjectAttachmentPathnamesForUser(userId, id)),
  );

  await getDb()
    .delete(subject)
    .where(and(inArray(subject.id, data.ids), eq(subject.userId, userId)));

  await cleanupAttachmentPathnames(userId, attachmentPathnames.flat());

  return { success: true, ids: data.ids };
}
