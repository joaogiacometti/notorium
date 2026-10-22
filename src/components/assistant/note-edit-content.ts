import { restoreDraftReplacement } from "@/components/assistant/flashcard-draft-content";
import type {
  NoteDraft,
  NoteEditsInput,
} from "@/features/assistant/document-edit-contract";
import { STUDY_CONTEXT_MAX_CHARS } from "@/features/assistant/study-context";
import { editNoteSchema } from "@/features/notes/validation";
import { replaceImagesWithPlaceholders } from "@/lib/editor/rich-text";
import type { RichTextReviewSegment } from "@/lib/editor/rich-text-review-decorations";
import { parseReviewedRichText } from "@/lib/editor/rich-text-review-schema";

export interface NoteBlock {
  id: string;
  html: string;
}
export interface PreparedNoteEdit {
  title: string;
  content: string;
  segments: RichTextReviewSegment[];
}

/** Split stored content at editor block boundaries without persisting identifiers.
 * @example const blocks = splitNoteBlocks("<p>First</p><p>Second</p>");
 */
export function splitNoteBlocks(content: string): NoteBlock[] {
  const template = document.createElement("template");
  template.innerHTML = content;
  return Array.from(template.content.childNodes).map((node, index) => ({
    id: `b${index}`,
    html: node instanceof Element ? node.outerHTML : (node.textContent ?? ""),
  }));
}

/** Prefer selected blocks, then include complete blocks within the context budget.
 * @example buildNoteDraft("s", 0, "Title", "<p>Text</p>", [0]);
 */
export function buildNoteDraft(
  sessionId: string,
  revision: number,
  title: string,
  content: string,
  selected: number[] = [],
): NoteDraft {
  const all = splitNoteBlocks(content);
  const priority = [...new Set([...selected, ...all.map((_, index) => index)])];
  const included = new Map<string, NoteBlock>();
  for (const index of priority) {
    const block = all[index];
    if (!block) continue;
    const safe = {
      ...block,
      html: replaceImagesWithPlaceholders(block.html).text.replaceAll(
        /\{\{IMAGE_(\d+)\}\}/g,
        `{{NOTE_IMAGE_${block.id}_$1}}`,
      ),
    };
    if (
      JSON.stringify([...included.values(), safe]).length >
      STUDY_CONTEXT_MAX_CHARS
    )
      continue;
    included.set(block.id, safe);
  }
  return {
    kind: "note",
    sessionId,
    revision,
    title,
    // Document order, not priority order.
    blocks: all.flatMap((block) => included.get(block.id) ?? []),
    partial: included.size !== all.length,
  };
}

/** Prepare one atomic note update, preserving blocks outside explicit edit ranges.
 * @example prepareNoteEdits(draft, content, proposal);
 */
export function prepareNoteEdits(
  draft: NoteDraft,
  content: string,
  proposal: NoteEditsInput,
): PreparedNoteEdit {
  const blocks = splitNoteBlocks(content);
  const visible = new Set(draft.blocks.map((block) => block.id));
  const replacements = [
    ...(proposal.replacements ?? []).map((edit) =>
      resolveNoteReplacement(edit, blocks, visible),
    ),
    ...(proposal.insertions ?? []).map((edit) =>
      resolveNoteInsertion(edit, blocks, visible),
    ),
  ];
  const sorted = replacements.sort(
    (left, right) => left.from - right.from || left.to - right.to,
  );
  assertDisjointNoteEdits(sorted);
  let cursor = 0;
  const pieces: string[] = [];
  for (const edit of sorted) {
    pieces.push(
      ...blocks.slice(cursor, edit.from).map((block) => block.html),
      edit.html,
    );
    cursor = edit.to;
  }
  pieces.push(...blocks.slice(cursor).map((block) => block.html));
  const result = editNoteSchema.parse({
    id: "draft",
    title: proposal.title ?? draft.title,
    content: pieces.join(""),
  });
  return {
    title: result.title,
    content: result.content ?? "",
    segments: buildNoteReviewSegments(blocks, sorted),
  };
}

interface ResolvedNoteEdit {
  from: number;
  to: number;
  html: string;
}
function resolveNoteReplacement(
  edit: NonNullable<NoteEditsInput["replacements"]>[number],
  blocks: NoteBlock[],
  visible: Set<string>,
): ResolvedNoteEdit {
  const from = blocks.findIndex((block) => block.id === edit.firstBlockId);
  const last = blocks.findIndex((block) => block.id === edit.lastBlockId);
  if (
    from < 0 ||
    last < from ||
    blocks.slice(from, last + 1).some((block) => !visible.has(block.id))
  )
    throw new Error(
      `Invalid block range ${edit.firstBlockId}:${edit.lastBlockId}; expected contiguous visible blocks`,
    );
  const original = blocks
    .slice(from, last + 1)
    .map((block) => block.html)
    .join("");
  return {
    from,
    to: last + 1,
    html: safeNoteReplacement(
      remapNoteImages(edit.html, blocks.slice(from, last + 1)),
      original,
    ),
  };
}

function resolveNoteInsertion(
  edit: NonNullable<NoteEditsInput["insertions"]>[number],
  blocks: NoteBlock[],
  visible: Set<string>,
): ResolvedNoteEdit {
  if (edit.anchorBlockId === undefined && blocks.length === 0)
    return { from: 0, to: 0, html: safeNoteReplacement(edit.html, "") };
  const anchor = blocks.findIndex((block) => block.id === edit.anchorBlockId);
  if (anchor < 0 || !visible.has(edit.anchorBlockId ?? ""))
    throw new Error(
      `Invalid insertion anchor ${edit.anchorBlockId}; expected a visible block`,
    );
  const from = anchor + (edit.side === "after" ? 1 : 0);
  return { from, to: from, html: safeNoteReplacement(edit.html, "") };
}

function safeNoteReplacement(html: string, original: string): string {
  if (/<img\b/i.test(html) || /\/api\/attachments\//i.test(html))
    throw new Error(
      "Invalid replacement attachment reference; expected original image placeholders",
    );
  if (!html) return "";
  return restoreDraftReplacement(html, original);
}

function assertDisjointNoteEdits(edits: ResolvedNoteEdit[]): void {
  for (let index = 1; index < edits.length; index += 1) {
    const previous = edits[index - 1];
    const current = edits[index];
    if (current.from < previous.to || current.from === previous.from)
      throw new Error(
        `Overlapping block edits at ${current.from}; expected disjoint ranges`,
      );
  }
}

function remapNoteImages(html: string, blocks: NoteBlock[]): string {
  if (/\{\{IMAGE_/.test(html))
    throw new Error(
      "Invalid image placeholder; expected a note block image reference",
    );
  let offset = 0;
  let result = html;
  for (const block of blocks) {
    const { images } = replaceImagesWithPlaceholders(block.html);
    images.forEach((_, index) => {
      const placeholder = `{{NOTE_IMAGE_${block.id}_${index}}}`;
      if (result.split(placeholder).length > 2)
        throw new Error(
          `Duplicate image placeholder ${placeholder}; expected at most one reference`,
        );
      result = result.replaceAll(
        `{{NOTE_IMAGE_${block.id}_${index}}}`,
        `{{IMAGE_${offset + index}}}`,
      );
    });
    offset += images.length;
  }
  if (/\{\{NOTE_IMAGE_/.test(result))
    throw new Error(
      "Invalid image placeholder; expected an image from the edited range",
    );
  return result;
}

function noteFragmentSize(html: string): number {
  return html ? parseReviewedRichText(html).content.size : 0;
}

function buildNoteReviewSegments(
  blocks: NoteBlock[],
  edits: ResolvedNoteEdit[],
): RichTextReviewSegment[] {
  let delta = 0;
  return edits.map((edit) => {
    const original = blocks
      .slice(edit.from, edit.to)
      .map((block) => block.html)
      .join("");
    const prefix = blocks
      .slice(0, edit.from)
      .map((block) => block.html)
      .join("");
    const offset = noteFragmentSize(prefix) + delta;
    delta += noteFragmentSize(edit.html) - noteFragmentSize(original);
    return { original, replacement: edit.html, offset };
  });
}
