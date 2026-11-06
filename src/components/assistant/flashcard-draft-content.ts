import type { JSONContent } from "@tiptap/core";
import { modelMarkdownToDocument } from "@/lib/ai/model-markdown";
import {
  documentFromJSON,
  documentNodes,
  type RichTextDocument,
  richTextDocumentSchema,
} from "@/lib/editor/document";

/** Import untrusted assistant Markdown once; original images remain native nodes. */
export function restoreDraftReplacement(
  replacement: string,
  original: RichTextDocument,
): RichTextDocument {
  const images = documentNodes(original).filter(
    (node) => node.type === "image",
  );
  const used = new Set<number>();
  function restore(node: JSONContent): JSONContent[] {
    if (node.type === "text") {
      const parts: JSONContent[] = [];
      let cursor = 0;
      for (const match of (node.text ?? "").matchAll(/\{\{IMAGE_(\d+)\}\}/g)) {
        if (match.index > cursor)
          parts.push({ ...node, text: node.text?.slice(cursor, match.index) });
        const index = Number(match[1]);
        if (!images[index] || used.has(index))
          throw new Error("Invalid or duplicate image placeholder");
        parts.push(images[index]);
        used.add(index);
        cursor = match.index + match[0].length;
      }
      if (cursor < (node.text?.length ?? 0))
        parts.push({ ...node, text: node.text?.slice(cursor) });
      return parts;
    }
    if (!node.content) return [node];
    const children = node.content.flatMap(restore);
    if (node.type !== "paragraph") return [{ ...node, content: children }];
    // Images are blocks, so a placeholder splits its paragraph.
    const result: JSONContent[] = [];
    let inline: JSONContent[] = [];
    for (const child of children) {
      if (child.type === "image") {
        if (inline.some(hasText))
          result.push({ type: "paragraph", content: inline });
        inline = [];
        result.push(child);
      } else inline.push(child);
    }
    if (inline.some(hasText) || !result.length)
      result.push({ type: "paragraph", content: inline });
    return result;
  }
  const content = modelMarkdownToDocument(replacement).content.flatMap(restore);
  content.push(...images.filter((_, index) => !used.has(index)));
  return richTextDocumentSchema.parse(
    documentFromJSON({ type: "doc", content }),
  );
}

function hasText(node: JSONContent): boolean {
  return node.type !== "text" || Boolean(node.text?.trim());
}
