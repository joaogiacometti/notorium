import type { getDb } from "@/db/index";
import { folder } from "@/db/schema";
import { isUniqueViolationError } from "@/lib/db/errors";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

type FolderInsertExecutor = Pick<ReturnType<typeof getDb>, "insert">;

export interface FolderInsertData {
  name: string;
  parentFolderId?: string;
}

/**
 * Inserts one owned folder and returns its required identifier.
 *
 * @example await insertFolderRow(db, userId, { name: "Math" });
 */
export async function insertFolderRow(
  executor: FolderInsertExecutor,
  userId: string,
  input: FolderInsertData,
): Promise<string> {
  const [inserted] = await executor
    .insert(folder)
    .values({
      name: input.name.trim(),
      parentFolderId: input.parentFolderId ?? null,
      userId,
    })
    .returning({ id: folder.id });

  if (!inserted) {
    throw new Error(
      `Folder insert for user ${userId} and name ${input.name} returned no id; expected one inserted folder row.`,
    );
  }

  return inserted.id;
}

/**
 * Maps a folder-name constraint failure to the public duplicate error.
 *
 * @example resolveFolderUniqueError({ code: "23505" });
 */
export function resolveFolderUniqueError(
  error: unknown,
): ActionErrorResult | null {
  return isUniqueViolationError(error)
    ? actionError("folders.duplicateName")
    : null;
}
