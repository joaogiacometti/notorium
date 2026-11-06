import type { JSONContent } from "@tiptap/core";
import { isAllowedUri } from "@tiptap/extension-link";
import type { RichTextDocument } from "@/lib/editor/document";
import { documentFromMarkdown } from "@/lib/editor/document-markdown";
import { normalizeOverEscapedLatex } from "@/lib/math/dollar-math";

// Images come only from draft placeholders and note links only from the
// editor, so neither is accepted from model text.
const MODEL_DROPPED_NODES = new Set(["image", "noteLink"]);

/**
 * Model-written Markdown as a document. LaTeX is repaired before parsing
 * because JSON-decoded control characters would otherwise end math early.
 *
 * @example
 * modelMarkdownToDocument("- Limit:\n  $$\\lim_{h\\to 0} f(h)$$\n- Next");
 */
export function modelMarkdownToDocument(markdown: string): RichTextDocument {
  const parsed = documentFromMarkdown(normalizeOverEscapedLatex(markdown));
  return { ...parsed, content: sanitizeNodes(parsed.content) };
}

function sanitizeNodes(nodes: JSONContent[]): JSONContent[] {
  const kept = nodes
    .filter((node) => !MODEL_DROPPED_NODES.has(node.type ?? ""))
    .map((node) => {
      const result: JSONContent = { ...node };
      if (node.type === "heading")
        result.attrs = {
          ...node.attrs,
          level: Math.min(node.attrs?.level ?? 1, 3),
        };
      if (node.marks)
        result.marks = node.marks.filter(
          (mark) =>
            mark.type !== "link" ||
            (typeof mark.attrs?.href === "string" &&
              isAllowedUri(mark.attrs.href)),
        );
      if (node.content) result.content = sanitizeNodes(node.content);
      return result;
    });
  // A container left without its only image block still needs a block.
  return kept.length || !nodes.some((node) => node.type === "image")
    ? kept
    : [{ type: "paragraph" }];
}
