import {
  MEDIA_STORAGE_CONTEXTS,
  MEDIA_STORAGE_NAMESPACE,
  type MediaStorageContext,
} from "@/lib/media-storage/storage-pathname";

const ATTACHMENT_CONTEXTS = new Set<string>(MEDIA_STORAGE_CONTEXTS);

export type AttachmentContext = MediaStorageContext;

export interface ParsedOwnedAttachmentPathname {
  pathname: string;
  ownerId: string;
  context: AttachmentContext;
  fileName: string;
}

export function parseOwnedAttachmentPathname(
  pathnameValue: string,
): ParsedOwnedAttachmentPathname | null {
  const pathname = pathnameValue.trim();

  if (
    pathname.length === 0 ||
    pathname.length > 512 ||
    pathname.includes("..")
  ) {
    return null;
  }

  const segments = pathname.split("/");

  if (segments.length !== 4) {
    return null;
  }

  const [namespace, context, ownerId, fileName] = segments;

  if (namespace !== MEDIA_STORAGE_NAMESPACE) {
    return null;
  }

  if (!ATTACHMENT_CONTEXTS.has(context)) {
    return null;
  }

  if (ownerId.length === 0 || ownerId.length > 200) {
    return null;
  }

  if (fileName.length === 0 || fileName.length > 220) {
    return null;
  }

  return {
    pathname,
    ownerId,
    context: context as AttachmentContext,
    fileName,
  };
}

/**
 * The authenticated, same-origin read URL for a stored blob.
 *
 * @example getAttachmentReadUrl("notorium/pdfs/u/id-book.pdf");
 */
export function getAttachmentReadUrl(pathname: string): string {
  return `/api/attachments/blob?pathname=${encodeURIComponent(pathname)}`;
}
