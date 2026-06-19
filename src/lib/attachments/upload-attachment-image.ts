"use client";

import type { UploadImageContext } from "@/features/attachments/validation";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export type UploadAttachmentImageResponse =
  | { success: true; url: string; pathname: string }
  | ActionErrorResult;

/**
 * Uploads one image to the attachment store through the POST
 * /api/attachments/image route handler using multipart FormData, returning the
 * stored read URL and blob pathname. Used instead of a Server Action because
 * Server Actions cap request bodies at 1 MB, which even a single phone photo
 * exceeds once transferred; FormData also carries raw binary with no base64
 * inflation. Never throws — network and parse failures resolve to an error
 * result the caller surfaces with `t(result.errorCode, result.errorParams)`.
 *
 * @example
 * const result = await uploadAttachmentImage(file, "flashcards");
 * if (result.success) form.setValue("occlusionImagePathname", result.pathname);
 */
export async function uploadAttachmentImage(
  file: File,
  context: UploadImageContext,
): Promise<UploadAttachmentImageResponse> {
  const body = new FormData();
  body.append("file", file);
  body.append("context", context);

  try {
    const response = await fetch("/api/attachments/image", {
      method: "POST",
      body,
    });
    return (await response.json()) as UploadAttachmentImageResponse;
  } catch {
    return { success: false, errorCode: "attachments.uploadFailed" };
  }
}
