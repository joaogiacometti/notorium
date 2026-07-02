"use client";

export const SUBJECT_DOCUMENTS_CHANGED_EVENT =
  "notorium:subject-documents-changed";

/**
 * Notifies mounted subject trees to reload one subject's document rows.
 *
 * @example
 * notifySubjectDocumentsChanged("subject-1");
 */
export function notifySubjectDocumentsChanged(subjectId: string) {
  window.dispatchEvent(
    new CustomEvent(SUBJECT_DOCUMENTS_CHANGED_EVENT, {
      detail: { subjectId },
    }),
  );
}
