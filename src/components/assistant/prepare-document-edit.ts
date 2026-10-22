import type {
  DocumentSnapshot,
  PreparedDocumentEdit,
} from "@/components/assistant/document-editor-types";
import { prepareNoteEdits } from "@/components/assistant/note-edit-content";
import {
  mindmapEditsInputSchema,
  noteEditsInputSchema,
} from "@/features/assistant/document-edit-contract";
import { prepareMindmapEdits } from "@/features/assistant/mindmap-edit-content";

/** Validate and prepare document changes without touching editor state.
 * @example const prepared = prepareDocumentEdit(snapshot, input);
 */
export function prepareDocumentEdit(
  snapshot: DocumentSnapshot,
  input: unknown,
): PreparedDocumentEdit {
  if (snapshot.kind === "mindmap")
    return {
      kind: "mindmap",
      ...prepareMindmapEdits(
        snapshot.draft,
        snapshot.graph,
        mindmapEditsInputSchema.parse(input),
      ),
    };
  return {
    kind: "note",
    ...prepareNoteEdits(
      snapshot.draft,
      snapshot.content,
      noteEditsInputSchema.parse(input),
    ),
  };
}
