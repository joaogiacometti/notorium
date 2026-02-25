import { z } from "zod";

export const createSubjectSchema = z.object({
  name: z
    .string()
    .min(1, "Subject name is required.")
    .max(100, "Subject name must be at most 100 characters."),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters.")
    .optional(),
  notesEnabled: z.boolean().default(true),
  gradesEnabled: z.boolean().default(true),
  attendanceEnabled: z.boolean().default(true),
});

export type CreateSubjectForm = z.infer<typeof createSubjectSchema>;

export const editSubjectSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(1, "Subject name is required.")
    .max(100, "Subject name must be at most 100 characters."),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters.")
    .optional(),
  notesEnabled: z.boolean().default(true),
  gradesEnabled: z.boolean().default(true),
  attendanceEnabled: z.boolean().default(true),
});

export type EditSubjectForm = z.infer<typeof editSubjectSchema>;

export const deleteSubjectSchema = z.object({
  id: z.string().min(1),
});

export type DeleteSubjectForm = z.infer<typeof deleteSubjectSchema>;
