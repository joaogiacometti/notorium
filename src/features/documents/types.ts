export type DocumentKind = "note" | "mindmap";

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
