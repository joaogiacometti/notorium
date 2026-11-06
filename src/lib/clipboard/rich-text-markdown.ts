import type { JSONContent } from "@tiptap/core";
import type { RichTextDocument } from "@/lib/editor/document";
import { documentToMarkdown } from "@/lib/editor/document-markdown";

/** Export as Markdown; attachment URLs never leave the app.
 * @example richTextToMarkdown(card.back); // "- ATP stores energy"
 */
export function richTextToMarkdown(document: RichTextDocument): string {
  function redact(node: JSONContent): JSONContent {
    if (node.type === "image" && !/^https?:\/\//i.test(node.attrs?.src ?? ""))
      return {
        type: "paragraph",
        content: [{ type: "text", text: "(image)" }],
      };
    return node.content ? { ...node, content: node.content.map(redact) } : node;
  }
  return documentToMarkdown({
    ...document,
    content: document.content.map(redact),
  });
}
