import { z } from "zod";

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
    return "Unsupported file type. Use JPG, PNG, WEBP, or GIF.";
  }

  if (file.size > noteAttachmentMaxSizeBytes) {
    return `File is too large. Maximum size is ${Math.floor(noteAttachmentMaxSizeBytes / (1024 * 1024))}MB.`;
  }

  return null;
}

export const noteAttachmentUploadSchema = z.object({
  images: z
    .array(
      z.custom<File>(isFile, {
        message: "Invalid file selection.",
      }),
    )
    .min(1, "Select at least one image.")
    .max(
      noteAttachmentMaxFilesPerUpload,
      `You can upload up to ${noteAttachmentMaxFilesPerUpload} images at a time.`,
    )
    .superRefine((files, ctx) => {
      for (const file of files) {
        const validationError = validateNoteAttachmentFile(file);

        if (validationError) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${file.name}: ${validationError}`,
          });
        }
      }
    }),
});

export type NoteAttachmentUploadForm = z.infer<
  typeof noteAttachmentUploadSchema
>;
