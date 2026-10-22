import type {
  DocumentDraft,
  MindmapDraft,
  NoteDraft,
} from "@/features/assistant/document-edit-contract";
import type { MindmapGraph } from "@/features/mindmaps/types";
import type { RichTextReviewSegment } from "@/lib/editor/rich-text-review-decorations";

export type DocumentSnapshot =
  | { kind: "note"; draft: NoteDraft; content: string }
  | { kind: "mindmap"; draft: MindmapDraft; graph: MindmapGraph };
export type PreparedDocumentEdit =
  | {
      kind: "note";
      title: string;
      content: string;
      segments: RichTextReviewSegment[];
    }
  | { kind: "mindmap"; title: string; graph: MindmapGraph };
export interface ActiveDocumentEditor {
  sessionId: string;
  snapshot: () => DocumentSnapshot;
  available: () => boolean;
  apply: (change: PreparedDocumentEdit) => void;
}
export interface PendingDocumentEdit {
  toolCallId: string;
  tool: "proposeNoteEdits" | "proposeMindmapEdits";
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
  return JSON.stringify([
    snapshot.draft.sessionId,
    snapshot.draft.revision,
    snapshot.draft.title,
    snapshot.kind === "note" ? snapshot.content : snapshot.graph,
  ]);
}
