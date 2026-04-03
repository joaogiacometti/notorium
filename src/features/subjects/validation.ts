import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

export const createSubjectSchema = z.object({
  name: z
    .string()
    .min(1, validationMessage("Validation.subjects.nameRequired"))
    .max(
      LIMITS.subjectNameMax,
      validationMessage("Validation.subjects.nameMaxLength"),
    ),
  description: z
    .string()
    .max(
      LIMITS.subjectDescriptionMax,
      validationMessage("Validation.subjects.descriptionMaxLength"),
    )
    .optional(),
});

export type CreateSubjectForm = z.infer<typeof createSubjectSchema>;

export const editSubjectSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(1, validationMessage("Validation.subjects.nameRequired"))
    .max(
      LIMITS.subjectNameMax,
      validationMessage("Validation.subjects.nameMaxLength"),
    ),
  description: z
    .string()
    .max(
      LIMITS.subjectDescriptionMax,
      validationMessage("Validation.subjects.descriptionMaxLength"),
    )
    .optional(),
});

export type EditSubjectForm = z.infer<typeof editSubjectSchema>;

export const deleteSubjectSchema = z.object({
  id: z.string().min(1),
});

export type DeleteSubjectForm = z.infer<typeof deleteSubjectSchema>;

export const archiveSubjectSchema = z.object({
  id: z.string().min(1),
});

export type ArchiveSubjectForm = z.infer<typeof archiveSubjectSchema>;

export const restoreSubjectSchema = z.object({
  id: z.string().min(1),
});

export type RestoreSubjectForm = z.infer<typeof restoreSubjectSchema>;
