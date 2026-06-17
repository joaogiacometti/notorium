"use server";

import { revalidatePath } from "next/cache";
import {
  type CreateMindmapMutationResult,
  createMindmapForUser,
  deleteMindmapForUser,
  editMindmapForUser,
  editMindmapTitleForUser,
  type MindmapMutationResult,
} from "@/features/mindmaps/mutations";
import { getMindmapByIdForUser } from "@/features/mindmaps/queries";
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
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { MindmapEntity } from "@/lib/server/api-contracts";

function revalidateSubject(subjectId: string) {
  revalidatePath(`/subjects/${subjectId}`);
}

export async function getMindmapById(
  id: string,
): Promise<MindmapEntity | null> {
  const userId = await getAuthenticatedUserId();
  return getMindmapByIdForUser(userId, id);
}

export async function createMindmap(
  data: CreateMindmapForm,
): Promise<CreateMindmapMutationResult> {
  const result = await runValidatedUserAction(
    createMindmapSchema,
    data,
    "mindmaps.invalidData",
    async (userId, parsedData) => createMindmapForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateSubject(result.subjectId);
  }

  return result;
}

export async function editMindmap(
  data: EditMindmapForm,
): Promise<MindmapMutationResult> {
  const result = await runValidatedUserAction(
    editMindmapSchema,
    data,
    "mindmaps.invalidData",
    async (userId, parsedData) => editMindmapForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateSubject(result.subjectId);
    revalidatePath(
      `/subjects/${result.subjectId}/documents/mindmaps/${data.id}`,
    );
  }

  return result;
}

export async function editMindmapTitle(
  data: EditMindmapTitleForm,
): Promise<MindmapMutationResult> {
  const result = await runValidatedUserAction(
    editMindmapTitleSchema,
    data,
    "mindmaps.invalidData",
    async (userId, parsedData) => editMindmapTitleForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateSubject(result.subjectId);
    revalidatePath(
      `/subjects/${result.subjectId}/documents/mindmaps/${data.id}`,
    );
  }

  return result;
}

export async function deleteMindmap(
  data: DeleteMindmapForm,
): Promise<MindmapMutationResult> {
  const result = await runValidatedUserAction(
    deleteMindmapSchema,
    data,
    "mindmaps.invalidData",
    async (userId, parsedData) => deleteMindmapForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateSubject(result.subjectId);
  }

  return result;
}
