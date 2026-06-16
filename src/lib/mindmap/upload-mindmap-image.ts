"use client";

import { toast } from "sonner";
import { uploadEditorImage } from "@/app/actions/attachments";
import { LIMITS } from "@/lib/config/limits";
import { getPastedImageFileName } from "@/lib/editor/clipboard-image";
import { t } from "@/lib/server/server-action-errors";
import { readFileAsBase64 } from "@/lib/utils";

/**
 * Upload one image file to the mindmap attachment store and return its read URL,
 * or null on any failure (toasting the reason). Shared by the branch-node attach
 * flow and the standalone-image paste handler so both behave identically.
 *
 * @example
 * const url = await uploadMindmapImage(file);
 * if (url) actions.setNodeImage(id, url);
 */
export async function uploadMindmapImage(file: File): Promise<string | null> {
  if (file.size > LIMITS.attachmentMaxBytes) {
    toast.error(
      t("limits.attachmentSizeLimit", { max: LIMITS.attachmentMaxBytes }),
    );
    return null;
  }
  const dataBase64 = await readFileAsBase64(file);
  if (!dataBase64) {
    toast.error(t("attachments.uploadFailed"));
    return null;
  }
  const result = await uploadEditorImage({
    fileName: getPastedImageFileName(file),
    mimeType: file.type,
    dataBase64,
    context: "mindmaps",
  });
  if (!result.success) {
    toast.error(t(result.errorCode, result.errorParams));
    return null;
  }
  return result.url;
}
