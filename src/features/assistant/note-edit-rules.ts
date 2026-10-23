import type {
  NoteDraft,
  NoteEditsInput,
} from "@/features/assistant/document-edit-contract";
import {
  findAddedSide,
  findDraftIdentityProblems,
  findImageReferenceProblems,
  findUnknownIdProblems,
  imagePlaceholdersIn,
  isUnchangedHtml,
  repeatsMostWords,
  visibleHtmlText,
} from "@/features/assistant/edit-guards";
import {
  type LocatedNoteEdit,
  locateNoteEdits,
} from "@/features/assistant/note-edit-ranges";

// Shorter blocks (headings, labels) are too generic to call a copy.
const COPY_MIN_CHARS = 20;
// Sentences with fewer words are too generic to call a reworded copy.
const REWORDED_COPY_MIN_WORDS = 6;
const EXCERPT_CHARS = 40;

/**
 * Every rule a note proposal breaks against the draft the model was shown,
 * phrased as "<problem>; expected <shape>". Unknown ids are reported alone:
 * every other rule depends on locating the edits.
 *
 * @example
 * guardEditSchema(noteEditsInputSchema, [(input) => findNoteEditProblems(input, draft)]);
 */
export function findNoteEditProblems(
  input: NoteEditsInput,
  draft: NoteDraft,
): string[] {
  const ids = draft.blocks.map((block) => block.id);
  const unknown = findUnknownIdProblems(
    "block",
    referencedBlockIds(input),
    ids,
  );
  if (unknown.length > 0)
    return [...findDraftIdentityProblems(input, draft), ...unknown];
  const { edits, problems } = locateNoteEdits(ids, new Set(ids), input);
  return [
    ...findDraftIdentityProblems(input, draft),
    ...problems,
    ...edits.flatMap((edit) => findEditContentProblems(edit, edits, draft)),
    ...findEmptyProposalProblems(input, draft),
  ];
}

function referencedBlockIds(input: NoteEditsInput): string[] {
  return [
    ...(input.replacements ?? []).flatMap((edit) => [
      edit.firstBlockId,
      edit.lastBlockId,
    ]),
    ...(input.insertions ?? []).flatMap((edit) => edit.anchorBlockId ?? []),
  ];
}

function findEditContentProblems(
  edit: LocatedNoteEdit,
  edits: LocatedNoteEdit[],
  draft: NoteDraft,
): string[] {
  const range = draft.blocks.slice(edit.from, edit.to);
  const current = range.map((block) => block.html).join("");
  const images = findImageReferenceProblems(
    edit.html,
    imagePlaceholdersIn(current),
  );
  if (edit.kind === "insertion")
    return [...images, ...findCopiedBlocks(edit, edits, draft)];
  if (isUnchangedHtml(edit.html, current))
    return [`${edit.label} keeps the current content; expected changed HTML`];
  const side = findAddedSide(edit.html, current);
  if (!side) return images;
  const anchor = side === "after" ? range.at(-1) : range[0];
  return [
    `${edit.label} keeps its blocks and only adds content ${side} them; expected an insertion ${side} ${anchor?.id} with only the new content`,
  ];
}

// A block may reappear in an insertion only when a replacement in the same
// proposal removes or rewrites it, which is how a block moves.
function findCopiedBlocks(
  insertion: LocatedNoteEdit,
  edits: LocatedNoteEdit[],
  draft: NoteDraft,
): string[] {
  const segments = htmlBlockTexts(insertion.html);
  return draft.blocks.flatMap((block, index) => {
    const text = visibleHtmlText(block.html);
    const replaced = edits.some(
      (edit) =>
        edit.kind === "replacement" && edit.from <= index && index < edit.to,
    );
    if (replaced || !segments.some((segment) => repeatsText(text, segment)))
      return [];
    return [
      `${insertion.label} repeats existing text "${text.slice(0, EXCERPT_CHARS)}" of block ${block.id}; expected only new content, or replace ${block.id} to move or reword it. Block ids are internal; describe blocks by their content in chat`,
    ];
  });
}

// Equations are restated on purpose (a formula placed where it is used), so
// only prose counts as a copy; math is the dollar-delimited text in drafts.
function repeatsText(existing: string, inserted: string): boolean {
  if (existing.replaceAll(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g, "").trim() === "")
    return false;
  if (existing.length >= COPY_MIN_CHARS && inserted.includes(existing))
    return true;
  // Either direction: a reworded copy may add words or drop some.
  return (
    repeatsMostWords(existing, inserted, REWORDED_COPY_MIN_WORDS) ||
    repeatsMostWords(inserted, existing, REWORDED_COPY_MIN_WORDS)
  );
}

// Each inserted block is compared on its own, so a long insertion does not
// count as a copy merely by covering many words.
function htmlBlockTexts(html: string): string[] {
  return html
    .split(/<\/(?:p|h[1-6]|li|pre|blockquote|td|th)>/i)
    .map(visibleHtmlText)
    .filter(Boolean);
}

function findEmptyProposalProblems(
  input: NoteEditsInput,
  draft: NoteDraft,
): string[] {
  const edits =
    (input.replacements?.length ?? 0) + (input.insertions?.length ?? 0);
  if (edits > 0 || (input.title !== undefined && input.title !== draft.title))
    return [];
  return [
    "Proposal changes nothing; expected a replacement, insertion, or new title",
  ];
}
