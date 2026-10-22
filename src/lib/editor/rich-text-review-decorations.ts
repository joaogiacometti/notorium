import { Extension } from "@tiptap/core";
import {
  DOMSerializer,
  Fragment,
  type Node as ProseMirrorNode,
} from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { parseReviewedRichText } from "@/lib/editor/rich-text-review-schema";
import { MATH_NODE_SELECTOR, readMathNode } from "@/lib/math/math-nodes";

/** Highlight a structural replacement without inserting review markup into HTML.
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
  const start = original.content.findDiffStart(proposed.content);
  const end = original.content.findDiffEnd(proposed.content);
  if (start === null || !end) return [];
  const from = Math.min(start, end.a, end.b);
  const decorations: Decoration[] = [];
  if (end.b > from)
    decorations.push(
      Decoration.inline(from + offset, end.b + offset, {
        class: "bg-(--intent-success-bg) text-(--intent-success-text)",
      }),
    );
  if (end.a > from)
    decorations.push(deletedContentDecoration(original, from, end.a, offset));
  proposed.nodesBetween(from, end.b, (node, pos) => {
    if (!node.isText && pos >= from && pos + node.nodeSize <= end.b) {
      decorations.push(
        Decoration.node(pos + offset, pos + node.nodeSize + offset, {
          class: "bg-(--intent-success-bg) text-(--intent-success-text)",
        }),
      );
    }
  });
  return decorations;
}

function deletedContentDecoration(
  original: ProseMirrorNode,
  from: number,
  to: number,
  offset: number,
): Decoration {
  return Decoration.widget(
    from + offset,
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
  original: string;
  replacement: string;
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

function reviewFragment(html: string): ProseMirrorNode {
  const parsed = parseReviewedRichText(html);
  return html ? parsed : parsed.copy(Fragment.empty);
}
