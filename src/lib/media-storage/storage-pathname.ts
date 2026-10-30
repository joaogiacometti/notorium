/** Root folder of every stored blob: `notorium/{context}/{userId}/...`. */
export const MEDIA_STORAGE_NAMESPACE = "notorium";

/** Every live storage context; the blob proxy, GC, and purge all derive from it. */
export const MEDIA_STORAGE_CONTEXTS = ["notes", "flashcards", "pdfs"] as const;

export type MediaStorageContext = (typeof MEDIA_STORAGE_CONTEXTS)[number];

export interface MediaStoragePathnameInput {
  userId: string;
  context: MediaStorageContext;
  fileName: string;
  fallbackFileName: string;
}

function sanitizeFileName(fileName: string, fallbackFileName: string): string {
  const normalized = fileName.trim().replaceAll(/[^a-zA-Z0-9._-]/g, "-");

  if (normalized.length === 0) {
    return fallbackFileName;
  }

  return normalized.slice(0, 120);
}

/**
 * Builds the owner-scoped blob pathname `notorium/{context}/{userId}/{uuid}-{name}`
 * that `parseOwnedAttachmentPathname` accepts and the blob proxy authorizes.
 *
 * @example
 * buildMediaStoragePathname({ userId, context: "pdfs", fileName: "Book.pdf", fallbackFileName: "document.pdf" });
 */
export function buildMediaStoragePathname(
  input: MediaStoragePathnameInput,
): string {
  const safeName = sanitizeFileName(input.fileName, input.fallbackFileName);

  return `${MEDIA_STORAGE_NAMESPACE}/${input.context}/${input.userId}/${crypto.randomUUID()}-${safeName}`;
}
