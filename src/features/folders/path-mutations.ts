import { getDb } from "@/db/index";
import {
  insertFolderRow,
  resolveFolderUniqueError,
} from "@/features/folders/folder-write";
import type { FolderMutationResult } from "@/features/folders/mutations";
import {
  countChildFoldersForUser,
  countTotalFoldersForUser,
  getAllFoldersWithPathsForUser,
  getFolderDepthForUser,
  getFolderTreeRecordForUser,
} from "@/features/folders/queries";
import type { CreateFolderForm } from "@/features/folders/validation";
import { LIMITS } from "@/lib/config/limits";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

type FolderOptions = Awaited<ReturnType<typeof getAllFoldersWithPathsForUser>>;

interface ExistingPathPrefix {
  id: string;
  segmentCount: number;
}

function findLongestExistingPathPrefix(
  pathSegments: string[],
  folders: FolderOptions,
  basePath?: string,
): ExistingPathPrefix | null {
  for (let index = pathSegments.length; index > 0; index -= 1) {
    const relativePath = pathSegments.slice(0, index).join("::");
    const path = basePath ? `${basePath}::${relativePath}` : relativePath;
    const match = folders.find((folderOption) => folderOption.path === path);
    if (match) return { id: match.id, segmentCount: index };
  }

  return null;
}

async function validatePathParent(
  userId: string,
  parentFolderId: string,
  missingFolderCount: number,
): Promise<ActionErrorResult | null> {
  const [parent, parentDepth, childCount] = await Promise.all([
    getFolderTreeRecordForUser(userId, parentFolderId),
    getFolderDepthForUser(userId, parentFolderId),
    countChildFoldersForUser(userId, parentFolderId),
  ]);

  if (!parent) return actionError("folders.notFound");
  if (childCount >= LIMITS.maxChildFoldersPerFolder) {
    return actionError("limits.childFolderLimit", {
      errorParams: { max: LIMITS.maxChildFoldersPerFolder },
    });
  }
  if (
    parentDepth !== null &&
    parentDepth + missingFolderCount > LIMITS.maxFolderNestingDepth
  ) {
    return actionError("limits.folderNestingDepthLimit", {
      errorParams: { max: LIMITS.maxFolderNestingDepth },
    });
  }

  return null;
}

async function validatePathCreate(
  userId: string,
  parentFolderId: string | undefined,
  missingFolderCount: number,
): Promise<ActionErrorResult | null> {
  const totalCount = await countTotalFoldersForUser(userId);
  if (totalCount + missingFolderCount > LIMITS.maxFolders) {
    return actionError("limits.folderLimit", {
      errorParams: { max: LIMITS.maxFolders },
    });
  }
  if (parentFolderId) {
    return validatePathParent(userId, parentFolderId, missingFolderCount);
  }
  return missingFolderCount > LIMITS.maxFolderNestingDepth
    ? actionError("limits.folderNestingDepthLimit", {
        errorParams: { max: LIMITS.maxFolderNestingDepth },
      })
    : null;
}

async function insertPathSegments(
  userId: string,
  data: CreateFolderForm,
  parentFolderId: string | undefined,
  pathSegments: string[],
): Promise<string> {
  return getDb().transaction(async (transaction) => {
    let nextParentFolderId = parentFolderId;

    for (const segment of pathSegments) {
      nextParentFolderId = await insertFolderRow(transaction, userId, {
        name: segment,
        parentFolderId: nextParentFolderId,
      });
    }

    if (!nextParentFolderId) {
      throw new Error(
        `Folder path ${data.name} for user ${userId} produced no leaf id; expected at least one path segment.`,
      );
    }
    return nextParentFolderId;
  });
}

function getSelectedParent(data: CreateFolderForm, folders: FolderOptions) {
  if (!data.parentFolderId) return undefined;
  return folders.find(
    (folderOption) => folderOption.id === data.parentFolderId,
  );
}

/**
 * Creates a multi-segment folder path atomically, relative to an optional
 * selected parent.
 *
 * @example await createFolderPathForUser(userId, data, ["Math", "Calculus"]);
 */
export async function createFolderPathForUser(
  userId: string,
  data: CreateFolderForm,
  pathSegments: string[],
): Promise<FolderMutationResult> {
  const folders = await getAllFoldersWithPathsForUser(userId);
  const selectedParent = getSelectedParent(data, folders);
  if (data.parentFolderId && !selectedParent) {
    return actionError("folders.notFound");
  }

  const existingPrefix = findLongestExistingPathPrefix(
    pathSegments,
    folders,
    selectedParent?.path,
  );
  if (existingPrefix?.segmentCount === pathSegments.length) {
    return actionError("folders.duplicateName");
  }

  const missingSegments = pathSegments.slice(existingPrefix?.segmentCount ?? 0);
  const parentFolderId = existingPrefix?.id ?? selectedParent?.id;
  const validationError = await validatePathCreate(
    userId,
    parentFolderId,
    missingSegments.length,
  );
  if (validationError) return validationError;

  try {
    const folderId = await insertPathSegments(
      userId,
      data,
      parentFolderId,
      missingSegments,
    );
    return { success: true, folderId };
  } catch (error) {
    const insertError = resolveFolderUniqueError(error);
    if (insertError) return insertError;
    throw error;
  }
}
