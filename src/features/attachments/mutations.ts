import { getOwnedAttachmentPathnames } from "@/features/attachments/pathname";
import {
  type DeleteEditorImagesForm,
  isSupportedAttachmentImageMimeType,
  type UploadImageContext,
} from "@/features/attachments/validation";
import { LIMITS } from "@/lib/config/limits";
import { optimizeImageForStorage } from "@/lib/media-storage/optimize-image";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { actionError } from "@/lib/server/server-action-errors";

export type UploadAttachmentImageResult =
  | {
      success: true;
      url: string;
      pathname: string;
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
 * by the note/flashcard/mindmap editor-image uploads, which reach it through the
 * POST /api/attachments/image route handler rather than a Server Action — Server Actions cap request bodies
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
