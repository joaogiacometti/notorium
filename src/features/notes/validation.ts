import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, validationMessage("Validation.notes.titleRequired"))
    .max(
      LIMITS.noteTitleMax,
      validationMessage("Validation.notes.titleMaxLength"),
    ),
  content: z
    .string()
    .max(
      LIMITS.noteContentMax,
      validationMessage("Validation.notes.contentMaxLength"),
    )
    .optional(),
  subjectId: z.string().min(1),
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
  content: z
    .string()
    .max(
      LIMITS.noteContentMax,
      validationMessage("Validation.notes.contentMaxLength"),
    )
    .optional(),
});

export type EditNoteForm = z.infer<typeof editNoteSchema>;

export const deleteNoteSchema = z.object({
  id: z.string().min(1),
});

export type DeleteNoteForm = z.infer<typeof deleteNoteSchema>;
