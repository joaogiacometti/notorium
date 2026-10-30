import { getAttachmentReadUrl } from "@/features/attachments/pathname";
import {
  isSupportedAttachmentImageMimeType,
  type UploadImageContext,
} from "@/features/attachments/validation";
import { LIMITS } from "@/lib/config/limits";
import { optimizeImageForStorage } from "@/lib/media-storage/optimize-image";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { actionError } from "@/lib/server/server-action-errors";

export type UploadAttachmentImageResult =
  | {
      success: true;
      url: string;
      pathname: string;
    }
  | ActionErrorResult;

export interface UploadAttachmentImageInput {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  context: UploadImageContext;
}

/**
 * Validates, optimizes, and stores an attachment image's raw bytes,
 * returning both its authenticated read URL and the stored blob pathname. Shared
 * by note and flashcard editor-image uploads, which reach it through the
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
      url: getAttachmentReadUrl(uploaded.pathname),
      pathname: uploaded.pathname,
    };
  } catch {
    return actionError("attachments.uploadFailed");
  }
}
