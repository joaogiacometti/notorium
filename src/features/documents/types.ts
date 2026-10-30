import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export const DOCUMENT_KINDS = ["note", "pdf"] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** URL segment of each kind under `/subjects/[id]/documents/`. */
export const DOCUMENT_ROUTE_SEGMENTS = {
  note: "notes",
  pdf: "pdfs",
} as const satisfies Record<DocumentKind, string>;

/** Payload a feature move mutation receives: the document id and destination. */
export interface MoveDocumentMutationInput {
  id: string;
  subjectId: string;
}

/**
 * Result of moving a document to a different subject. Carries both the
 * destination and origin subject so the caller can revalidate each side.
 */
export type MoveDocumentResult =
  | { success: true; subjectId: string; previousSubjectId: string }
  | ActionErrorResult;

/**
 * A subject document is a note or PDF surfaced in the subject "Documents"
 * area. `kind` drives the sidebar icon and the detail route.
 */
export interface DocumentListItem {
  id: string;
  title: string;
  updatedAt: Date;
  kind: DocumentKind;
  subjectId: string;
}
