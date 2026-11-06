import { DOCUMENT_ROUTE_SEGMENTS } from "@/features/documents/types";

/**
 * Pure helpers that read the active folder/document from a pathname so the
 * folder tree can highlight the current location and reveal its rows. Kept
 * apart from the sidebar component so they stay easy to unit test.
 */

/**
 * Extracts the active folder id from a `/folders/[id]/...` pathname.
 *
 * @example getFolderIdFromPathname("/folders/s1/documents/notes/n1") // "s1"
 */
export function getFolderIdFromPathname(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "folders") {
    return undefined;
  }
  const candidate = segments[1];
  if (!candidate) {
    return undefined;
  }
  return candidate;
}

const DOCUMENT_ROUTE_SEGMENT_VALUES: readonly string[] = Object.values(
  DOCUMENT_ROUTE_SEGMENTS,
);

/**
 * Folder id whose document rows must be revealed because a document under it is
 * open. Matches `/folders/[id]/documents/{kind segment}/[docId]`, so the
 * tree can expand that folder and load its documents on first paint.
 *
 * @example getDocumentFolderIdFromPathname("/folders/s1/documents/notes/n1") // "s1"
 */
export function getDocumentFolderIdFromPathname(
  pathname: string,
): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "folders" || segments[2] !== "documents") {
    return undefined;
  }
  if (!DOCUMENT_ROUTE_SEGMENT_VALUES.includes(segments[3]) || !segments[4]) {
    return undefined;
  }
  return segments[1];
}
