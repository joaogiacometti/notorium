import type { Dispatch, RefObject, SetStateAction } from "react";
import type { SubjectDocumentsState } from "@/components/subjects/tree/subject-tree-types";
import type { DocumentListItem } from "@/features/documents/types";
import { fetchSubjectDocuments } from "@/lib/read-api/documents";

interface SubjectDocumentsLoader {
  setDocumentsBySubject: Dispatch<SetStateAction<SubjectDocumentsState>>;
  /** Latest request id per subject, so a stale response never wins a race. */
  requestIdsRef: RefObject<Map<string, number>>;
  fetchDocuments?: (subjectId: string) => Promise<DocumentListItem[]>;
}

/**
 * Load one subject's documents into the tree state: `"loading"` while the
 * request runs, then the list, or `"error"` when it fails so the row offers a
 * retry instead of spinning forever. Reads now run in parallel (route
 * handlers, not queued Server Actions), so only the newest request per
 * subject may write its result.
 *
 * @example
 * void loadSubjectDocuments(
 *   { setDocumentsBySubject, requestIdsRef },
 *   subjectId,
 * );
 */
export async function loadSubjectDocuments(
  loader: SubjectDocumentsLoader,
  subjectId: string,
): Promise<void> {
  const requestIds = loader.requestIdsRef.current;
  const requestId = (requestIds.get(subjectId) ?? 0) + 1;
  requestIds.set(subjectId, requestId);
  setSubjectDocuments(loader, subjectId, "loading");

  const fetchDocuments = loader.fetchDocuments ?? fetchSubjectDocuments;
  const next = await fetchDocuments(subjectId).catch(() => "error" as const);
  if (requestIds.get(subjectId) === requestId) {
    setSubjectDocuments(loader, subjectId, next);
  }
}

/**
 * Whether expanding a subject should (re)load its documents: never loaded yet,
 * or the last attempt failed.
 *
 * @example
 * if (shouldLoadSubjectDocuments(documentsBySubject, id)) void load(id);
 */
export function shouldLoadSubjectDocuments(
  documentsBySubject: SubjectDocumentsState,
  subjectId: string,
): boolean {
  const current = documentsBySubject.get(subjectId);
  return current === undefined || current === "error";
}

function setSubjectDocuments(
  loader: SubjectDocumentsLoader,
  subjectId: string,
  value: DocumentListItem[] | "loading" | "error",
): void {
  loader.setDocumentsBySubject((current) =>
    new Map(current).set(subjectId, value),
  );
}
