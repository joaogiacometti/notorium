"use server";

import {
  createFolderForUser,
  deleteFolderForUser,
  editFolderForUser,
  type FolderMutationResult,
  moveFolderForUser,
} from "@/features/folders/mutations";
import {
  type CreateFolderForm,
  createFolderSchema,
  type DeleteFolderForm,
  deleteFolderSchema,
  type EditFolderForm,
  editFolderSchema,
  type MoveFolderForm,
  moveFolderSchema,
} from "@/features/folders/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  MoveFolderResult,
  MutationResult,
} from "@/lib/server/api-contracts";
import { revalidateAppShell } from "@/lib/server/revalidate-views";

export async function createFolder(
  data: CreateFolderForm,
): Promise<FolderMutationResult> {
  const result = await runValidatedUserAction(
    "folders.createFolder",
    createFolderSchema,
    data,
    "folders.invalidData",
    async (userId, parsedData) => createFolderForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}

export async function moveFolder(
  data: MoveFolderForm,
): Promise<MoveFolderResult> {
  const result = await runValidatedUserAction(
    "folders.moveFolder",
    moveFolderSchema,
    data,
    "folders.invalidData",
    async (userId, parsedData) => moveFolderForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}

export async function editFolder(
  data: EditFolderForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    "folders.editFolder",
    editFolderSchema,
    data,
    "folders.invalidData",
    async (userId, parsedData) => editFolderForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}

export async function deleteFolder(
  data: DeleteFolderForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    "folders.deleteFolder",
    deleteFolderSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => deleteFolderForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}
