import { z } from "zod";
import { validationMessage } from "@/lib/validation-messages";

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, validationMessage("Validation.notes.titleRequired"))
    .max(200, validationMessage("Validation.notes.titleMaxLength")),
  content: z
    .string()
    .max(10000, validationMessage("Validation.notes.contentMaxLength"))
    .optional(),
  subjectId: z.string().min(1),
});

export type CreateNoteForm = z.infer<typeof createNoteSchema>;

export const editNoteSchema = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .min(1, validationMessage("Validation.notes.titleRequired"))
    .max(200, validationMessage("Validation.notes.titleMaxLength")),
  content: z
    .string()
    .max(10000, validationMessage("Validation.notes.contentMaxLength"))
    .optional(),
});

export type EditNoteForm = z.infer<typeof editNoteSchema>;

export const deleteNoteSchema = z.object({
  id: z.string().min(1),
});

export type DeleteNoteForm = z.infer<typeof deleteNoteSchema>;
