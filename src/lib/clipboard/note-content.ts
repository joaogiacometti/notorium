"use client";

import type { JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";
import { canWriteClipboardItems } from "@/lib/clipboard/clipboard-writer";
import type { RichTextDocument } from "@/lib/editor/document";
import { documentToHtml } from "@/lib/editor/document-html";
export type NoteCopyFormat = "plain" | "rich";

/**
 * Copies note content to the clipboard in the requested format.
 *
 * @example
 * await copyNoteContentToClipboard(document, "rich");
 */
export async function copyNoteContentToClipboard(
  content: RichTextDocument,
  format: NoteCopyFormat,
) {
  const plainText = clipboardText(content);

  if (format === "plain" || !canWriteClipboardItems()) {
    await navigator.clipboard.writeText(plainText);
    return;
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob(
        [sanitizeRichHtmlForClipboard(documentToHtml(content))],
        { type: "text/html" },
      ),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    }),
  ]);
}

function sanitizeRichHtmlForClipboard(html: string): string {
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
  const container = document.createElement("div");
  container.append(fragment);
  return container.innerHTML;
}

function clipboardText(value: RichTextDocument): string {
  function text(node: JSONContent): string {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "noteLink") return node.attrs?.label ?? "";
    if (node.type === "inlineMath") return `$${node.attrs?.latex ?? ""}$`;
    if (node.type === "blockMath") return `$$${node.attrs?.latex ?? ""}$$\n`;
    if (node.type === "hardBreak") return "\n";
    const result = (node.content ?? []).map(text).join("");
    return [
      "paragraph",
      "heading",
      "listItem",
      "taskItem",
      "codeBlock",
      "blockquote",
    ].includes(node.type ?? "")
      ? `${result}\n`
      : result;
  }
  return value.content
    .map(text)
    .join("")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
