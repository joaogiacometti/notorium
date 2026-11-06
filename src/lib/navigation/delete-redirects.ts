import type { DocumentListItem } from "@/features/documents/types";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";
import { getFolderIdFromPathname } from "@/lib/navigation/folder-path";
import type { FolderTreeNode } from "@/lib/server/api-contracts";
import { isFolderDescendant } from "@/lib/trees/folder-tree";

/**
 * Returns home when deleting the document currently shown by the active route.
 *
 * @example getDocumentDeleteRedirectHref("/folders/s1/documents/notes/n1", item)
 */
export function getDocumentDeleteRedirectHref(
  pathname: string,
  item: DocumentListItem,
): string | null {
  return pathname === getDocumentDetailHref(item) ? "/" : null;
}

/**
 * Returns home when deleting the folder, or an ancestor of the folder,
 * currently shown by the active route.
 *
 * @example getFolderDeleteRedirectHref("/folders/child", tree, "parent")
 */
export function getFolderDeleteRedirectHref(
  pathname: string,
  tree: FolderTreeNode[],
  deletedFolderId: string,
): string | null {
  const activeFolderId = getFolderIdFromPathname(pathname);
  if (!activeFolderId) return null;
  if (activeFolderId === deletedFolderId) return "/";
  return isFolderDescendant(tree, deletedFolderId, activeFolderId) ? "/" : null;
}
