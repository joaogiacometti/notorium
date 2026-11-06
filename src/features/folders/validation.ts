import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

const folderNameSchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.folders.nameRequired"))
  .max(
    LIMITS.folderNameMax,
    validationMessage("Validation.folders.nameMaxLength"),
  )
  .refine(
    (value) => !value.includes("::"),
    validationMessage("Validation.folders.nameReservedDelimiter"),
  );

const createFolderNameSchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.folders.nameRequired"))
  .refine(
    (value) => value.split("::").every((segment) => segment.trim().length > 0),
    validationMessage("Validation.folders.nameRequired"),
  )
  .refine(
    (value) =>
      value
        .split("::")
        .every((segment) => segment.trim().length <= LIMITS.folderNameMax),
    validationMessage("Validation.folders.nameMaxLength"),
  );

export const createFolderSchema = z.object({
  name: createFolderNameSchema,
  parentFolderId: z.string().min(1).optional(),
});

export type CreateFolderForm = z.infer<typeof createFolderSchema>;

export const moveFolderSchema = z.object({
  id: z.string().min(1),
  parentFolderId: z.string().min(1).optional(),
});

export type MoveFolderForm = z.infer<typeof moveFolderSchema>;

export const editFolderSchema = z.object({
  id: z.string().min(1),
  name: folderNameSchema,
});

export type EditFolderForm = z.infer<typeof editFolderSchema>;

export const deleteFolderSchema = z.object({
  id: z.string().min(1),
});

export type DeleteFolderForm = z.infer<typeof deleteFolderSchema>;
