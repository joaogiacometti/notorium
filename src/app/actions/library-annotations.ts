"use server";

import {
  deleteAnnotationForUser,
  saveAnnotationForUser,
} from "@/features/library-annotations/mutations";
import {
  type DeleteAnnotationForm,
  deleteAnnotationSchema,
  type SaveAnnotationForm,
  saveAnnotationSchema,
} from "@/features/library-annotations/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { MutationResult } from "@/lib/server/api-contracts";

/**
 * Saves or updates a single highlight as the user creates or edits it in the
 * reader. Intentionally skips `revalidatePath`: highlights are loaded once on
 * open and mutated optimistically in the live reader, so a route revalidation
 * would only re-fetch data the client already holds.
 */
export async function saveBookAnnotation(
  data: SaveAnnotationForm,
): Promise<MutationResult> {
  return runValidatedUserAction(
    saveAnnotationSchema,
    data,
    "library.invalidData",
    async (userId, parsedData) => saveAnnotationForUser(userId, parsedData),
  );
}

export async function deleteBookAnnotation(
  data: DeleteAnnotationForm,
): Promise<MutationResult> {
  return runValidatedUserAction(
    deleteAnnotationSchema,
    data,
    "library.invalidData",
    async (userId, parsedData) => deleteAnnotationForUser(userId, parsedData),
  );
}
