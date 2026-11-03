import type { JSONContent } from "@tiptap/core";
import { restoreDraftReplacement } from "@/components/assistant/flashcard-draft-content";
import type {
  NoteDraft,
  NoteEditsInput,
} from "@/features/assistant/document-edit-contract";
import { locateNoteEdits } from "@/features/assistant/note-edit-ranges";
import { STUDY_CONTEXT_MAX_CHARS } from "@/features/assistant/study-context";
import { draftHtmlForAssistant } from "@/features/assistant/utils";
import { editNoteSchema } from "@/features/notes/validation";
import {
  documentFromJSON,
  documentNodes,
  documentSchema,
  emptyDocument,
  type RichTextDocument,
} from "@/lib/editor/document";
import type { RichTextReviewSegment } from "@/lib/editor/rich-text-review-decorations";

export interface NoteBlock {
  id: string;
  node: JSONContent;
}
export interface PreparedNoteEdit {
  title: string;
  content: RichTextDocument;
  segments: RichTextReviewSegment[];
}
function fragment(content: JSONContent[]): RichTextDocument {
  return documentFromJSON({ type: "doc", content });
}

export function splitNoteBlocks(content: RichTextDocument): NoteBlock[] {
  if (
    content.content.length === 1 &&
    content.content[0].type === "paragraph" &&
    !content.content[0].content?.length
  )
    return [];
  return content.content.map((node, index) => ({ id: `b${index}`, node }));
}

/** HTML is exported only for the model request; the captured draft stays native. */
export function buildNoteDraft(
  sessionId: string,
  revision: number,
  title: string,
  content: RichTextDocument,
  selected: number[] = [],
): NoteDraft {
  const all = splitNoteBlocks(content);
  const priority = [...new Set([...selected, ...all.map((_, index) => index)])];
  const included = new Map<string, { id: string; html: string }>();
  for (const index of priority) {
    const block = all[index];
    if (!block) continue;
    const safe = {
      id: block.id,
      html: draftHtmlForAssistant(fragment([block.node])).replaceAll(
        /\{\{IMAGE_(\d+)\}\}/g,
        `{{NOTE_IMAGE_${block.id}_$1}}`,
      ),
    };
    if (
      JSON.stringify([...included.values(), safe]).length <=
      STUDY_CONTEXT_MAX_CHARS
    )
      included.set(block.id, safe);
  }
  return {
    kind: "note",
    sessionId,
    revision,
    title,
    blocks: all.flatMap((block) => included.get(block.id) ?? []),
    partial: included.size !== all.length,
  };
}

export function prepareNoteEdits(
  draft: NoteDraft,
  content: RichTextDocument,
  proposal: NoteEditsInput,
): PreparedNoteEdit {
  const blocks = splitNoteBlocks(content);
  const { edits, problems } = locateNoteEdits(
    blocks.map((block) => block.id),
    new Set(draft.blocks.map((block) => block.id)),
    proposal,
  );
  if (problems.length) throw new Error(problems.join("; "));
  const pieces: JSONContent[] = [];
  const segments: RichTextReviewSegment[] = [];
  let cursor = 0;
  for (const edit of edits) {
    pieces.push(...blocks.slice(cursor, edit.from).map((block) => block.node));
    const range = blocks.slice(edit.from, edit.to);
    const original = fragment(range.map((block) => block.node));
    if (/<img\b/i.test(edit.html) || /\/api\/attachments\//i.test(edit.html))
      throw new Error(
        "Invalid replacement attachment reference; expected original image placeholders",
      );
    let offset = 0;
    let html = edit.html;
    if (/\{\{IMAGE_/.test(html))
      throw new Error(
        "Invalid image placeholder; expected a note block image reference",
      );
    for (const block of range) {
      const images = documentNodes(fragment([block.node])).filter(
        (node) => node.type === "image",
      );
      images.forEach((_, index) => {
        html = html.replaceAll(
          `{{NOTE_IMAGE_${block.id}_${index}}}`,
          `{{IMAGE_${offset + index}}}`,
        );
      });
      offset += images.length;
    }
    if (/\{\{NOTE_IMAGE_/.test(html))
      throw new Error(
        "Invalid image placeholder; expected an image from the edited range",
      );
    const replacement = html
      ? restoreDraftReplacement(html, original)
      : fragment([]);
    const position = documentSchema().nodeFromJSON(fragment(pieces)).content
      .size;
    segments.push({ original, replacement, offset: position });
    pieces.push(...replacement.content);
    cursor = edit.to;
  }
  pieces.push(...blocks.slice(cursor).map((block) => block.node));
  const result = editNoteSchema.parse({
    id: "draft",
    title: proposal.title ?? draft.title,
    content: fragment(pieces.length ? pieces : emptyDocument().content),
  });
  return {
    title: result.title,
    content: result.content ?? emptyDocument(),
    segments,
  };
}
