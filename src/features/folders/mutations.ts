import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { folder } from "@/db/schema";
import {
  insertFolderRow,
  resolveFolderUniqueError,
} from "@/features/folders/folder-write";
import { createFolderPathForUser } from "@/features/folders/path-mutations";
import {
  countChildFoldersForUser,
  countTotalFoldersForUser,
  getFolderDepthForUser,
  getFolderRecordForUser,
  getFolderSubtreeHeightForUser,
  getFolderTreeRecordForUser,
  isFolderAncestorOf,
} from "@/features/folders/queries";
import type {
  CreateFolderForm,
  DeleteFolderForm,
  EditFolderForm,
  MoveFolderForm,
} from "@/features/folders/validation";
import { LIMITS } from "@/lib/config/limits";
import type { MoveFolderResult } from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

type FolderMoveTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export type FolderMutationResult =
  | {
      success: true;
      folderId?: string;
    }
  | ActionErrorResult;

function getFolderMutationValues(values: Pick<CreateFolderForm, "name">) {
  return {
    name: values.name.trim(),
  };
}

function getFolderPathSegments(name: string): string[] {
  return name.split("::").map((segment) => segment.trim());
}

/**
 * Validates that a folder can be nested under `parentFolderId`: the parent
 * exists, has room for another child, and is not already at the depth cap.
 * Shared by create and move. Returns an error result, or null when valid.
 */
async function validateFolderNesting(
  userId: string,
  parentFolderId: string,
  childCount: number,
  nestedDepth = 1,
  executor: Pick<ReturnType<typeof getDb>, "select" | "execute"> = getDb(),
): Promise<ActionErrorResult | null> {
  const [parent, parentDepth] = await Promise.all([
    getFolderTreeRecordForUser(userId, parentFolderId, executor),
    getFolderDepthForUser(userId, parentFolderId, executor),
  ]);

  if (!parent) {
    return actionError("folders.notFound");
  }

  if (childCount >= LIMITS.maxChildFoldersPerFolder) {
    return actionError("limits.childFolderLimit", {
      errorParams: { max: LIMITS.maxChildFoldersPerFolder },
    });
  }

  if (
    parentDepth !== null &&
    parentDepth + nestedDepth > LIMITS.maxFolderNestingDepth
  ) {
    return actionError("limits.folderNestingDepthLimit", {
      errorParams: { max: LIMITS.maxFolderNestingDepth },
    });
  }

  return null;
}

async function insertFolderForUser(
  userId: string,
  data: CreateFolderForm,
): Promise<FolderMutationResult> {
  try {
    const folderId = await insertFolderRow(getDb(), userId, data);
    return { success: true, folderId };
  } catch (error) {
    const insertError = resolveFolderUniqueError(error);
    if (insertError) return insertError;
    throw error;
  }
}

export async function createFolderForUser(
  userId: string,
  data: CreateFolderForm,
): Promise<FolderMutationResult> {
  const pathSegments = getFolderPathSegments(data.name);
  if (pathSegments.some((segment) => segment.length === 0)) {
    return actionError("folders.invalidData");
  }
  if (pathSegments.length > 1) {
    return createFolderPathForUser(userId, data, pathSegments);
  }

  const [totalCount, childCount] = await Promise.all([
    countTotalFoldersForUser(userId),
    data.parentFolderId
      ? countChildFoldersForUser(userId, data.parentFolderId)
      : Promise.resolve(0),
  ]);

  if (totalCount >= LIMITS.maxFolders) {
    return actionError("limits.folderLimit", {
      errorParams: { max: LIMITS.maxFolders },
    });
  }

  if (data.parentFolderId) {
    const nestingError = await validateFolderNesting(
      userId,
      data.parentFolderId,
      childCount,
    );
    if (nestingError) {
      return nestingError;
    }
  }

  return insertFolderForUser(userId, data);
}

export async function editFolderForUser(
  userId: string,
  data: EditFolderForm,
): Promise<FolderMutationResult> {
  const existing = await getFolderRecordForUser(userId, data.id);

  if (!existing) {
    return actionError("folders.notFound");
  }

  try {
    await getDb()
      .update(folder)
      .set(getFolderMutationValues(data))
      .where(and(eq(folder.id, data.id), eq(folder.userId, userId)));
  } catch (error) {
    const insertError = resolveFolderUniqueError(error);
    if (insertError) return insertError;
    throw error;
  }

  return { success: true, folderId: data.id };
}

export async function deleteFolderForUser(
  userId: string,
  data: DeleteFolderForm,
): Promise<FolderMutationResult> {
  const existing = await getFolderRecordForUser(userId, data.id);

  if (!existing) {
    return actionError("folders.notFound");
  }

  await getDb()
    .delete(folder)
    .where(and(eq(folder.id, data.id), eq(folder.userId, userId)));

  return { success: true };
}

async function moveFolderInTransaction(
  userId: string,
  values: MoveFolderForm,
  transaction: FolderMoveTransaction,
): Promise<MoveFolderResult> {
  const existing = await getFolderTreeRecordForUser(
    userId,
    values.id,
    transaction,
  );
  if (!existing) return actionError("folders.notFound");
  const newParentFolderId = values.parentFolderId ?? null;
  const result = folderMoveSuccess(
    values.id,
    existing.parentFolderId,
    newParentFolderId,
  );
  if (newParentFolderId === existing.parentFolderId) return result;
  const validationError =
    newParentFolderId === null
      ? null
      : await validateFolderReparenting(
          userId,
          values.id,
          newParentFolderId,
          transaction,
        );
  if (validationError) return validationError;
  return persistFolderMove(userId, values, transaction, result);
}

function folderMoveSuccess(
  id: string,
  previousParentFolderId: string | null,
  newParentFolderId: string | null,
): Extract<MoveFolderResult, { success: true }> {
  return { success: true, id, previousParentFolderId, newParentFolderId };
}

async function validateFolderReparenting(
  userId: string,
  folderId: string,
  parentFolderId: string,
  transaction: FolderMoveTransaction,
): Promise<ActionErrorResult | null> {
  const cycleError = await validateFolderMoveTarget(
    userId,
    folderId,
    parentFolderId,
    transaction,
  );
  if (cycleError) return cycleError;
  const [childCount, subtreeHeight] = await Promise.all([
    countChildFoldersForUser(userId, parentFolderId, transaction),
    getFolderSubtreeHeightForUser(userId, folderId, transaction),
  ]);
  return validateFolderNesting(
    userId,
    parentFolderId,
    childCount,
    subtreeHeight,
    transaction,
  );
}

async function persistFolderMove(
  userId: string,
  values: MoveFolderForm,
  transaction: FolderMoveTransaction,
  result: Extract<MoveFolderResult, { success: true }>,
): Promise<MoveFolderResult> {
  try {
    await transaction
      .update(folder)
      .set({ parentFolderId: values.parentFolderId ?? null })
      .where(and(eq(folder.id, values.id), eq(folder.userId, userId)));
    return result;
  } catch (error) {
    const uniqueError = resolveFolderUniqueError(error);
    if (uniqueError) return uniqueError;
    throw error;
  }
}

/**
 * Guards a move target against self-parenting and cycles (moving a folder
 * into one of its own descendants). Returns an error result, or null.
 */
async function validateFolderMoveTarget(
  userId: string,
  folderId: string,
  newParentFolderId: string,
  transaction: FolderMoveTransaction,
): Promise<ActionErrorResult | null> {
  if (newParentFolderId === folderId) {
    return actionError("folders.cannotMoveIntoSelf");
  }

  const wouldCreateCycle = await isFolderAncestorOf(
    userId,
    folderId,
    newParentFolderId,
    transaction,
  );
  if (wouldCreateCycle) {
    return actionError("folders.wouldCreateCycle");
  }

  return null;
}

/** Prevents concurrent moves from validating against the same stale hierarchy. */
export async function moveFolderForUser(
  userId: string,
  values: MoveFolderForm,
): Promise<MoveFolderResult> {
  return getDb().transaction(
    async (transaction) => {
      await transaction.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`folder-move:${userId}`}, 0))`,
      );
      return moveFolderInTransaction(userId, values, transaction);
    },
    // Reads after a lock wait must see the preceding move's committed hierarchy.
    { isolationLevel: "read committed" },
  );
}
