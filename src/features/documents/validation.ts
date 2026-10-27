import { z } from "zod";

/**
 * Validates a drag-and-drop note reparent and its destination subject.
 *
 * @example moveDocumentSchema.parse({ kind: "note", id, subjectId })
 */
export const moveDocumentSchema = z.object({
  kind: z.literal("note"),
  id: z.string().min(1),
  subjectId: z.string().min(1),
});

export type MoveDocumentForm = z.infer<typeof moveDocumentSchema>;
