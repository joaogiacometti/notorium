"use client";

import {
  deleteAssessmentAttachment,
  uploadAssessmentAttachment,
} from "@/app/actions/attachments";
import type { AssessmentAttachmentEntity } from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

type UploadAssessmentFilesResult =
  | {
      success: true;
      attachments: AssessmentAttachmentEntity[];
      completedFileCount: number;
    }
  | (ActionErrorResult & {
      attachments: AssessmentAttachmentEntity[];
      completedFileCount: number;
    });

function readFileAsBase64(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => resolve(null);
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        resolve(null);
        return;
      }

      const commaIndex = reader.result.indexOf(",");
      resolve(commaIndex >= 0 ? reader.result.slice(commaIndex + 1) : null);
    };

    reader.readAsDataURL(file);
  });
}

export async function uploadAssessmentFiles(
  assessmentId: string,
  files: File[],
): Promise<UploadAssessmentFilesResult> {
  const attachments: AssessmentAttachmentEntity[] = [];

  for (const file of files) {
    const dataBase64 = await readFileAsBase64(file);

    if (!dataBase64) {
      return {
        success: false,
        errorCode: "attachments.uploadFailed",
        errorParams: undefined,
        errorMessage: undefined,
        attachments,
        completedFileCount: attachments.length,
      };
    }

    const result = await uploadAssessmentAttachment({
      assessmentId,
      fileName: file.name,
      mimeType: file.type,
      dataBase64,
    });

    if (!result.success) {
      return {
        ...result,
        attachments,
        completedFileCount: attachments.length,
      };
    }

    attachments.push(result.attachment);
  }

  return { success: true, attachments, completedFileCount: files.length };
}

export async function deleteAssessmentFiles(
  attachmentIds: string[],
): Promise<{ success: true } | ActionErrorResult> {
  for (const id of attachmentIds) {
    const result = await deleteAssessmentAttachment({ id });

    if (!result.success) {
      return result;
    }
  }

  return { success: true };
}
