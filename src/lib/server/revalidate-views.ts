import { revalidatePath } from "next/cache";

type DocumentRouteKind = "notes";

/**
 * Refreshes the app shell rendered by the `(app)` layout: the sidebar folder
 * tree, its document counts, and its due-card review badges. Targeting the
 * root layout also invalidates every page under it, so callers need no extra
 * page-level revalidation. Call after any write that changes folders,
 * document counts, or flashcards (create, edit, move, delete, reset). Review
 * grades are the exception; see `use-app-shell-refresh-after-review.ts`.
 *
 * @example
 * if (result.success) revalidateAppShell();
 */
export function revalidateAppShell(): void {
  revalidatePath("/", "layout");
}

/**
 * Refreshes one note page after a content or title edit.
 *
 * @example
 * revalidateDocumentPage("notes", result.folderId, data.id);
 */
export function revalidateDocumentPage(
  kind: DocumentRouteKind,
  folderId: string,
  documentId: string,
): void {
  revalidatePath(`/folders/${folderId}/documents/${kind}/${documentId}`);
}
