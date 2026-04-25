"use server";

import {
  deleteAssessmentAttachmentForUser,
  deleteEditorImagesForUser,
  type UploadAssessmentAttachmentResult,
  type UploadEditorImageResult,
  uploadAssessmentAttachmentForUser,
  uploadEditorImageForUser,
} from "@/features/attachments/mutations";
import {
  type DeleteAssessmentAttachmentForm,
  type DeleteEditorImagesForm,
  deleteAssessmentAttachmentSchema,
  deleteEditorImagesSchema,
  type UploadAssessmentAttachmentForm,
  type UploadEditorImageForm,
  uploadAssessmentAttachmentSchema,
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

export async function uploadAssessmentAttachment(
  data: UploadAssessmentAttachmentForm,
): Promise<UploadAssessmentAttachmentResult> {
  return runValidatedUserAction(
    uploadAssessmentAttachmentSchema,
    data,
    "attachments.invalidData",
    async (userId, parsedData) =>
      uploadAssessmentAttachmentForUser(userId, parsedData),
  );
}

export async function deleteAssessmentAttachment(
  data: DeleteAssessmentAttachmentForm,
): Promise<{ success: true } | ActionErrorResult> {
  return runValidatedUserAction(
    deleteAssessmentAttachmentSchema,
    data,
    "attachments.invalidData",
    async (userId, parsedData) =>
      deleteAssessmentAttachmentForUser(userId, parsedData),
  );
}
