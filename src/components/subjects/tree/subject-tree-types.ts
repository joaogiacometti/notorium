import type { DocumentListItem } from "@/features/documents/types";
import type { SubjectEditDto } from "@/lib/server/api-contracts";

/** Subject passed to the rename dialog from a tree row. */
export type SubjectEditTarget = SubjectEditDto;

/** Subject passed to the delete dialog from a tree row (path used as label). */
export interface SubjectDeleteTarget {
  id: string;
  name: string;
}

/**
 * Lazily-loaded documents keyed by subject id. A subject maps to `"loading"`
 * while its notes/mindmaps are being fetched, then to the resolved list.
 */
export type SubjectDocumentsState = Map<string, DocumentListItem[] | "loading">;
