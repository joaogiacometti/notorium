import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

const subjectNameSchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.subjects.nameRequired"))
  .max(
    LIMITS.subjectNameMax,
    validationMessage("Validation.subjects.nameMaxLength"),
  )
  .refine(
    (value) => !value.includes("::"),
    validationMessage("Validation.subjects.nameReservedDelimiter"),
  );

const createSubjectNameSchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.subjects.nameRequired"))
  .refine(
    (value) => value.split("::").every((segment) => segment.trim().length > 0),
    validationMessage("Validation.subjects.nameRequired"),
  )
  .refine(
    (value) =>
      value
        .split("::")
        .every((segment) => segment.trim().length <= LIMITS.subjectNameMax),
    validationMessage("Validation.subjects.nameMaxLength"),
  );

export const createSubjectSchema = z.object({
  name: createSubjectNameSchema,
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
});

export type EditSubjectForm = z.infer<typeof editSubjectSchema>;

export const deleteSubjectSchema = z.object({
  id: z.string().min(1),
});

export type DeleteSubjectForm = z.infer<typeof deleteSubjectSchema>;
