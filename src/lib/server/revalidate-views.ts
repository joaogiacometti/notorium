import { revalidatePath } from "next/cache";

type DocumentRouteKind = "notes" | "mindmaps";

/**
 * Refreshes the app shell rendered by the `(app)` layout: the sidebar subject
 * tree, its document counts, and its due-card review badges. Targeting the
 * root layout also invalidates every page under it, so callers need no extra
 * page-level revalidation. Call after any write that changes subjects,
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
 * Refreshes subject detail pages for writes that the sidebar does not show
 * (assessments, attendance, document content).
 *
 * @example
 * revalidateSubjectPages(result.subjectIds);
 */
export function revalidateSubjectPages(subjectIds: readonly string[]): void {
  for (const subjectId of subjectIds) {
    revalidatePath(`/subjects/${subjectId}`);
  }
}

/**
 * Refreshes the views that list assessments: `/planning` and each affected
 * subject page.
 *
 * @example
 * revalidateAssessmentViews([result.assessment.subjectId]);
 */
export function revalidateAssessmentViews(subjectIds: readonly string[]): void {
  revalidatePath("/planning");
  revalidateSubjectPages(subjectIds);
}

/**
 * Refreshes one note or mindmap page plus its subject page after a content or
 * title edit.
 *
 * @example
 * revalidateDocumentPage("notes", result.subjectId, data.id);
 */
export function revalidateDocumentPage(
  kind: DocumentRouteKind,
  subjectId: string,
  documentId: string,
): void {
  revalidateSubjectPages([subjectId]);
  revalidatePath(`/subjects/${subjectId}/documents/${kind}/${documentId}`);
}
