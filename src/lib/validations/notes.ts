import { z } from "zod";

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, "Note title is required.")
    .max(200, "Note title must be at most 200 characters."),
  content: z
    .string()
    .max(10000, "Content must be at most 10000 characters.")
    .optional(),
  subjectId: z.string().min(1),
});

export type CreateNoteForm = z.infer<typeof createNoteSchema>;

export const editNoteSchema = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .min(1, "Note title is required.")
    .max(200, "Note title must be at most 200 characters."),
  content: z
    .string()
    .max(10000, "Content must be at most 10000 characters.")
    .optional(),
});

export type EditNoteForm = z.infer<typeof editNoteSchema>;

export const deleteNoteSchema = z.object({
  id: z.string().min(1),
});

export type DeleteNoteForm = z.infer<typeof deleteNoteSchema>;
