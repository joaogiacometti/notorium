"use client";

import DOMPurify from "dompurify";
import { canWriteClipboardItems } from "@/lib/clipboard/clipboard-writer";
import {
  MATH_NODE_SELECTOR,
  mathNodeToDelimitedLatex,
} from "@/lib/math/math-nodes";

export type NoteCopyFormat = "plain" | "rich";

/**
 * Copies note content to the clipboard in the requested format.
 *
 * @example
 * await copyNoteContentToClipboard("<p>Cell biology</p>", "rich");
 */
export async function copyNoteContentToClipboard(
  html: string,
  format: NoteCopyFormat,
) {
  const sanitizedHtml = sanitizeRichHtmlForClipboard(html);
  const plainText = getPlainTextFromHtml(sanitizedHtml);

  if (format === "plain" || !canWriteClipboardItems()) {
    await navigator.clipboard.writeText(plainText);
    return;
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([sanitizedHtml], { type: "text/html" }),
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

function getPlainTextFromHtml(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;

  // Math nodes serialize as empty elements with the LaTeX in data-latex, so
  // textContent would drop equations. Surface them as round-trippable $...$.
  for (const element of container.querySelectorAll(MATH_NODE_SELECTOR))
    element.replaceWith(
      document.createTextNode(mathNodeToDelimitedLatex(element)),
    );

  container.querySelectorAll("br").forEach((br) => {
    br.replaceWith(document.createTextNode("\n"));
  });
  container
    .querySelectorAll("blockquote,div,h1,h2,h3,h4,h5,h6,li,p,pre")
    .forEach((el) => {
      el.after(document.createTextNode("\n"));
    });

  return (container.textContent ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
