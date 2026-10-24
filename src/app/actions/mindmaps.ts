"use server";

import {
  type CreateMindmapMutationResult,
  createMindmapForUser,
  deleteMindmapForUser,
  editMindmapForUser,
  editMindmapTitleForUser,
  type MindmapMutationResult,
} from "@/features/mindmaps/mutations";
import {
  type CreateMindmapForm,
  createMindmapSchema,
  type DeleteMindmapForm,
  deleteMindmapSchema,
  type EditMindmapForm,
  type EditMindmapTitleForm,
  editMindmapSchema,
  editMindmapTitleSchema,
} from "@/features/mindmaps/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import {
  revalidateAppShell,
  revalidateDocumentPage,
} from "@/lib/server/revalidate-views";

export async function createMindmap(
  data: CreateMindmapForm,
): Promise<CreateMindmapMutationResult> {
  const result = await runValidatedUserAction(
    "mindmaps.createMindmap",
    createMindmapSchema,
    data,
    "mindmaps.invalidData",
    async (userId, parsedData) => createMindmapForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}

export async function editMindmap(
  data: EditMindmapForm,
): Promise<MindmapMutationResult> {
  const result = await runValidatedUserAction(
    "mindmaps.editMindmap",
    editMindmapSchema,
    data,
    "mindmaps.invalidData",
    async (userId, parsedData) => editMindmapForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateDocumentPage("mindmaps", result.subjectId, data.id);
  }

  return result;
}

export async function editMindmapTitle(
  data: EditMindmapTitleForm,
): Promise<MindmapMutationResult> {
  const result = await runValidatedUserAction(
    "mindmaps.editMindmapTitle",
    editMindmapTitleSchema,
    data,
    "mindmaps.invalidData",
    async (userId, parsedData) => editMindmapTitleForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateDocumentPage("mindmaps", result.subjectId, data.id);
  }

  return result;
}

export async function deleteMindmap(
  data: DeleteMindmapForm,
): Promise<MindmapMutationResult> {
  const result = await runValidatedUserAction(
    "mindmaps.deleteMindmap",
    deleteMindmapSchema,
    data,
    "mindmaps.invalidData",
    async (userId, parsedData) => deleteMindmapForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateAppShell();
  }

  return result;
}
