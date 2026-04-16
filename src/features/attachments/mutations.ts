import { getOwnedAttachmentPathnames } from "@/features/attachments/pathname";
import {
  type DeleteEditorImagesForm,
  isSupportedAttachmentImageMimeType,
  type UploadEditorImageForm,
} from "@/features/attachments/validation";
import { LIMITS } from "@/lib/config/limits";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { actionError } from "@/lib/server/server-action-errors";

export type UploadEditorImageResult =
  | {
      success: true;
      url: string;
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

export async function uploadEditorImageForUser(
  userId: string,
  data: UploadEditorImageForm,
): Promise<UploadEditorImageResult> {
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
