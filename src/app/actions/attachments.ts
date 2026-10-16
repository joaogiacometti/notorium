"use server";

import {
  deleteAssessmentAttachmentForUser,
  deleteEditorImagesForUser,
  type UploadAssessmentAttachmentResult,
  uploadAssessmentAttachmentForUser,
} from "@/features/attachments/mutations";
import {
  type DeleteAssessmentAttachmentForm,
  type DeleteEditorImagesForm,
  deleteAssessmentAttachmentSchema,
  deleteEditorImagesSchema,
  type UploadAssessmentAttachmentForm,
  uploadAssessmentAttachmentSchema,
} from "@/features/attachments/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

// Image uploads (editor and mindmap images) intentionally have no
// Server Action: they transfer raw bytes through the POST /api/attachments/image
// route handler instead, because Server Actions cap request bodies at 1 MB.

export async function deleteEditorImages(
  data: DeleteEditorImagesForm,
): Promise<{ success: true } | ActionErrorResult> {
  return runValidatedUserAction(
    "attachments.deleteEditorImages",
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
    "attachments.uploadAssessmentAttachment",
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
    "attachments.deleteAssessmentAttachment",
    deleteAssessmentAttachmentSchema,
    data,
    "attachments.invalidData",
    async (userId, parsedData) =>
      deleteAssessmentAttachmentForUser(userId, parsedData),
  );
}
