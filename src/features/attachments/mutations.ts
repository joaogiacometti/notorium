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
  type UploadEditorImageForm,
  type UploadFlashcardOcclusionImageForm,
} from "@/features/attachments/validation";
import { LIMITS } from "@/lib/config/limits";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";
import type { AssessmentAttachmentEntity } from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { actionError } from "@/lib/server/server-action-errors";

export type UploadEditorImageResult =
  | {
      success: true;
      url: string;
    }
  | ActionErrorResult;

export type UploadOcclusionImageResult =
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

function normalizeBase64Payload(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (!trimmed.startsWith("data:")) {
    return trimmed;
  }

  const commaIndex = trimmed.indexOf(",");
  if (commaIndex < 0 || commaIndex + 1 >= trimmed.length) {
    return null;
  }

  return trimmed.slice(commaIndex + 1);
}

function decodeBase64Image(value: string): Uint8Array | null {
  const payload = normalizeBase64Payload(value);

  if (!payload) {
    return null;
  }

  const normalized = payload.replaceAll(/\s+/g, "");

  if (normalized.length === 0 || normalized.length % 4 !== 0) {
    return null;
  }

  if (!/^[A-Za-z0-9+/]+=*$/.test(normalized)) {
    return null;
  }

  try {
    const decoded = Buffer.from(normalized, "base64");

    if (decoded.byteLength === 0) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

type UploadImageContext = "notes" | "flashcards" | "mindmaps";

// Shared upload core for editor and occlusion images: validates, rate-limits,
// and stores the bytes, returning both the read URL and the raw pathname.
async function uploadAttachmentImageBytes(
  userId: string,
  data: {
    fileName: string;
    mimeType: string;
    dataBase64: string;
    context: UploadImageContext;
  },
): Promise<
  { success: true; url: string; pathname: string } | ActionErrorResult
> {
  if (!isSupportedAttachmentImageMimeType(data.mimeType)) {
    return actionError("attachments.mimeTypeNotAllowed");
  }

  const bytes = decodeBase64Image(data.dataBase64);

  if (!bytes) {
    return actionError("attachments.invalidData");
  }

  if (bytes.byteLength > LIMITS.attachmentMaxBytes) {
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

  try {
    const uploaded = await provider.uploadImage({
      userId,
      context: data.context,
      fileName: data.fileName,
      mimeType: data.mimeType,
      bytes,
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

export async function uploadEditorImageForUser(
  userId: string,
  data: UploadEditorImageForm,
): Promise<UploadEditorImageResult> {
  const result = await uploadAttachmentImageBytes(userId, data);
  return result.success ? { success: true, url: result.url } : result;
}

/**
 * Uploads an image occlusion source image, returning its blob pathname so the
 * card can persist it. Stored under the shared "flashcards" attachment context.
 *
 * @example
 * await uploadFlashcardOcclusionImageForUser(userId, {
 *   fileName: "heart.png",
 *   mimeType: "image/png",
 *   dataBase64,
 * });
 */
export async function uploadFlashcardOcclusionImageForUser(
  userId: string,
  data: UploadFlashcardOcclusionImageForm,
): Promise<UploadOcclusionImageResult> {
  return uploadAttachmentImageBytes(userId, { ...data, context: "flashcards" });
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

  const bytes = decodeBase64Image(data.dataBase64);

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

  let uploadedPathname: string | null = null;

  try {
    const uploaded = await provider.uploadFile({
      userId,
      context: "assessments",
      fileName: data.fileName,
      mimeType: data.mimeType,
      bytes,
    });
    uploadedPathname = uploaded.pathname;

    const [attachment] = await getDb()
      .insert(assessmentAttachment)
      .values({
        assessmentId: data.assessmentId,
        userId,
        fileName: data.fileName,
        blobPathname: uploaded.pathname,
        mimeType: data.mimeType,
        sizeBytes: bytes.byteLength,
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
