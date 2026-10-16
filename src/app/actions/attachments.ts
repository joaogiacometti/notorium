"use server";

import { deleteEditorImagesForUser } from "@/features/attachments/mutations";
import {
  type DeleteEditorImagesForm,
  deleteEditorImagesSchema,
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
