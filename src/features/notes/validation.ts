import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import {
  documentCharacterCount,
  richTextDocumentSchema,
} from "@/lib/editor/document";
import { countInternalAttachmentImages } from "@/lib/editor/document-content";
import { validationMessage } from "@/lib/validations/validation-messages";

const noteContentSchema = richTextDocumentSchema
  .refine(
    (value) => documentCharacterCount(value) <= LIMITS.noteContentMax,
    validationMessage("Validation.notes.contentMaxLength"),
  )
  .refine(
    (value) =>
      countInternalAttachmentImages(value) <= LIMITS.maxAttachmentsPerNote,
    validationMessage("Validation.notes.attachmentLimit", {
      max: LIMITS.maxAttachmentsPerNote,
    }),
  );

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, validationMessage("Validation.notes.titleRequired"))
    .max(
      LIMITS.noteTitleMax,
      validationMessage("Validation.notes.titleMaxLength"),
    ),
  content: noteContentSchema.optional(),
  folderId: z.string().min(1),
});

export type CreateNoteForm = z.infer<typeof createNoteSchema>;

export const editNoteSchema = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .min(1, validationMessage("Validation.notes.titleRequired"))
    .max(
      LIMITS.noteTitleMax,
      validationMessage("Validation.notes.titleMaxLength"),
    ),
  content: noteContentSchema.optional(),
});

export type EditNoteForm = z.infer<typeof editNoteSchema>;

export const deleteNoteSchema = z.object({
  id: z.string().min(1),
});

export type DeleteNoteForm = z.infer<typeof deleteNoteSchema>;
