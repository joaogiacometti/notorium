import type {
  DocumentDraft,
  NoteDraft,
} from "@/features/assistant/document-edit-contract";
import type { RichTextDocument } from "@/lib/editor/document";
import { documentSnapshot } from "@/lib/editor/document-snapshot";
import type { RichTextReviewSegment } from "@/lib/editor/rich-text-review-decorations";

export type DocumentSnapshot = {
  kind: "note";
  draft: NoteDraft;
  content: RichTextDocument;
};
export type PreparedDocumentEdit = {
  kind: "note";
  title: string;
  content: RichTextDocument;
  segments: RichTextReviewSegment[];
};
export interface ActiveDocumentEditor {
  sessionId: string;
  snapshot: () => DocumentSnapshot;
  available: () => boolean;
  apply: (change: PreparedDocumentEdit) => void;
}
export interface PendingDocumentEdit {
  toolCallId: string;
  tool: "proposeNoteEdits";
  baseline: DocumentSnapshot;
  prepared: PreparedDocumentEdit;
}
export interface DocumentEditControls {
  pending: PendingDocumentEdit | null;
  notice: string | null;
  available: boolean;
  register: (editor: ActiveDocumentEditor) => () => void;
  capture: () => DocumentDraft | undefined;
  settle: () => Promise<void>;
  decide: (accept: boolean) => void;
  reset: () => void;
}

/** Compare persisted content only; selection and viewport changes are irrelevant.
 * @example documentSnapshotSignature(editor.snapshot());
 */
export function documentSnapshotSignature(snapshot: DocumentSnapshot): string {
  return documentSnapshot([
    snapshot.draft.sessionId,
    snapshot.draft.revision,
    snapshot.draft.title,
    snapshot.content,
  ]);
}
