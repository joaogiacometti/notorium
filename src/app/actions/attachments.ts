"use server";

import {
  deleteAssessmentAttachmentForUser,
  deleteEditorImagesForUser,
  type UploadAssessmentAttachmentResult,
  type UploadEditorImageResult,
  type UploadOcclusionImageResult,
  uploadAssessmentAttachmentForUser,
  uploadEditorImageForUser,
  uploadFlashcardOcclusionImageForUser,
} from "@/features/attachments/mutations";
import {
  type DeleteAssessmentAttachmentForm,
  type DeleteEditorImagesForm,
  deleteAssessmentAttachmentSchema,
  deleteEditorImagesSchema,
  type UploadAssessmentAttachmentForm,
  type UploadEditorImageForm,
  type UploadFlashcardOcclusionImageForm,
  uploadAssessmentAttachmentSchema,
  uploadEditorImageSchema,
  uploadFlashcardOcclusionImageSchema,
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

export async function uploadFlashcardOcclusionImage(
  data: UploadFlashcardOcclusionImageForm,
): Promise<UploadOcclusionImageResult> {
  return runValidatedUserAction(
    uploadFlashcardOcclusionImageSchema,
    data,
    "attachments.invalidData",
    async (userId, parsedData) =>
      uploadFlashcardOcclusionImageForUser(userId, parsedData),
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
