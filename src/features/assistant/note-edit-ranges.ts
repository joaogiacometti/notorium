import type { NoteEditsInput } from "@/features/assistant/document-edit-contract";

type NoteReplacement = NonNullable<NoteEditsInput["replacements"]>[number];
type NoteInsertion = NonNullable<NoteEditsInput["insertions"]>[number];

/** One proposed edit as a half-open block index range; insertions are empty ranges. */
export interface LocatedNoteEdit {
  kind: "replacement" | "insertion";
  from: number;
  to: number;
  html: string;
  label: string;
}

/**
 * Place every note edit in block order and report what cannot be placed. The
 * server checks proposals against the draft and the client prepares them
 * against the live note with this same logic, so a proposal the model is told
 * is valid never fails later in the editor.
 *
 * @example
 * const { edits, problems } = locateNoteEdits(["b0", "b1"], new Set(["b0", "b1"]), input);
 */
export function locateNoteEdits(
  blockIds: readonly string[],
  visible: ReadonlySet<string>,
  proposal: NoteEditsInput,
): { edits: LocatedNoteEdit[]; problems: string[] } {
  const located = [
    ...(proposal.replacements ?? []).map((edit) =>
      locateReplacement(edit, blockIds, visible),
    ),
    ...(proposal.insertions ?? []).map((edit) =>
      locateInsertion(edit, blockIds, visible),
    ),
  ];
  const edits = located
    .filter((entry) => typeof entry !== "string")
    .sort((left, right) => left.from - right.from || left.to - right.to);
  return {
    edits,
    problems: [
      ...located.filter((entry) => typeof entry === "string"),
      ...findOverlaps(edits),
    ],
  };
}

function locateReplacement(
  edit: NoteReplacement,
  blockIds: readonly string[],
  visible: ReadonlySet<string>,
): LocatedNoteEdit | string {
  const label = `replacement ${edit.firstBlockId}:${edit.lastBlockId}`;
  const from = blockIds.indexOf(edit.firstBlockId);
  const last = blockIds.indexOf(edit.lastBlockId);
  if (
    from < 0 ||
    last < from ||
    blockIds.slice(from, last + 1).some((id) => !visible.has(id))
  )
    return `Invalid ${label}; expected contiguous visible blocks, first not after last`;
  return { kind: "replacement", from, to: last + 1, html: edit.html, label };
}

function locateInsertion(
  edit: NoteInsertion,
  blockIds: readonly string[],
  visible: ReadonlySet<string>,
): LocatedNoteEdit | string {
  const label = `insertion ${edit.side} ${edit.anchorBlockId ?? "no anchor"}`;
  if (edit.anchorBlockId === undefined) {
    if (blockIds.length === 0)
      return { kind: "insertion", from: 0, to: 0, html: edit.html, label };
    return "Insertion without anchorBlockId; expected the visible block id to insert beside";
  }
  const anchor = blockIds.indexOf(edit.anchorBlockId);
  if (anchor < 0 || !visible.has(edit.anchorBlockId))
    return `Invalid ${label}; expected a visible anchor block`;
  const from = anchor + (edit.side === "after" ? 1 : 0);
  return { kind: "insertion", from, to: from, html: edit.html, label };
}

// An insertion may sit right before a replacement starting at the same block;
// two insertions at one position have no defined order.
function findOverlaps(sorted: LocatedNoteEdit[]): string[] {
  return sorted.slice(1).flatMap((current, index) => {
    const previous = sorted[index];
    const samePosition =
      current.from === previous.from && current.to === previous.to;
    if (current.from >= previous.to && !samePosition) return [];
    return [
      `${current.label} overlaps ${previous.label}; expected disjoint edits, combined into one edit where they touch`,
    ];
  });
}
