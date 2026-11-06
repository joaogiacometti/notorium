/**
 * Keeps a `folderId` search param only when it names one of the user's
 * folders, so a stale or foreign id falls back to the unscoped view.
 *
 * @example
 * const scopedFolderId = resolveScopedFolderId(folders, params.folderId);
 */
export function resolveScopedFolderId(
  folders: ReadonlyArray<{ id: string }>,
  folderId: string | undefined,
): string | undefined {
  if (!folderId) {
    return undefined;
  }

  return folders.some((folder) => folder.id === folderId)
    ? folderId
    : undefined;
}
