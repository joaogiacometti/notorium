import type { DocumentListItem } from "@/features/documents/types";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";
import { isSubjectDescendant } from "@/lib/trees/subject-tree";

/**
 * Returns home when deleting the document currently shown by the active route.
 *
 * @example getDocumentDeleteRedirectHref("/subjects/s1/documents/notes/n1", item)
 */
export function getDocumentDeleteRedirectHref(
  pathname: string,
  item: DocumentListItem,
): string | null {
  return pathname === getDocumentDetailHref(item) ? "/" : null;
}

/**
 * Returns home when deleting the subject, or an ancestor of the subject,
 * currently shown by the active route.
 *
 * @example getSubjectDeleteRedirectHref("/subjects/child", tree, "parent")
 */
export function getSubjectDeleteRedirectHref(
  pathname: string,
  tree: SubjectTreeNode[],
  deletedSubjectId: string,
): string | null {
  const activeSubjectId = getSubjectIdFromPathname(pathname);
  if (!activeSubjectId) return null;
  if (activeSubjectId === deletedSubjectId) return "/";
  return isSubjectDescendant(tree, deletedSubjectId, activeSubjectId)
    ? "/"
    : null;
}

function getSubjectIdFromPathname(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "subjects" && segments[1] ? segments[1] : null;
}
