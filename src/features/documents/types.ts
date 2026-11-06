import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export const DOCUMENT_KINDS = ["note", "pdf"] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** URL segment of each kind under `/folders/[id]/documents/`. */
export const DOCUMENT_ROUTE_SEGMENTS = {
  note: "notes",
  pdf: "pdfs",
} as const satisfies Record<DocumentKind, string>;

/** Payload a feature move mutation receives: the document id and destination. */
export interface MoveDocumentMutationInput {
  id: string;
  folderId: string;
}

/**
 * Result of moving a document to a different folder. Carries both the
 * destination and origin folder so the caller can revalidate each side.
 */
export type MoveDocumentResult =
  | { success: true; folderId: string; previousFolderId: string }
  | ActionErrorResult;

/**
 * A folder document is a note or PDF surfaced in the folder "Documents"
 * area. `kind` drives the sidebar icon and the detail route.
 */
export interface DocumentListItem {
  id: string;
  title: string;
  updatedAt: Date;
  kind: DocumentKind;
  folderId: string;
}
