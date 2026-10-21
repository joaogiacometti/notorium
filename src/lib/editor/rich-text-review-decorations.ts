import { Extension } from "@tiptap/core";
import { DOMSerializer, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/** Highlight a structural replacement without inserting review markup into HTML.
 * @example buildReviewDecorations(original, proposed);
 */
export function buildReviewDecorations(
  original: ProseMirrorNode,
  proposed: ProseMirrorNode,
): DecorationSet {
  const start = original.content.findDiffStart(proposed.content);
  const end = original.content.findDiffEnd(proposed.content);
  if (start === null || !end) return DecorationSet.empty;
  const from = Math.min(start, end.a, end.b);
  const decorations: Decoration[] = [];
  if (end.b > from)
    decorations.push(
      Decoration.inline(from, end.b, {
        class: "bg-(--intent-success-bg) text-(--intent-success-text)",
      }),
    );
  if (end.a > from)
    decorations.push(deletedContentDecoration(original, from, end.a));
  proposed.nodesBetween(from, end.b, (node, pos) => {
    if (!node.isText && pos >= from && pos + node.nodeSize <= end.b) {
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          class: "bg-(--intent-success-bg) text-(--intent-success-text)",
        }),
      );
    }
  });
  return DecorationSet.create(proposed, decorations);
}

function deletedContentDecoration(
  original: ProseMirrorNode,
  from: number,
  to: number,
): Decoration {
  return Decoration.widget(
    from,
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
      for (const math of deleted.querySelectorAll("[data-latex]")) {
        math.textContent = math.getAttribute("data-latex");
      }
      return deleted;
    },
    { side: -1 },
  );
}

/** Read-only decorations computed against the original document.
 * @example buildRichTextReviewExtension(original);
 */
export function buildRichTextReviewExtension(original: ProseMirrorNode) {
  return Extension.create({
    name: "flashcardReview",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            decorations: (state) => buildReviewDecorations(original, state.doc),
          },
        }),
      ];
    },
  });
}
