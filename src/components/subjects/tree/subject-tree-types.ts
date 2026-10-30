import type {
  DocumentKind,
  DocumentListItem,
} from "@/features/documents/types";
import type { SubjectEditDto } from "@/lib/server/api-contracts";

/** Subject passed to the rename dialog from a tree row. */
export type SubjectEditTarget = SubjectEditDto;

/** Document kind and subject a create dialog was opened for from a tree row. */
export interface DocumentCreateTarget {
  kind: DocumentKind;
  subjectId: string;
}

/** Subject passed to the delete dialog from a tree row (path used as label). */
export interface SubjectDeleteTarget {
  id: string;
  name: string;
}

/**
 * Lazily-loaded documents keyed by subject id. A subject maps to `"loading"`
 * while its notes are being fetched, then to the resolved list, or to
 * `"error"` when the fetch failed (the row then offers a retry).
 */
export type SubjectDocumentsState = Map<
  string,
  DocumentListItem[] | "loading" | "error"
>;
