import { z } from "zod";
import { DOCUMENT_KINDS } from "@/features/documents/types";

/**
 * Validates a drag-and-drop document reparent and its destination subject.
 *
 * @example moveDocumentSchema.parse({ kind: "note", id, subjectId })
 */
export const moveDocumentSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  id: z.string().min(1),
  subjectId: z.string().min(1),
});

export type MoveDocumentForm = z.infer<typeof moveDocumentSchema>;
