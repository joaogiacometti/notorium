import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { assessmentAttachment } from "@/db/schema";
import { getAssessmentRecordForUser } from "@/features/assessments/queries";
import { getOwnedAttachmentPathnames } from "@/features/attachments/pathname";
import {
  countAssessmentAttachmentsForUser,
  getAssessmentAttachmentForUser,
} from "@/features/attachments/queries";
import {
  type DeleteAssessmentAttachmentForm,
  type DeleteEditorImagesForm,
  isSupportedAssessmentAttachmentMimeType,
  isSupportedAttachmentImageMimeType,
  type UploadAssessmentAttachmentForm,
  type UploadImageContext,
} from "@/features/attachments/validation";
import { LIMITS } from "@/lib/config/limits";
import { decodeBase64File } from "@/lib/media-storage/decode-base64";
import { optimizeImageForStorage } from "@/lib/media-storage/optimize-image";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";
import type { AssessmentAttachmentEntity } from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { actionError } from "@/lib/server/server-action-errors";

export type UploadAttachmentImageResult =
  | {
      success: true;
      url: string;
      pathname: string;
    }
  | ActionErrorResult;

export type UploadAssessmentAttachmentResult =
  | {
      success: true;
      attachment: AssessmentAttachmentEntity;
    }
  | ActionErrorResult;

function buildAttachmentReadUrl(pathname: string): string {
  return `/api/attachments/blob?pathname=${encodeURIComponent(pathname)}`;
}

export interface UploadAttachmentImageInput {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  context: UploadImageContext;
}

/**
 * Validates, rate-limits, optimizes, and stores an attachment image's raw bytes,
 * returning both its authenticated read URL and the stored blob pathname. Shared
 * by the note/flashcard/mindmap editor-image upload and the occlusion
 * source-image upload, which reach it through the POST /api/attachments/image
 * route handler rather than a Server Action — Server Actions cap request bodies
 * at 1 MB, which even a single phone photo exceeds once transferred.
 *
 * @example
 * await uploadAttachmentImageForUser(userId, {
 *   fileName: "heart.png",
 *   mimeType: "image/png",
 *   bytes,
 *   context: "flashcards",
 * });
 */
export async function uploadAttachmentImageForUser(
  userId: string,
  data: UploadAttachmentImageInput,
): Promise<UploadAttachmentImageResult> {
  if (!isSupportedAttachmentImageMimeType(data.mimeType)) {
    return actionError("attachments.mimeTypeNotAllowed");
  }

  if (data.bytes.byteLength === 0) {
    return actionError("attachments.invalidData");
  }

  if (data.bytes.byteLength > LIMITS.attachmentMaxBytes) {
    return actionError("limits.attachmentSizeLimit", {
      errorParams: { max: LIMITS.attachmentMaxBytes },
    });
  }

  const provider = await getMediaStorageProvider();

  if (!provider) {
    return actionError("attachments.notConfigured");
  }

  const rateLimit = await consumeUserDailyRateLimit({
    prefix: LIMITS.attachmentUploadRateLimitPrefix,
    userId,
    limit: LIMITS.attachmentUploadRateLimitPerDay,
    errorCode: "auth.rateLimited",
  });

  if (rateLimit.limited) {
    return actionError(rateLimit.errorCode);
  }

  const optimized = await optimizeImageForStorage({
    bytes: data.bytes,
    mimeType: data.mimeType,
    fileName: data.fileName,
  });

  try {
    const uploaded = await provider.uploadImage({
      userId,
      context: data.context,
      fileName: optimized.fileName,
      mimeType: optimized.mimeType,
      bytes: optimized.bytes,
    });

    return {
      success: true,
      url: buildAttachmentReadUrl(uploaded.pathname),
      pathname: uploaded.pathname,
    };
  } catch {
    return actionError("attachments.uploadFailed");
  }
}

export async function deleteEditorImagesForUser(
  userId: string,
  data: DeleteEditorImagesForm,
): Promise<{ success: true } | ActionErrorResult> {
  const ownedPathnames = getOwnedAttachmentPathnames(data.pathnames, userId);

  if (ownedPathnames.length !== data.pathnames.length) {
    return actionError("attachments.invalidData");
  }

  const provider = await getMediaStorageProvider();

  if (!provider) {
    return { success: true };
  }

  try {
    await provider.deleteImages({ pathnames: ownedPathnames });
    return { success: true };
  } catch {
    return actionError("attachments.deleteFailed");
  }
}

export async function uploadAssessmentAttachmentForUser(
  userId: string,
  data: UploadAssessmentAttachmentForm,
): Promise<UploadAssessmentAttachmentResult> {
  if (!isSupportedAssessmentAttachmentMimeType(data.mimeType)) {
    return actionError("attachments.mimeTypeNotAllowed");
  }

  const bytes = decodeBase64File(data.dataBase64);

  if (!bytes) {
    return actionError("attachments.invalidData");
  }

  if (bytes.byteLength > LIMITS.assessmentAttachmentMaxBytes) {
    return actionError("limits.attachmentSizeLimit", {
      errorParams: { max: LIMITS.assessmentAttachmentMaxBytes },
    });
  }

  const [existingAssessment, attachmentCount] = await Promise.all([
    getAssessmentRecordForUser(userId, data.assessmentId),
    countAssessmentAttachmentsForUser(userId, data.assessmentId),
  ]);

  if (!existingAssessment) {
    return actionError("assessments.notFound");
  }

  if (attachmentCount >= LIMITS.maxAttachmentsPerAssessment) {
    return actionError("limits.assessmentAttachmentLimit", {
      errorParams: { max: LIMITS.maxAttachmentsPerAssessment },
    });
  }

  const provider = await getMediaStorageProvider();

  if (!provider) {
    return actionError("attachments.notConfigured");
  }

  const rateLimit = await consumeUserDailyRateLimit({
    prefix: LIMITS.attachmentUploadRateLimitPrefix,
    userId,
    limit: LIMITS.attachmentUploadRateLimitPerDay,
    errorCode: "auth.rateLimited",
  });

  if (rateLimit.limited) {
    return actionError(rateLimit.errorCode);
  }

  const optimized = await optimizeImageForStorage({
    bytes,
    mimeType: data.mimeType,
    fileName: data.fileName,
  });

  let uploadedPathname: string | null = null;

  try {
    const uploaded = await provider.uploadFile({
      userId,
      context: "assessments",
      fileName: optimized.fileName,
      mimeType: optimized.mimeType,
      bytes: optimized.bytes,
    });
    uploadedPathname = uploaded.pathname;

    const [attachment] = await getDb()
      .insert(assessmentAttachment)
      .values({
        assessmentId: data.assessmentId,
        userId,
        fileName: optimized.fileName,
        blobPathname: uploaded.pathname,
        mimeType: optimized.mimeType,
        sizeBytes: optimized.bytes.byteLength,
      })
      .returning();

    return { success: true, attachment };
  } catch {
    if (uploadedPathname) {
      await cleanupUploadedAssessmentAttachment(uploadedPathname);
    }

    return actionError("attachments.uploadFailed");
  }
}

async function cleanupUploadedAssessmentAttachment(
  pathname: string,
): Promise<boolean> {
  const provider = await getMediaStorageProvider();

  if (!provider) {
    return false;
  }

  try {
    await provider.deleteFiles({ pathnames: [pathname] });
    return true;
  } catch {
    return false;
  }
}

export async function deleteAssessmentAttachmentForUser(
  userId: string,
  data: DeleteAssessmentAttachmentForm,
): Promise<{ success: true } | ActionErrorResult> {
  const existing = await getAssessmentAttachmentForUser(userId, data.id);

  if (!existing) {
    return actionError("attachments.notFound");
  }

  const deletedFile = await cleanupUploadedAssessmentAttachment(
    existing.blobPathname,
  );

  if (!deletedFile) {
    return actionError("attachments.deleteFailed");
  }

  await getDb()
    .delete(assessmentAttachment)
    .where(
      and(
        eq(assessmentAttachment.id, data.id),
        eq(assessmentAttachment.userId, userId),
      ),
    );

  return { success: true };
}
