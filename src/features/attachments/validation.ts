import { z } from "zod";

export const SUPPORTED_ATTACHMENT_IMAGE_MIME_TYPES = [
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp",
] as const;

export const SUPPORTED_ASSESSMENT_ATTACHMENT_MIME_TYPES = [
  ...SUPPORTED_ATTACHMENT_IMAGE_MIME_TYPES,
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

const supportedMimeTypeSet = new Set<string>(
  SUPPORTED_ATTACHMENT_IMAGE_MIME_TYPES,
);
const supportedAssessmentMimeTypeSet = new Set<string>(
  SUPPORTED_ASSESSMENT_ATTACHMENT_MIME_TYPES,
);

export function isSupportedAttachmentImageMimeType(value: string): boolean {
  return supportedMimeTypeSet.has(value.trim().toLowerCase());
}

export function isSupportedAssessmentAttachmentMimeType(
  value: string,
): boolean {
  return supportedAssessmentMimeTypeSet.has(value.trim().toLowerCase());
}

export const uploadEditorImageSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).refine(isSupportedAttachmentImageMimeType),
  dataBase64: z.string().trim().min(1),
  context: z.enum(["notes", "flashcards"]),
});

export type UploadEditorImageForm = z.infer<typeof uploadEditorImageSchema>;

export const deleteEditorImagesSchema = z.object({
  pathnames: z.array(z.string().trim().min(1).max(512)).max(100),
});

export type DeleteEditorImagesForm = z.infer<typeof deleteEditorImagesSchema>;

export const uploadAssessmentAttachmentSchema = z.object({
  assessmentId: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z
    .string()
    .trim()
    .min(1)
    .refine(isSupportedAssessmentAttachmentMimeType),
  dataBase64: z.string().trim().min(1),
});

export type UploadAssessmentAttachmentForm = z.infer<
  typeof uploadAssessmentAttachmentSchema
>;

export const deleteAssessmentAttachmentSchema = z.object({
  id: z.string().trim().min(1),
});

export type DeleteAssessmentAttachmentForm = z.infer<
  typeof deleteAssessmentAttachmentSchema
>;
