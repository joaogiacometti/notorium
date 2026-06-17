import { z } from "zod";
import { subjectKindValues } from "@/features/subjects/constants";
import { LIMITS } from "@/lib/config/limits";
import { bulkIdsSchema } from "@/lib/validations/schemas";
import { validationMessage } from "@/lib/validations/validation-messages";

const subjectNameSchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.subjects.nameRequired"))
  .max(
    LIMITS.subjectNameMax,
    validationMessage("Validation.subjects.nameMaxLength"),
  );

const subjectKindSchema = z.enum(subjectKindValues);

export const createSubjectSchema = z.object({
  name: subjectNameSchema,
  kind: subjectKindSchema,
  parentSubjectId: z.string().min(1).optional(),
});

export type CreateSubjectForm = z.infer<typeof createSubjectSchema>;

export const moveSubjectSchema = z.object({
  id: z.string().min(1),
  parentSubjectId: z.string().min(1).optional(),
});

export type MoveSubjectForm = z.infer<typeof moveSubjectSchema>;

export const editSubjectSchema = z.object({
  id: z.string().min(1),
  name: subjectNameSchema,
  kind: subjectKindSchema,
});

export type EditSubjectForm = z.infer<typeof editSubjectSchema>;

export const deleteSubjectSchema = z.object({
  id: z.string().min(1),
});

export type DeleteSubjectForm = z.infer<typeof deleteSubjectSchema>;

export const bulkDeleteSubjectsSchema = z.object({
  ids: bulkIdsSchema,
});

export type BulkDeleteSubjectsForm = z.infer<typeof bulkDeleteSubjectsSchema>;
