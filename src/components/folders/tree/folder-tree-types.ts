import type { DocumentKind } from "@/features/documents/types";
import type { FolderEditDto } from "@/lib/server/api-contracts";

/** Folder passed to the rename dialog from a tree row. */
export type FolderEditTarget = FolderEditDto;

/** Document kind and folder a create dialog was opened for from a tree row. */
export interface DocumentCreateTarget {
  kind: DocumentKind;
  folderId: string;
}

/** Folder passed to the delete dialog from a tree row (path used as label). */
export interface FolderDeleteTarget {
  id: string;
  name: string;
}
