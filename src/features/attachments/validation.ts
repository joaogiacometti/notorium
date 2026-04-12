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

const supportedMimeTypeSet = new Set<string>(
  SUPPORTED_ATTACHMENT_IMAGE_MIME_TYPES,
);

export function isSupportedAttachmentImageMimeType(value: string): boolean {
  return supportedMimeTypeSet.has(value.trim().toLowerCase());
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
