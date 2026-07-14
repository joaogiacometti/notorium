import { getDb } from "@/db/index";
import type { SubjectMutationResult } from "@/features/subjects/mutations";
import {
  countChildSubjectsForUser,
  countTotalSubjectsForUser,
  getAllSubjectsWithPathsForUser,
  getSubjectDepthForUser,
  getSubjectTreeRecordForUser,
} from "@/features/subjects/queries";
import {
  insertSubjectRow,
  resolveSubjectUniqueError,
} from "@/features/subjects/subject-write";
import type { CreateSubjectForm } from "@/features/subjects/validation";
import { LIMITS } from "@/lib/config/limits";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

type SubjectOptions = Awaited<
  ReturnType<typeof getAllSubjectsWithPathsForUser>
>;

interface ExistingPathPrefix {
  id: string;
  segmentCount: number;
}

function findLongestExistingPathPrefix(
  pathSegments: string[],
  subjects: SubjectOptions,
  basePath?: string,
): ExistingPathPrefix | null {
  for (let index = pathSegments.length; index > 0; index -= 1) {
    const relativePath = pathSegments.slice(0, index).join("::");
    const path = basePath ? `${basePath}::${relativePath}` : relativePath;
    const match = subjects.find((subjectOption) => subjectOption.path === path);
    if (match) return { id: match.id, segmentCount: index };
  }

  return null;
}

async function validatePathParent(
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

async function validatePathCreate(
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
    return validatePathParent(userId, parentSubjectId, missingSubjectCount);
  }
  return missingSubjectCount > LIMITS.maxSubjectNestingDepth
    ? actionError("limits.subjectNestingDepthLimit", {
        errorParams: { max: LIMITS.maxSubjectNestingDepth },
      })
    : null;
}

async function insertPathSegments(
  userId: string,
  data: CreateSubjectForm,
  parentSubjectId: string | undefined,
  pathSegments: string[],
): Promise<string> {
  return getDb().transaction(async (transaction) => {
    let nextParentSubjectId = parentSubjectId;

    for (const [index, segment] of pathSegments.entries()) {
      nextParentSubjectId = await insertSubjectRow(transaction, userId, {
        name: segment,
        kind: index === pathSegments.length - 1 ? data.kind : "general",
        parentSubjectId: nextParentSubjectId,
      });
    }

    if (!nextParentSubjectId) {
      throw new Error(
        `Subject path ${data.name} for user ${userId} produced no leaf id; expected at least one path segment.`,
      );
    }
    return nextParentSubjectId;
  });
}

function getSelectedParent(data: CreateSubjectForm, subjects: SubjectOptions) {
  if (!data.parentSubjectId) return undefined;
  return subjects.find(
    (subjectOption) => subjectOption.id === data.parentSubjectId,
  );
}

/**
 * Creates a multi-segment subject path atomically, relative to an optional
 * selected parent. Intermediate segments are general; the leaf keeps its kind.
 *
 * @example await createSubjectPathForUser(userId, data, ["Math", "Calculus"]);
 */
export async function createSubjectPathForUser(
  userId: string,
  data: CreateSubjectForm,
  pathSegments: string[],
): Promise<SubjectMutationResult> {
  const subjects = await getAllSubjectsWithPathsForUser(userId);
  const selectedParent = getSelectedParent(data, subjects);
  if (data.parentSubjectId && !selectedParent) {
    return actionError("subjects.notFound");
  }

  const existingPrefix = findLongestExistingPathPrefix(
    pathSegments,
    subjects,
    selectedParent?.path,
  );
  if (existingPrefix?.segmentCount === pathSegments.length) {
    return actionError("subjects.duplicateName");
  }

  const missingSegments = pathSegments.slice(existingPrefix?.segmentCount ?? 0);
  const parentSubjectId = existingPrefix?.id ?? selectedParent?.id;
  const validationError = await validatePathCreate(
    userId,
    parentSubjectId,
    missingSegments.length,
  );
  if (validationError) return validationError;

  try {
    const subjectId = await insertPathSegments(
      userId,
      data,
      parentSubjectId,
      missingSegments,
    );
    return { success: true, subjectId };
  } catch (error) {
    const insertError = resolveSubjectUniqueError(error);
    if (insertError) return insertError;
    throw error;
  }
}
