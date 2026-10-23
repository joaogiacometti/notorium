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

// Attachment image uploads (editor and mindmap images) are sent as raw
// multipart bytes through the POST /api/attachments/image route handler,
// not a Server Action, so there is no base64 upload schema here — only the
// shared context whitelist the route validates the form field against.
export const UPLOAD_IMAGE_CONTEXTS = [
  "notes",
  "flashcards",
  "mindmaps",
] as const;

export type UploadImageContext = (typeof UPLOAD_IMAGE_CONTEXTS)[number];

const uploadImageContextSet = new Set<string>(UPLOAD_IMAGE_CONTEXTS);

export function isUploadImageContext(
  value: string,
): value is UploadImageContext {
  return uploadImageContextSet.has(value);
}
