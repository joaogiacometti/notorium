import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export type DocumentKind = "note" | "mindmap";

/** Payload a feature move mutation receives: the document id and destination. */
export interface MoveDocumentMutationInput {
  id: string;
  subjectId: string;
}

/**
 * Result of moving a note or mindmap to a different subject. Carries both the
 * destination and origin subject so the caller can revalidate each side.
 */
export type MoveDocumentResult =
  | { success: true; subjectId: string; previousSubjectId: string }
  | ActionErrorResult;

/**
 * A subject document is either a note or a mindmap, surfaced together in the
 * subject "Documents" area. `kind` drives the sidebar icon and the detail route.
 */
export interface DocumentListItem {
  id: string;
  title: string;
  updatedAt: Date;
  kind: DocumentKind;
  subjectId: string;
}
