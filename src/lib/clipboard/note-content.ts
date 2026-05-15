"use client";

import DOMPurify from "dompurify";

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

  if (format === "plain" || !canCopyRichText()) {
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

function canCopyRichText() {
  return (
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function"
  );
}

function sanitizeRichHtmlForClipboard(html: string): string {
  return DOMPurify.sanitize(html);
}

function getPlainTextFromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("br").forEach((br) => {
    br.replaceWith(doc.createTextNode("\n"));
  });
  doc
    .querySelectorAll("blockquote,div,h1,h2,h3,h4,h5,h6,li,p,pre")
    .forEach((el) => {
      el.after(doc.createTextNode("\n"));
    });

  return (doc.body.textContent ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
