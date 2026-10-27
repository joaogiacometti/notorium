import type {
  DocumentSnapshot,
  PreparedDocumentEdit,
} from "@/components/assistant/document-editor-types";
import { prepareNoteEdits } from "@/components/assistant/note-edit-content";
import { noteEditsInputSchema } from "@/features/assistant/document-edit-contract";

/** Validate and prepare document changes without touching editor state.
 * @example const prepared = prepareDocumentEdit(snapshot, input);
 */
export function prepareDocumentEdit(
  snapshot: DocumentSnapshot,
  input: unknown,
): PreparedDocumentEdit {
  return {
    kind: "note",
    ...prepareNoteEdits(
      snapshot.draft,
      snapshot.content,
      noteEditsInputSchema.parse(input),
    ),
  };
}
