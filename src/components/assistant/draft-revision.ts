/**
 * Count content changes between draft snapshots so each proposal binds to the
 * revision it was made for. Pass a signature of persisted content only, so
 * selection and viewport changes never bump the revision.
 *
 * @example
 * const nextRevision = createDraftRevisionCounter();
 * nextRevision(JSON.stringify([title, content])); // 0, then 1 after a change
 */
export function createDraftRevisionCounter(
  initial = 0,
): (signature: string) => number {
  let revision = initial;
  let previous = "";
  return (signature) => {
    if (previous && previous !== signature) revision += 1;
    previous = signature;
    return revision;
  };
}
