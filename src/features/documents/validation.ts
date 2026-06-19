import { z } from "zod";

/**
 * Validates a drag-and-drop document reparent: which kind of document, its id,
 * and the destination subject. Used by the `moveDocument` Server Action to
 * dispatch to the note or mindmap mutation.
 *
 * @example moveDocumentSchema.parse({ kind: "note", id, subjectId })
 */
export const moveDocumentSchema = z.object({
  kind: z.enum(["note", "mindmap"]),
  id: z.string().min(1),
  subjectId: z.string().min(1),
});

export type MoveDocumentForm = z.infer<typeof moveDocumentSchema>;
