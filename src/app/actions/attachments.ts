"use server";

import {
  deleteEditorImagesForUser,
  type UploadEditorImageResult,
  uploadEditorImageForUser,
} from "@/features/attachments/mutations";
import {
  type DeleteEditorImagesForm,
  deleteEditorImagesSchema,
  type UploadEditorImageForm,
  uploadEditorImageSchema,
} from "@/features/attachments/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export async function uploadEditorImage(
  data: UploadEditorImageForm,
): Promise<UploadEditorImageResult> {
  return runValidatedUserAction(
    uploadEditorImageSchema,
    data,
    "attachments.invalidData",
    async (userId, parsedData) => uploadEditorImageForUser(userId, parsedData),
  );
}

export async function deleteEditorImages(
  data: DeleteEditorImagesForm,
): Promise<{ success: true } | ActionErrorResult> {
  return runValidatedUserAction(
    deleteEditorImagesSchema,
    data,
    "attachments.invalidData",
    async (userId, parsedData) => deleteEditorImagesForUser(userId, parsedData),
  );
}
