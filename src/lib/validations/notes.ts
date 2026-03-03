import { z } from "zod";
import { validationMessage } from "@/lib/validation-messages";

export const noteAttachmentAllowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const noteAttachmentMaxSizeBytes = 2 * 1024 * 1024;
export const noteAttachmentMaxFilesPerUpload = 5;

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

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

export const uploadNoteAttachmentsSchema = z.object({
  noteId: z.string().min(1),
});

export type UploadNoteAttachmentsForm = z.infer<
  typeof uploadNoteAttachmentsSchema
>;

export const removeNoteAttachmentSchema = z.object({
  id: z.string().min(1),
});

export type RemoveNoteAttachmentForm = z.infer<
  typeof removeNoteAttachmentSchema
>;

export function validateNoteAttachmentFile(file: File): string | null {
  if (
    !noteAttachmentAllowedTypes.includes(
      file.type as (typeof noteAttachmentAllowedTypes)[number],
    )
  ) {
    return validationMessage("Validation.notes.attachments.unsupportedType");
  }

  if (file.size > noteAttachmentMaxSizeBytes) {
    return validationMessage("Validation.notes.attachments.maxSize", {
      max: Math.floor(noteAttachmentMaxSizeBytes / (1024 * 1024)),
    });
  }

  return null;
}

export const noteAttachmentUploadSchema = z.object({
  images: z
    .array(
      z.custom<File>(isFile, {
        message: validationMessage(
          "Validation.notes.attachments.invalidSelection",
        ),
      }),
    )
    .min(1, validationMessage("Validation.notes.attachments.selectAtLeastOne"))
    .max(
      noteAttachmentMaxFilesPerUpload,
      validationMessage("Validation.notes.attachments.maxFilesPerUpload", {
        max: noteAttachmentMaxFilesPerUpload,
      }),
    )
    .superRefine((files, ctx) => {
      for (const file of files) {
        const validationError = validateNoteAttachmentFile(file);

        if (validationError) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: validationMessage(
              "Validation.notes.attachments.fileError",
              {
                fileName: file.name,
              },
            ),
          });
        }
      }
    }),
});

export type NoteAttachmentUploadForm = z.infer<
  typeof noteAttachmentUploadSchema
>;
