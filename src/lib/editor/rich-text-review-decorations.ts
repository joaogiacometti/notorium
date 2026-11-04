import { Extension } from "@tiptap/core";
import { DOMSerializer, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { RichTextDocument } from "@/lib/editor/document";
import { documentToNode } from "@/lib/editor/document";
import { computeReviewDiff } from "@/lib/editor/rich-text-review-diff";
import { MATH_NODE_SELECTOR, readMathNode } from "@/lib/math/math-nodes";

const ADDED_CLASS = "bg-(--intent-success-bg) text-(--intent-success-text)";

/** Highlight each changed range without inserting review markup into HTML.
 * @example buildReviewDecorations(original, proposed);
 */
export function buildReviewDecorations(
  original: ProseMirrorNode,
  proposed: ProseMirrorNode,
): DecorationSet {
  return DecorationSet.create(
    proposed,
    collectReviewDecorations(original, proposed, 0),
  );
}

function collectReviewDecorations(
  original: ProseMirrorNode,
  proposed: ProseMirrorNode,
  offset: number,
): Decoration[] {
  const { hunks, changedNodes } = computeReviewDiff(original, proposed);
  return [
    ...changedNodes.map(({ pos, node }) =>
      addedNodeDecoration(pos, node, offset),
    ),
    ...hunks.flatMap(({ fromA, toA, fromB, toB }) => [
      ...addedContentDecorations(proposed, fromB, toB, offset),
      ...(toA > fromA
        ? [deletedContentDecoration(original, fromA, toA, fromB, offset)]
        : []),
    ]),
  ];
}

function addedContentDecorations(
  proposed: ProseMirrorNode,
  from: number,
  to: number,
  offset: number,
): Decoration[] {
  if (to <= from) return [];
  const decorations = [
    Decoration.inline(from + offset, to + offset, { class: ADDED_CLASS }),
  ];
  proposed.nodesBetween(from, to, (node, pos) => {
    if (!node.isText && pos >= from && pos + node.nodeSize <= to) {
      decorations.push(addedNodeDecoration(pos, node, offset));
    }
  });
  return decorations;
}

function addedNodeDecoration(
  pos: number,
  node: ProseMirrorNode,
  offset: number,
) {
  return Decoration.node(pos + offset, pos + node.nodeSize + offset, {
    class: ADDED_CLASS,
  });
}

function deletedContentDecoration(
  original: ProseMirrorNode,
  from: number,
  to: number,
  position: number,
  offset: number,
): Decoration {
  return Decoration.widget(
    position + offset,
    () => {
      const deleted = document.createElement("span");
      deleted.className =
        "bg-(--intent-danger-bg) text-(--intent-danger-text) line-through";
      deleted.setAttribute("aria-label", "Removed content");
      deleted.append(
        DOMSerializer.fromSchema(original.type.schema).serializeFragment(
          original.slice(from, to).content,
        ),
      );
      for (const math of deleted.querySelectorAll(MATH_NODE_SELECTOR)) {
        math.textContent = readMathNode(math).latex;
      }
      return deleted;
    },
    { side: -1 },
  );
}

/** Read-only decorations computed against the original document.
 * @example buildRichTextReviewExtension(original);
 */
export function buildRichTextReviewExtension(
  original: ProseMirrorNode,
  segments?: RichTextReviewSegment[],
) {
  return Extension.create({
    name: "flashcardReview",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            decorations: (state) =>
              segments
                ? buildDocumentReviewDecorations(segments, state.doc)
                : buildReviewDecorations(original, state.doc),
          },
        }),
      ];
    },
  });
}

export interface RichTextReviewSegment {
  original: RichTextDocument;
  replacement: RichTextDocument;
  offset: number;
}

/** Decorate explicit note edit ranges without marking intervening content as changed.
 * @example buildDocumentReviewDecorations(segments, proposedDocument);
 */
export function buildDocumentReviewDecorations(
  segments: RichTextReviewSegment[],
  proposed: ProseMirrorNode,
): DecorationSet {
  const decorations = segments.flatMap((segment) =>
    collectReviewDecorations(
      reviewFragment(segment.original),
      reviewFragment(segment.replacement),
      segment.offset,
    ),
  );
  return DecorationSet.create(proposed, decorations);
}

function reviewFragment(value: RichTextDocument): ProseMirrorNode {
  return documentToNode(value);
}
